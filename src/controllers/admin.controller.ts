import { Request, Response } from 'express';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as adminService from '../services/admin.service';
import { emitAdminBookingUpdated, emitAdminPaymentUpdated } from '../config/socket';

const pageQuery = (req: Request) => ({
  page: parseInt(req.query.page as string) || 1,
  limit: parseInt(req.query.limit as string) || 20,
});

export const dashboard = async (_req: Request, res: Response) => {
  res.status(200).json(await adminService.getDashboard());
};

export const users = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.listUsers({ ...pageQuery(req), search: req.query.search as string }));
};

export const disableUser = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.disableUser(req.params.id));
};

export const partners = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.listPartners({
    ...pageQuery(req),
    status: req.query.status as string,
    search: req.query.search as string,
  }));
};

export const partner = async (req: Request, res: Response) => {
  const result = await adminService.getPartner(req.params.id);
  if (!result) throw { statusCode: 404, message: 'Partner not found' };
  res.status(200).json(result);
};

export const partnerAction = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.updatePartnerStatus(req.params.id, req.body.action));
};

export const bookings = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.listBookings({
    ...pageQuery(req),
    status: req.query.status as BookingStatus,
    service: req.query.service as string,
    date: req.query.date as string,
  }));
};

export const booking = async (req: Request, res: Response) => {
  const result = await adminService.getBooking(req.params.id);
  if (!result) throw { statusCode: 404, message: 'Booking not found' };
  res.status(200).json(result);
};

export const cancelBooking = async (req: Request, res: Response) => {
  const result = await adminService.cancelBooking(req.params.id, req.body.cancelReason);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

export const payments = async (req: Request, res: Response) => {
  res.status(200).json(await adminService.listPayments({
    ...pageQuery(req),
    status: req.query.status as PaymentStatus,
  }));
};

export const paymentAction = async (req: Request, res: Response) => {
  if (req.body.action === 'mark_refund') {
    const result = await adminService.markPaymentForRefund(req.params.id);
    emitAdminPaymentUpdated(result);
    res.status(200).json(result);
    return;
  }

  if (req.body.action === 'mock_refund') {
    const result = await adminService.mockRefund(req.params.id);
    emitAdminPaymentUpdated(result);
    res.status(200).json(result);
    return;
  }

  throw { statusCode: 400, message: 'Unsupported payment action' };
};
