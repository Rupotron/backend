import { prisma } from '../config/prisma';
import { BookingStatus, Role } from '@prisma/client';

export const createBooking = async (userId: string, data: any) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate partner + service
    const partner = await tx.partnerProfile.findUnique({
      where: { id: data.partnerProfileId }
    });

    if (!partner || !partner.isOnline || partner.isBusy) {
      throw { statusCode: 400, message: 'Partner is currently unavailable or busy' };
    }

    const partnerService = await tx.partnerService.findUnique({
      where: {
        partnerProfileId_serviceId: {
          partnerProfileId: data.partnerProfileId,
          serviceId: data.serviceId
        }
      },
      include: { service: true }
    });

    if (!partnerService || !partnerService.isActive) {
      throw { statusCode: 400, message: 'Partner does not offer this service currently' };
    }

    // 2. Fetch address + coords + snapshot
    const address = await tx.address.findUnique({
      where: { id: data.addressId }
    });

    if (!address) {
      throw { statusCode: 400, message: 'Invalid address' };
    }
    if (address.userId !== userId) {
      throw { statusCode: 403, message: 'Address does not belong to this user' };
    }

    // We assume latitude/longitude are stored in Address or passed.
    // For MVP, if they aren't on Address, we mock them.
    // Wait, Address in schema doesn't have lat/long. Let's mock the coords for now,
    // or assume they are calculated externally.
    const mockLat = 0;
    const mockLon = 0;
    const addressSnapshot = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

    // 3. Fetch pricing
    const totalAmount = partnerService.customPrice ?? partnerService.service.basePrice;

    // 4. Create booking with 2 minute expiry
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const booking = await tx.booking.create({
      data: {
        userId,
        partnerProfileId: data.partnerProfileId,
        serviceId: data.serviceId,
        addressId: data.addressId,
        addressSnapshot,
        latitude: mockLat,
        longitude: mockLon,
        scheduledDate: new Date(data.scheduledDate),
        totalAmount,
        status: 'PENDING',
        expiresAt
      }
    });

    return booking;
  });
};

export const updateBookingStatus = async (userId: string, role: Role, bookingId: string, status: BookingStatus, cancelReason?: string) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking not found' };
    }
    // Authorization checks
    if (role === 'USER' && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    
    // If partner, verify it belongs to them
    if (role === 'PARTNER') {
      const partnerProfile = await tx.partnerProfile.findUnique({ where: { userId } });
      if (!partnerProfile || booking.partnerProfileId !== partnerProfile.id) {
        throw { statusCode: 403, message: 'Forbidden' };
      }
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw { statusCode: 400, message: `Booking is already ${booking.status}` };
    }

    // Role-based restrictions
    if (role === 'USER' && (status === 'CONFIRMED' || status === 'COMPLETED')) {
      throw { statusCode: 403, message: 'User cannot confirm or complete bookings' };
    }

    // State machine validation
    const validTransitions: Record<string, BookingStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'] // restricted cancelled
    };

    if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(status)) {
      throw { statusCode: 400, message: `Invalid transition from ${booking.status} to ${status}` };
    }

    // Expiry check
    if (booking.status === 'PENDING' && booking.expiresAt && new Date() > booking.expiresAt) {
      throw { statusCode: 400, message: 'Booking has expired' };
    }

    // Concurrency protection on confirmation
    if (status === 'CONFIRMED') {
      const activeBooking = await tx.booking.findFirst({
        where: {
          partnerProfileId: booking.partnerProfileId,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] }
        }
      });
      if (activeBooking) {
        throw { statusCode: 400, message: 'Partner is currently busy with another active booking' };
      }
    }

    // Timestamps
    let startedAt = booking.startedAt;
    let completedAt = booking.completedAt;

    if (status === 'IN_PROGRESS') startedAt = new Date();
    if (status === 'COMPLETED') completedAt = new Date();

    // Perform Update
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status,
        cancelReason,
        startedAt,
        completedAt
      }
    });

    // Partner Metrics Update
    if (status === 'COMPLETED') {
      await tx.partnerProfile.update({
        where: { id: booking.partnerProfileId },
        data: { completedJobs: { increment: 1 }, totalJobs: { increment: 1 } }
      });
    } else if (status === 'CANCELLED') {
      await tx.partnerProfile.update({
        where: { id: booking.partnerProfileId },
        data: { cancelledJobs: { increment: 1 }, totalJobs: { increment: 1 } }
      });
    }

    return updatedBooking;
  });
};

export const getBookingHistory = async (
  userId: string,
  role: Role,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  if (role === 'PARTNER') {
    const partnerProfile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!partnerProfile) return { bookings: [], total: 0, page, limit };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { partnerProfileId: partnerProfile.id },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
          service: true,
          payment: true
        }
      }),
      prisma.booking.count({ where: { partnerProfileId: partnerProfile.id } })
    ]);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: {
        partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: true,
        payment: true
      }
    }),
    prisma.booking.count({ where: { userId } })
  ]);

  return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const cancelBooking = async (userId: string, bookingId: string, cancelReason: string) => {
  return updateBookingStatus(userId, 'USER', bookingId, 'CANCELLED', cancelReason);
};

export const getBookingById = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, payment: true, partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } } }
  });

  if (!booking) throw { statusCode: 404, message: 'Booking not found' };
  if (booking.userId !== userId) throw { statusCode: 403, message: 'Forbidden' };

  return booking;
};

// ─── Partner Job Lifecycle ────────────────────────────────────────────────────

const getPartnerProfileOrFail = async (userId: string) => {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw { statusCode: 404, message: 'Partner profile not found' };
  return profile;
};

export const acceptJob = async (userId: string, bookingId: string) => {
  return await prisma.$transaction(async (tx) => {
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (!partner) throw { statusCode: 404, message: 'Partner profile not found' };
    if (!partner.isOnline) throw { statusCode: 403, message: 'Go online before accepting jobs' };

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (booking.partnerProfileId !== partner.id) throw { statusCode: 403, message: 'This job is not assigned to you' };
    if (booking.status !== 'PENDING') throw { statusCode: 400, message: `Cannot accept a ${booking.status} booking` };
    if (booking.expiresAt && new Date() > booking.expiresAt) throw { statusCode: 400, message: 'This booking has expired' };
    const payment = await tx.payment.findUnique({ where: { bookingId } });
    if (!payment || payment.status !== 'COMPLETED') {
      throw { statusCode: 402, message: 'Payment must be completed before accepting this job' };
    }

    const confirmation = await tx.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: { status: 'CONFIRMED' }
    });

    if (confirmation.count !== 1) {
      throw { statusCode: 409, message: 'Job already accepted by another partner or no longer available' };
    }

    const updated = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        payment: true,
        user: { select: { firstName: true, lastName: true, phone: true } }
      }
    });

    if (!updated) throw { statusCode: 404, message: 'Booking not found' };

    await tx.partnerProfile.update({ where: { id: partner.id }, data: { isBusy: true } });

    return updated;
  });
};

export const rejectJob = async (userId: string, bookingId: string) => {
  const partner = await getPartnerProfileOrFail(userId);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) throw { statusCode: 404, message: 'Booking not found' };
  if (booking.partnerProfileId !== partner.id) throw { statusCode: 403, message: 'This job is not assigned to you' };
  if (booking.status !== 'PENDING') throw { statusCode: 400, message: 'Can only reject pending bookings' };

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED', cancelReason: 'Rejected by partner' },
    include: { service: true }
  });
};

export const startJob = async (userId: string, bookingId: string) => {
  return await prisma.$transaction(async (tx) => {
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (!partner) throw { statusCode: 404, message: 'Partner profile not found' };

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (booking.partnerProfileId !== partner.id) throw { statusCode: 403, message: 'Forbidden' };
    if (booking.status !== 'CONFIRMED') throw { statusCode: 400, message: `Cannot start a ${booking.status} booking` };

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: { service: true, payment: true }
    });
  });
};

export const completeJob = async (userId: string, bookingId: string) => {
  return await prisma.$transaction(async (tx) => {
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (!partner) throw { statusCode: 404, message: 'Partner profile not found' };

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (booking.partnerProfileId !== partner.id) throw { statusCode: 403, message: 'Forbidden' };
    if (booking.status !== 'IN_PROGRESS') throw { statusCode: 400, message: `Cannot complete a ${booking.status} booking` };

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: { service: true, payment: true }
    });

    await tx.partnerProfile.update({
      where: { id: partner.id },
      data: { isBusy: false, completedJobs: { increment: 1 }, totalJobs: { increment: 1 } }
    });

    return updated;
  });
};

export const getPartnerJobs = async (userId: string, page = 1, limit = 20) => {
  const partner = await getPartnerProfileOrFail(userId);
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.booking.findMany({
      where: { partnerProfileId: partner.id },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: {
        service: true,
        payment: true,
        user: { select: { firstName: true, lastName: true, phone: true } }
      }
    }),
    prisma.booking.count({ where: { partnerProfileId: partner.id } })
  ]);

  return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
};
