"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleStatus = exports.addService = exports.getProfile = exports.createProfile = void 0;
const prisma_1 = require("../config/prisma");
const createProfile = async (userId, data) => {
    const existingProfile = await prisma_1.prisma.partnerProfile.findUnique({
        where: { userId }
    });
    if (existingProfile) {
        throw { statusCode: 400, message: 'Partner profile already exists' };
    }
    // Also update user role to PARTNER
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { role: 'PARTNER' }
    });
    return prisma_1.prisma.partnerProfile.create({
        data: {
            userId,
            bio: data.bio
        }
    });
};
exports.createProfile = createProfile;
const getProfile = async (userId) => {
    const profile = await prisma_1.prisma.partnerProfile.findUnique({
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
exports.getProfile = getProfile;
const addService = async (userId, data) => {
    const profile = await prisma_1.prisma.partnerProfile.findUnique({
        where: { userId }
    });
    if (!profile) {
        throw { statusCode: 404, message: 'Partner profile not found' };
    }
    return prisma_1.prisma.partnerService.create({
        data: {
            partnerProfileId: profile.id,
            serviceId: data.serviceId,
            customPrice: data.customPrice
        }
    });
};
exports.addService = addService;
const toggleStatus = async (userId, data) => {
    const profile = await prisma_1.prisma.partnerProfile.findUnique({
        where: { userId }
    });
    if (!profile) {
        throw { statusCode: 404, message: 'Partner profile not found' };
    }
    return prisma_1.prisma.partnerProfile.update({
        where: { id: profile.id },
        data: {
            isOnline: data.isOnline !== undefined ? data.isOnline : profile.isOnline,
            isBusy: data.isBusy !== undefined ? data.isBusy : profile.isBusy
        }
    });
};
exports.toggleStatus = toggleStatus;
