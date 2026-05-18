import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Namespace, Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './prisma';
import {
  connectRedis,
  isRedisConnected,
  markPartnerOffline,
  markPartnerOnline,
  pubClient,
  storePartnerLocation,
  subClient,
} from './redis';
import { verifyToken } from '../utils/jwt.util';
import { env } from './env';

type SocketAuthData = {
  userId: string;
  role: string;
  partnerProfileId?: string;
};

let io: SocketIOServer | null = null;
let userNamespace: Namespace | null = null;
let partnerNamespace: Namespace | null = null;
let adminNamespace: Namespace | null = null;

const USER_NAMESPACE = '/user';
const PARTNER_NAMESPACE = '/partner';
const ADMIN_NAMESPACE = '/admin';

const userRoom = (userId: string) => `user:${userId}`;
const partnerRoom = (partnerId: string) => `partner:${partnerId}`;
const bookingRoom = (bookingId: string) => `booking:${bookingId}`;

const authenticateSocket = async (socket: Socket, next: (error?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));

  try {
    const payload = verifyToken(token);
    const authData: SocketAuthData = {
      userId: payload.userId,
      role: payload.role,
    };

    if (payload.role === 'PARTNER') {
      const partner = await prisma.partnerProfile.findUnique({
        where: { userId: payload.userId },
        select: { id: true },
      });

      if (!partner) return next(new Error('Partner profile not found'));
      authData.partnerProfileId = partner.id;
    }

    socket.data.auth = authData;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
};

const getAuth = (socket: Socket): SocketAuthData => socket.data.auth;

const attachCommonHandlers = (namespace: Namespace) => {
  namespace.use(authenticateSocket);
};

const initUserNamespace = (namespace: Namespace) => {
  namespace.on('connection', (socket: Socket) => {
    const auth = getAuth(socket);

    socket.join(userRoom(auth.userId));
    console.log(`[Socket:user] ${auth.userId} -> ${socket.id}`);

    socket.on('join_booking', (bookingId: string) => {
      socket.join(bookingRoom(bookingId));
    });
  });
};

const initPartnerNamespace = (namespace: Namespace) => {
  namespace.on('connection', (socket: Socket) => {
    const auth = getAuth(socket);

    if (auth.role !== 'PARTNER' || !auth.partnerProfileId) {
      socket.emit('socket_error', { message: 'Partner access required' });
      socket.disconnect(true);
      return;
    }

    socket.join(userRoom(auth.userId));
    socket.join(partnerRoom(auth.partnerProfileId));
    void markPartnerOnline(auth.partnerProfileId);
    console.log(`[Socket:partner] ${auth.partnerProfileId} -> ${socket.id}`);

    socket.on('register_partner', (partnerProfileId: string) => {
      if (partnerProfileId !== auth.partnerProfileId) {
        socket.emit('socket_error', { message: 'Invalid partner registration' });
        return;
      }
      socket.join(partnerRoom(auth.partnerProfileId));
    });

    socket.on('join_booking', (bookingId: string) => {
      socket.join(bookingRoom(bookingId));
    });

    socket.on('partner_location_update', async (data: { partnerProfileId?: string; lat: number; lng: number }) => {
      if (data.partnerProfileId && data.partnerProfileId !== auth.partnerProfileId) return;

      await storePartnerLocation(auth.partnerProfileId!, data.lat, data.lng);
      adminNamespace?.to('admin:locations').emit('partner_location', {
        partnerProfileId: auth.partnerProfileId,
        lat: data.lat,
        lng: data.lng,
      });
    });

    socket.on('disconnect', () => {
      void markPartnerOffline(auth.partnerProfileId!);
      console.log(`[Socket:partner] disconnected ${auth.partnerProfileId}`);
    });
  });
};

const initAdminNamespace = (namespace: Namespace) => {
  namespace.on('connection', (socket: Socket) => {
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

export const initSocket = async (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.isProduction ? env.allowedOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const redisReady = await connectRedis();
  if (redisReady && pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket] Redis adapter enabled for distributed events');
  } else {
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

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

export const emitJobAssigned = (partnerProfileId: string, booking: any) => {
  if (!partnerNamespace) return;
  if (!isRedisConnected()) console.error('[Socket] Redis unavailable during booking_assigned emit');

  partnerNamespace.to(partnerRoom(partnerProfileId)).emit('booking_assigned', booking);
  if (booking?.id) partnerNamespace.to(bookingRoom(booking.id)).emit('booking_assigned', booking);
  console.log(`[Socket] booking_assigned -> ${partnerRoom(partnerProfileId)}`);
};

export const emitBookingUpdated = (userId: string, booking: any) => {
  if (!userNamespace) return;
  if (!isRedisConnected()) console.error('[Socket] Redis unavailable during booking_updated emit');

  userNamespace.to(userRoom(userId)).emit('booking_updated', booking);
  if (booking?.id) userNamespace.to(bookingRoom(booking.id)).emit('booking_updated', booking);
};

export const emitBookingConfirmed = (userId: string, booking: any) => {
  if (!userNamespace) return;
  userNamespace.to(userRoom(userId)).emit('booking_confirmed', booking);
};

export const emitJobUpdated = (partnerProfileId: string, booking: any) => {
  if (!partnerNamespace) return;
  if (!isRedisConnected()) console.error('[Socket] Redis unavailable during job_updated emit');

  partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_updated', booking);
  if (booking?.id) partnerNamespace.to(bookingRoom(booking.id)).emit('job_updated', booking);
};

export const emitJobStarted = (partnerProfileId: string, booking: any) => {
  if (!partnerNamespace) return;
  partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_started', booking);
};

export const emitJobCompleted = (partnerProfileId: string, booking: any) => {
  if (!partnerNamespace) return;
  partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_completed', booking);
};

export const emitJobCancelled = (partnerProfileId: string, bookingId: string) => {
  if (!partnerNamespace) return;
  if (!isRedisConnected()) console.error('[Socket] Redis unavailable during job_cancelled emit');

  partnerNamespace.to(partnerRoom(partnerProfileId)).emit('job_cancelled', { bookingId });
  partnerNamespace.to(bookingRoom(bookingId)).emit('job_cancelled', { bookingId });
};

export const emitAdminBookingUpdated = (booking: any) => {
  if (!adminNamespace) return;
  adminNamespace.to('admin:locations').emit('booking_updated', booking);
};

export const emitAdminPaymentUpdated = (payment: any) => {
  if (!adminNamespace) return;
  adminNamespace.to('admin:locations').emit('payment_updated', payment);
};
