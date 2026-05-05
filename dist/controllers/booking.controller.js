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
exports.getPartnerJobs = exports.completeJob = exports.startJob = exports.rejectJob = exports.acceptJob = exports.cancelBooking = exports.getBookingById = exports.getHistory = exports.updateStatus = exports.createBooking = void 0;
const bookingService = __importStar(require("../services/booking.service"));
const socket_1 = require("../config/socket");
const createBooking = async (req, res) => {
    const result = await bookingService.createBooking(req.user.userId, req.body);
    res.status(201).json(result);
};
exports.createBooking = createBooking;
const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status, cancelReason } = req.body;
    const result = await bookingService.updateBookingStatus(req.user.userId, req.user.role, id, status, cancelReason);
    res.status(200).json(result);
};
exports.updateStatus = updateStatus;
const getHistory = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = await bookingService.getBookingHistory(req.user.userId, req.user.role, page, limit);
    res.status(200).json(result);
};
exports.getHistory = getHistory;
const getBookingById = async (req, res) => {
    const { id } = req.params;
    const result = await bookingService.getBookingById(req.user.userId, id);
    res.status(200).json(result);
};
exports.getBookingById = getBookingById;
const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const result = await bookingService.cancelBooking(req.user.userId, id, cancelReason ?? 'Cancelled by user');
    // Notify partner
    const booking = result;
    if (booking.partnerProfileId)
        (0, socket_1.emitJobCancelled)(booking.partnerProfileId, id);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.cancelBooking = cancelBooking;
// ─── Partner Job Actions ──────────────────────────────────────────────────────
const acceptJob = async (req, res) => {
    const { id } = req.params;
    const result = await bookingService.acceptJob(req.user.userId, id);
    (0, socket_1.emitBookingUpdated)(result.userId, result);
    (0, socket_1.emitBookingConfirmed)(result.userId, result);
    (0, socket_1.emitJobUpdated)(result.partnerProfileId, result);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.acceptJob = acceptJob;
const rejectJob = async (req, res) => {
    const { id } = req.params;
    const result = await bookingService.rejectJob(req.user.userId, id);
    (0, socket_1.emitBookingUpdated)(result.userId, result);
    (0, socket_1.emitJobUpdated)(result.partnerProfileId, result);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.rejectJob = rejectJob;
const startJob = async (req, res) => {
    const { id } = req.params;
    const result = await bookingService.startJob(req.user.userId, id);
    (0, socket_1.emitBookingUpdated)(result.userId, result);
    (0, socket_1.emitJobUpdated)(result.partnerProfileId, result);
    (0, socket_1.emitJobStarted)(result.partnerProfileId, result);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.startJob = startJob;
const completeJob = async (req, res) => {
    const { id } = req.params;
    const result = await bookingService.completeJob(req.user.userId, id);
    (0, socket_1.emitBookingUpdated)(result.userId, result);
    (0, socket_1.emitJobUpdated)(result.partnerProfileId, result);
    (0, socket_1.emitJobCompleted)(result.partnerProfileId, result);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.completeJob = completeJob;
const getPartnerJobs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = await bookingService.getPartnerJobs(req.user.userId, page, limit);
    res.status(200).json(result);
};
exports.getPartnerJobs = getPartnerJobs;
