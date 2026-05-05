"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController = __importStar(require("../controllers/payment.controller"));
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const payment_validator_1 = require("../validators/payment.validator");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/payment/webhook
 * ─────────────────────────────
 * MUST be registered BEFORE express.json() on this router.
 * express.raw() preserves the raw Buffer needed for HMAC signature verification.
 * If JSON is parsed first, signature verification will ALWAYS fail.
 */
router.post('/webhook', (0, express_1.raw)({ type: 'application/json' }), paymentController.handleWebhook);
// All routes below require authentication
router.use(auth_middleware_1.authMiddleware);
router.post('/order', (0, validate_middleware_1.validate)(payment_validator_1.createOrderSchema), paymentController.createOrder);
router.post('/verify', (0, validate_middleware_1.validate)(payment_validator_1.verifyPaymentSchema), paymentController.verifyPayment);
exports.default = router;
