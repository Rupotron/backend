import { prisma } from '../config/prisma';

export const getAllCategories = async () => {
  return prisma.serviceCategory.findMany({
    include: {
      services: {
        where: { isActive: true, isDeleted: false },
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });
};

export const getServicesByCategory = async (categoryId: string) => {
  return prisma.service.findMany({
    where: { 
      categoryId,
      isActive: true,
      isDeleted: false
    },
    orderBy: { name: 'asc' }
  });
};

export const getServiceDetails = async (serviceId: string) => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId, isDeleted: false },
    include: {
      category: true,
      partnerServices: {
        where: { isActive: true },
        include: {
          partnerProfile: {
            include: { user: { select: { firstName: true, lastName: true } } }
          }
        }
      }
    }
  });

  if (!service) {
    throw { statusCode: 404, message: 'Service not found' };
  }

  return service;
};
