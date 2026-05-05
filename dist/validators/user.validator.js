"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAddressSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2).optional(),
    lastName: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().optional()
});
exports.createAddressSchema = zod_1.z.object({
    street: zod_1.z.string(),
    city: zod_1.z.string(),
    state: zod_1.z.string(),
    zipCode: zod_1.z.string(),
    country: zod_1.z.string(),
    isDefault: zod_1.z.boolean().optional()
});
