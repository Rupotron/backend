"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceDetails = exports.getAllServices = exports.getServicesByCategory = exports.getAllCategories = void 0;
const prisma_1 = require("../config/prisma");
const getAllCategories = async () => {
    return prisma_1.prisma.serviceCategory.findMany({
        where: { isActive: true },
        include: {
            services: {
                where: { isActive: true, isDeleted: false },
                orderBy: [{ isPopular: 'desc' }, { displayOrder: 'asc' }]
            }
        },
        orderBy: { displayOrder: 'asc' }
    });
};
exports.getAllCategories = getAllCategories;
const getServicesByCategory = async (categoryId) => {
    return prisma_1.prisma.service.findMany({
        where: {
            categoryId,
            isActive: true,
            isDeleted: false
        },
        include: {
            category: true
        },
        orderBy: [{ isPopular: 'desc' }, { displayOrder: 'asc' }]
    });
};
exports.getServicesByCategory = getServicesByCategory;
const getAllServices = async (filters = {}) => {
    return prisma_1.prisma.service.findMany({
        where: {
            isActive: true,
            isDeleted: false,
            ...(filters.popular ? { isPopular: true } : {}),
            ...(filters.search
                ? {
                    OR: [
                        { name: { contains: filters.search, mode: 'insensitive' } },
                        { description: { contains: filters.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(filters.categorySlug
                ? {
                    category: {
                        slug: filters.categorySlug,
                        isActive: true,
                    },
                }
                : {}),
        },
        include: {
            category: true,
        },
        orderBy: [{ isPopular: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
};
exports.getAllServices = getAllServices;
const getServiceDetails = async (serviceId) => {
    const service = await prisma_1.prisma.service.findUnique({
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
exports.getServiceDetails = getServiceDetails;
