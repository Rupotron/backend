"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAddresses = exports.addUserAddress = exports.updateUserProfile = exports.getUserProfile = void 0;
const prisma_1 = require("../config/prisma");
const getUserProfile = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
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
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (userId, data) => {
    const user = await prisma_1.prisma.user.update({
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
exports.updateUserProfile = updateUserProfile;
const addUserAddress = async (userId, data) => {
    if (data.isDefault) {
        await prisma_1.prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
    }
    const address = await prisma_1.prisma.address.create({
        data: {
            ...data,
            userId
        }
    });
    return address;
};
exports.addUserAddress = addUserAddress;
const getUserAddresses = async (userId) => {
    return prisma_1.prisma.address.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
};
exports.getUserAddresses = getUserAddresses;
