"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAdminPaymentUpdated = exports.emitAdminBookingUpdated = exports.emitJobCancelled = exports.emitJobCompleted = exports.emitJobStarted = exports.emitJobUpdated = exports.emitBookingConfirmed = exports.emitBookingUpdated = exports.emitJobAssigned = exports.getIO = exports.initSocket = void 0;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const redis_1 = require("./redis");
const jwt_util_1 = require("../utils/jwt.util");
let io = null;
let userNamespace = null;
let partnerNamespace = null;
let adminNamespace = null;
const USER_NAMESPACE = '/user';
const PARTNER_NAMESPACE = '/partner';
const ADMIN_NAMESPACE = '/admin';
const userRoom = (userId) => `user:${userId}`;
const partnerRoom = (partnerId) => `partner:${partnerId}`;
const bookingRoom = (bookingId) => `booking:${bookingId}`;
const authenticateSocket = async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token)
        return next(new Error('Unauthorized'));
    try {
        const payload = (0, jwt_util_1.verifyToken)(token);
        const authData = {
            userId: payload.userId,
            role: payload.role,
        };
        if (payload.role === 'PARTNER') {
            const partner = await prisma_1.prisma.partnerProfile.findUnique({
                where: { userId: payload.userId },
                select: { id: true },
            });
            if (!partner)
                return next(new Error('Partner profile not found'));
            authData.partnerProfileId = partner.id;
        }
        socket.data.auth = authData;
        next();
    }
    catch {
        next(new Error('Unauthorized'));
    }
};
const getAuth = (socket) => socket.data.auth;
const attachCommonHandlers = (namespace) => {
    namespace.use(authenticateSocket);
};
const initUserNamespace = (namespace) => {
    namespace.on('connection', (socket) => {
        const auth = getAuth(socket);
        socket.join(userRoom(auth.userId));
        console.log(`[Socket:user] ${auth.userId} -> ${socket.id}`);
        socket.on('join_booking', (bookingId) => {
            socket.join(bookingRoom(bookingId));
        });
    });
};
const initPartnerNamespace = (namespace) => {
    namespace.on('connection', (socket) => {
        const auth = getAuth(socket);
        if (auth.role !== 'PARTNER' || !auth.partnerProfileId) {
            socket.emit('socket_error', { message: 'Partner access required' });
            socket.disconnect(true);
            return;
        }
        socket.join(userRoom(auth.userId));
        socket.join(partnerRoom(auth.partnerProfileId));
        void (0, redis_1.markPartnerOnline)(auth.partnerProfileId);
        console.log(`[Socket:partner] ${auth.partnerProfileId} -> ${socket.id}`);
        socket.on('register_partner', (partnerProfileId) => {
            if (partnerProfileId !== auth.partnerProfileId) {
                socket.emit('socket_error', { message: 'Invalid partner registration' });
                return;
            }
            socket.join(partnerRoom(auth.partnerProfileId));
        });
        socket.on('join_booking', (bookingId) => {
            socket.join(bookingRoom(bookingId));
        });
        socket.on('partner_location_update', async (data) => {
            if (data.partnerProfileId && data.partnerProfileId !== auth.partnerProfileId)
                return;
            await (0, redis_1.storePartnerLocation)(auth.partnerProfileId, data.lat, data.lng);
            adminNamespace?.to('admin:locations').emit('partner_location', {
                partnerProfileId: auth.partnerProfileId,
                lat: data.lat,
                lng: data.lng,
            });
        });
        socket.on('disconnect', () => {
            void (0, redis_1.markPartnerOffline)(auth.partnerProfileId);
            console.log(`[Socket:partner] disconnected ${auth.partnerProfileId}`);
        });
    });
};
const initAdminNamespace = (namespace) => {
    namespace.on('connection', (socket) => {
        const auth = getAuth(socket);
        if (auth.role !== 'ADMIN') {
            socket.emit('socket_error', { message: 'Admin access required' });
            socket.disconnect(true);
            return;
        }
        socket.join('admin:locations');
        console.log(`[Socket:admin] ${auth.userId} -> ${socket.id}`);
    });
};
const initSocket = async (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    const redisReady = await (0, redis_1.connectRedis)();
    if (redisReady && redis_1.pubClient && redis_1.subClient) {
        io.adapter((0, redis_adapter_1.createAdapter)(redis_1.pubClient, redis_1.subClient));
        console.log('[Socket] Redis adapter enabled for distributed events');
    }
    else {
        console.error('[Socket] Redis adapter disabled. Cross-instance events will not propagate.');
    }
    userNamespace = io.of(USER_NAMESPACE);
    partnerNamespace = io.of(PARTNER_NAMESPACE);
    adminNamespace = io.of(ADMIN_NAMESPACE);
    attachCommonHandlers(userNamespace);
    attachCommonHandlers(partnerNamespace);
    attachCommonHandlers(adminNamespace);
    initUserNamespace(userNamespace);
    initPartnerNamespace(partnerNamespace);
    initAdminNamespace(adminNamespace);
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
};
exports.getIO = getIO;
const emitJobAssigned = (partnerProfileId, booking) => {
    if (!partnerNamespace)
        return;
    if (!(0, redis_1.isRedisConnected)())
        console.error('[Socket] Redis unavailable during booking_assigned emit');
    partnerNamespace.to(partnerRoom(partnerProfileId)).emit('booking_assigned', booking);
    if (booking?.id)
        partnerNamespace.to(bookingRoom(booking.id)).emit('booking_assigned', booking);
    console.log(`[Socket] booking_assigned -> ${partnerRoom(partnerProfileId)}`);
};
exports.emitJobAssigned = emitJobAssigned;
const emitBookingUpdated = (userId, booking) => {
    if (!userNamespace)
        return;
    if (!(0, redis_1.isRedisConnected)())
        console.error('[Socket] Redis unavailable during booking_updated emit');
    userNamespace.to(userRoom(userId)).emit('booking_updated', booking);
    if (booking?.id)
        userNamespace.to(bookingRoom(booking.id)).emit('booking_updated', booking);
};
exports.emitBookingUpdated = emitBookingUpdated;
const emitBookingConfirmed = (userId, booking) => {
    if (!userNamespace)
        return;
    userNamespace.to(userRoom(userId)).emit('booking_confirmed', booking);
};
exports.emitBookingConfirmed = emitBookingConfirmed;
const emitJobUpdated = (partnerProfileId, booking) => {
    if (!partnerNamespace)
        return;
    if (!(0, redis_1.isRedisConnected)())
        console.error('[Socket] Redis unavailable during job_updated emit');
    partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_updated', booking);
    if (booking?.id)
        partnerNamespace.to(bookingRoom(booking.id)).emit('job_updated', booking);
};
exports.emitJobUpdated = emitJobUpdated;
const emitJobStarted = (partnerProfileId, booking) => {
    if (!partnerNamespace)
        return;
    partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_started', booking);
};
exports.emitJobStarted = emitJobStarted;
const emitJobCompleted = (partnerProfileId, booking) => {
    if (!partnerNamespace)
        return;
    partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_completed', booking);
};
exports.emitJobCompleted = emitJobCompleted;
const emitJobCancelled = (partnerProfileId, bookingId) => {
    if (!partnerNamespace)
        return;
    if (!(0, redis_1.isRedisConnected)())
        console.error('[Socket] Redis unavailable during job_cancelled emit');
    partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_cancelled', { bookingId });
    partnerNamespace.to(bookingRoom(bookingId)).emit('job_cancelled', { bookingId });
};
exports.emitJobCancelled = emitJobCancelled;
const emitAdminBookingUpdated = (booking) => {
    if (!adminNamespace)
        return;
    adminNamespace.to('admin:locations').emit('booking_updated', booking);
};
exports.emitAdminBookingUpdated = emitAdminBookingUpdated;
const emitAdminPaymentUpdated = (payment) => {
    if (!adminNamespace)
        return;
    adminNamespace.to('admin:locations').emit('payment_updated', payment);
};
exports.emitAdminPaymentUpdated = emitAdminPaymentUpdated;
