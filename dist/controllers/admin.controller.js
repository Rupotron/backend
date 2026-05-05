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
exports.paymentAction = exports.payments = exports.cancelBooking = exports.booking = exports.bookings = exports.partnerAction = exports.partner = exports.partners = exports.disableUser = exports.users = exports.dashboard = void 0;
const adminService = __importStar(require("../services/admin.service"));
const socket_1 = require("../config/socket");
const pageQuery = (req) => ({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
});
const dashboard = async (_req, res) => {
    res.status(200).json(await adminService.getDashboard());
};
exports.dashboard = dashboard;
const users = async (req, res) => {
    res.status(200).json(await adminService.listUsers({ ...pageQuery(req), search: req.query.search }));
};
exports.users = users;
const disableUser = async (req, res) => {
    res.status(200).json(await adminService.disableUser(req.params.id));
};
exports.disableUser = disableUser;
const partners = async (req, res) => {
    res.status(200).json(await adminService.listPartners({
        ...pageQuery(req),
        status: req.query.status,
        search: req.query.search,
    }));
};
exports.partners = partners;
const partner = async (req, res) => {
    const result = await adminService.getPartner(req.params.id);
    if (!result)
        throw { statusCode: 404, message: 'Partner not found' };
    res.status(200).json(result);
};
exports.partner = partner;
const partnerAction = async (req, res) => {
    res.status(200).json(await adminService.updatePartnerStatus(req.params.id, req.body.action));
};
exports.partnerAction = partnerAction;
const bookings = async (req, res) => {
    res.status(200).json(await adminService.listBookings({
        ...pageQuery(req),
        status: req.query.status,
        service: req.query.service,
        date: req.query.date,
    }));
};
exports.bookings = bookings;
const booking = async (req, res) => {
    const result = await adminService.getBooking(req.params.id);
    if (!result)
        throw { statusCode: 404, message: 'Booking not found' };
    res.status(200).json(result);
};
exports.booking = booking;
const cancelBooking = async (req, res) => {
    const result = await adminService.cancelBooking(req.params.id, req.body.cancelReason);
    (0, socket_1.emitAdminBookingUpdated)(result);
    res.status(200).json(result);
};
exports.cancelBooking = cancelBooking;
const payments = async (req, res) => {
    res.status(200).json(await adminService.listPayments({
        ...pageQuery(req),
        status: req.query.status,
    }));
};
exports.payments = payments;
const paymentAction = async (req, res) => {
    if (req.body.action === 'mark_refund') {
        const result = await adminService.markPaymentForRefund(req.params.id);
        (0, socket_1.emitAdminPaymentUpdated)(result);
        res.status(200).json(result);
        return;
    }
    if (req.body.action === 'mock_refund') {
        const result = await adminService.mockRefund(req.params.id);
        (0, socket_1.emitAdminPaymentUpdated)(result);
        res.status(200).json(result);
        return;
    }
    throw { statusCode: 400, message: 'Unsupported payment action' };
};
exports.paymentAction = paymentAction;
