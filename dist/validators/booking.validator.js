"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    partnerProfileId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    addressId: zod_1.z.string().uuid(),
    scheduledDate: zod_1.z.string().datetime().refine((value) => new Date(value).getTime() > Date.now(), {
        message: 'scheduledDate must be in the future'
    })
});
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    cancelReason: zod_1.z.string().trim().max(500).optional()
});
