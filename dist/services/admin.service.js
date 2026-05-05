"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRefund = exports.markPaymentForRefund = exports.listPayments = exports.cancelBooking = exports.getBooking = exports.listBookings = exports.updatePartnerStatus = exports.getPartner = exports.listPartners = exports.disableUser = exports.listUsers = exports.getDashboard = void 0;
const prisma_1 = require("../config/prisma");
const getPagination = (page = 1, limit = 20) => {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};
const toDateKey = (value) => value.toISOString().slice(0, 10);
const getDashboard = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    const [totalUsers, totalPartners, activeBookings, completedBookings, completedPayments, recentBookings,] = await Promise.all([
        prisma_1.prisma.user.count({ where: { role: 'USER', isDeleted: false } }),
        prisma_1.prisma.partnerProfile.count({ where: { isDeleted: false } }),
        prisma_1.prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } } }),
        prisma_1.prisma.booking.count({ where: { status: 'COMPLETED' } }),
        prisma_1.prisma.payment.findMany({
            where: { status: 'COMPLETED' },
            select: { amount: true, createdAt: true },
        }),
        prisma_1.prisma.booking.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true, totalAmount: true, payment: { select: { status: true, amount: true } } },
            orderBy: { createdAt: 'asc' },
        }),
    ]);
    const revenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const chartDays = Array.from({ length: 14 }, (_, index) => {
        const day = new Date(since);
        day.setDate(since.getDate() + index);
        return { date: toDateKey(day), bookings: 0, revenue: 0 };
    });
    const chartMap = new Map(chartDays.map((item) => [item.date, item]));
    for (const booking of recentBookings) {
        const key = toDateKey(booking.createdAt);
        const bucket = chartMap.get(key);
        if (!bucket)
            continue;
        bucket.bookings += 1;
        if (booking.payment?.status === 'COMPLETED')
            bucket.revenue += booking.payment.amount;
    }
    return {
        metrics: { totalUsers, totalPartners, activeBookings, completedBookings, revenue },
        charts: chartDays,
    };
};
exports.getDashboard = getDashboard;
const listUsers = async (query) => {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search?.trim();
    const where = {
        role: 'USER',
        ...(search
            ? {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isDeleted: true,
                createdAt: true,
                _count: { select: { bookings: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};
exports.listUsers = listUsers;
const disableUser = (id) => prisma_1.prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    select: { id: true, isDeleted: true },
});
exports.disableUser = disableUser;
const listPartners = async (query) => {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search?.trim();
    const where = {
        ...(query.status === 'active' ? { isDeleted: false, isOnline: true } : {}),
        ...(query.status === 'offline' ? { isDeleted: false, isOnline: false } : {}),
        ...(query.status === 'pending' ? { isDeleted: true } : {}),
        ...(search
            ? {
                user: {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search } },
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                    ],
                },
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        prisma_1.prisma.partnerProfile.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isDeleted: true } },
                partnerServices: { include: { service: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.partnerProfile.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};
exports.listPartners = listPartners;
const getPartner = (id) => prisma_1.prisma.partnerProfile.findUnique({
    where: { id },
    include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isDeleted: true } },
        partnerServices: { include: { service: true } },
        availabilities: true,
        location: true,
        bookings: {
            include: { service: true, payment: true, user: { select: { firstName: true, lastName: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        },
    },
});
exports.getPartner = getPartner;
const updatePartnerStatus = async (id, action) => {
    if (action === 'approve') {
        return prisma_1.prisma.partnerProfile.update({ where: { id }, data: { isDeleted: false } });
    }
    if (action === 'reject' || action === 'disable') {
        return prisma_1.prisma.partnerProfile.update({ where: { id }, data: { isDeleted: true, isOnline: false, isBusy: false } });
    }
    throw { statusCode: 400, message: 'Unsupported action' };
};
exports.updatePartnerStatus = updatePartnerStatus;
const listBookings = async (query) => {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const date = query.date ? new Date(query.date) : null;
    const dateEnd = date ? new Date(date) : null;
    if (dateEnd)
        dateEnd.setDate(dateEnd.getDate() + 1);
    const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.service ? { service: { name: { contains: query.service, mode: 'insensitive' } } } : {}),
        ...(date && dateEnd ? { scheduledDate: { gte: date, lt: dateEnd } } : {}),
    };
    const [items, total] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true, phone: true, email: true } },
                partnerProfile: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
                service: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.booking.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};
exports.listBookings = listBookings;
const getBooking = (id) => prisma_1.prisma.booking.findUnique({
    where: { id },
    include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        partnerProfile: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        service: true,
        payment: true,
        address: true,
    },
});
exports.getBooking = getBooking;
const cancelBooking = (id, cancelReason = 'Cancelled by admin') => prisma_1.prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason },
    include: { user: true, partnerProfile: true, service: true, payment: true },
});
exports.cancelBooking = cancelBooking;
const listPayments = async (query) => {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = { ...(query.status ? { status: query.status } : {}) };
    const [items, total] = await Promise.all([
        prisma_1.prisma.payment.findMany({
            where,
            include: { booking: { include: { service: true, user: true, partnerProfile: { include: { user: true } } } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};
exports.listPayments = listPayments;
const markPaymentForRefund = (id) => prisma_1.prisma.payment.update({
    where: { id },
    data: { status: 'REFUND_CANDIDATE' },
    include: { booking: true },
});
exports.markPaymentForRefund = markPaymentForRefund;
const mockRefund = (id) => prisma_1.prisma.payment.update({
    where: { id },
    data: { status: 'REFUNDED' },
    include: { booking: true },
});
exports.mockRefund = mockRefund;
