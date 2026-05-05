import { prisma } from '../config/prisma';

export const createProfile = async (userId: string, data: any) => {
  const existingProfile = await prisma.partnerProfile.findUnique({
    where: { userId }
  });

  if (existingProfile) {
    throw { statusCode: 400, message: 'Partner profile already exists' };
  }

  // Also update user role to PARTNER
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'PARTNER' }
  });

  return prisma.partnerProfile.create({
    data: {
      userId,
      bio: data.bio
    }
  });
};

export const getProfile = async (userId: string) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId, isDeleted: false },
    include: {
      partnerServices: {
        include: { service: true }
      },
      location: true,
      availabilities: true
    }
  });

  if (!profile) {
    throw { statusCode: 404, message: 'Partner profile not found' };
  }

  return profile;
};

export const addService = async (userId: string, data: any) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    throw { statusCode: 404, message: 'Partner profile not found' };
  }

  return prisma.partnerService.create({
    data: {
      partnerProfileId: profile.id,
      serviceId: data.serviceId,
      customPrice: data.customPrice
    }
  });
};

export const toggleStatus = async (userId: string, data: any) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    throw { statusCode: 404, message: 'Partner profile not found' };
  }

  return prisma.partnerProfile.update({
    where: { id: profile.id },
    data: {
      isOnline: data.isOnline !== undefined ? data.isOnline : profile.isOnline,
      isBusy: data.isBusy !== undefined ? data.isBusy : profile.isBusy
    }
  });
};
