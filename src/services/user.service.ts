import { prisma } from '../config/prisma';

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
      addresses: true,
      partnerProfile: true
    }
  });

  if (!user) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return user;
};

export const updateUserProfile = async (userId: string, data: any) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });

  return user;
};

export const addUserAddress = async (userId: string, data: any) => {
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
  }

  const address = await prisma.address.create({
    data: {
      ...data,
      userId
    }
  });

  return address;
};

export const getUserAddresses = async (userId: string) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};
