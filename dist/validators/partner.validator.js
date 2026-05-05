"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleStatusSchema = exports.addServiceSchema = exports.createPartnerProfileSchema = void 0;
const zod_1 = require("zod");
exports.createPartnerProfileSchema = zod_1.z.object({
    bio: zod_1.z.string().optional()
});
exports.addServiceSchema = zod_1.z.object({
    serviceId: zod_1.z.string().uuid(),
    customPrice: zod_1.z.number().positive().optional()
});
exports.toggleStatusSchema = zod_1.z.object({
    isOnline: zod_1.z.boolean().optional(),
    isBusy: zod_1.z.boolean().optional()
});
