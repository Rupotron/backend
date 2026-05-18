"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPartnerMetricsSchema = exports.partnerLocationSchema = exports.matchServiceSchema = void 0;
const zod_1 = require("zod");
exports.matchServiceSchema = zod_1.z.object({
    serviceId: zod_1.z.string().uuid(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radius: zod_1.z.number().positive().default(10)
});
exports.partnerLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    isOnline: zod_1.z.boolean().optional()
});
exports.syncPartnerMetricsSchema = zod_1.z.object({
    partnerId: zod_1.z.string().uuid()
});
