import { BookingStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';

const getPagination = (page = 1, limit = 20) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const getDashboard = async () => {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalPartners,
    activeBookings,
    completedBookings,
    completedPayments,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', isDeleted: false } }),
    prisma.partnerProfile.count({ where: { isDeleted: false } }),
    prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true, createdAt: true },
    }),
    prisma.booking.findMany({
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
    if (!bucket) continue;
    bucket.bookings += 1;
    if (booking.payment?.status === 'COMPLETED') bucket.revenue += booking.payment.amount;
  }

  return {
    metrics: { totalUsers, totalPartners, activeBookings, completedBookings, revenue },
    charts: chartDays,
  };
};

export const listUsers = async (query: { page?: number; limit?: number; search?: string }) => {
  const { page, limit, skip } = getPagination(query.page, query.limit);
  const search = query.search?.trim();
  const where = {
    role: 'USER' as Role,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
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
    prisma.user.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const disableUser = (id: string) =>
  prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    select: { id: true, isDeleted: true },
  });

export const listPartners = async (query: { page?: number; limit?: number; status?: string; search?: string }) => {
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
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.partnerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isDeleted: true } },
        partnerServices: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.partnerProfile.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getPartner = (id: string) =>
  prisma.partnerProfile.findUnique({
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

export const updatePartnerStatus = async (id: string, action: 'approve' | 'reject' | 'disable') => {
  if (action === 'approve') {
    return prisma.partnerProfile.update({ where: { id }, data: { isDeleted: false } });
  }

  if (action === 'reject' || action === 'disable') {
    return prisma.partnerProfile.update({ where: { id }, data: { isDeleted: true, isOnline: false, isBusy: false } });
  }

  throw { statusCode: 400, message: 'Unsupported action' };
};

export const listBookings = async (query: {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  service?: string;
  date?: string;
}) => {
  const { page, limit, skip } = getPagination(query.page, query.limit);
  const date = query.date ? new Date(query.date) : null;
  const dateEnd = date ? new Date(date) : null;
  if (dateEnd) dateEnd.setDate(dateEnd.getDate() + 1);

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.service ? { service: { name: { contains: query.service, mode: 'insensitive' as const } } } : {}),
    ...(date && dateEnd ? { scheduledDate: { gte: date, lt: dateEnd } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
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
    prisma.booking.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getBooking = (id: string) =>
  prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      partnerProfile: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      service: true,
      payment: true,
      address: true,
    },
  });

export const cancelBooking = (id: string, cancelReason = 'Cancelled by admin') =>
  prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason },
    include: { user: true, partnerProfile: true, service: true, payment: true },
  });

export const listPayments = async (query: { page?: number; limit?: number; status?: PaymentStatus }) => {
  const { page, limit, skip } = getPagination(query.page, query.limit);
  const where = { ...(query.status ? { status: query.status } : {}) };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { booking: { include: { service: true, user: true, partnerProfile: { include: { user: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const markPaymentForRefund = (id: string) =>
  prisma.payment.update({
    where: { id },
    data: { status: 'REFUND_CANDIDATE' },
    include: { booking: true },
  });

export const mockRefund = (id: string) =>
  prisma.payment.update({
    where: { id },
    data: { status: 'REFUNDED' },
    include: { booking: true },
  });
