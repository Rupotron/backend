import { Request, Response } from 'express';
import * as bookingService from '../services/booking.service';
import {
  emitBookingConfirmed,
  emitBookingUpdated,
  emitJobCancelled,
  emitJobCompleted,
  emitJobStarted,
  emitJobUpdated,
  emitAdminBookingUpdated,
} from '../config/socket';

export const createBooking = async (req: Request, res: Response) => {
  const result = await bookingService.createBooking(req.user!.userId, req.body);
  res.status(201).json(result);
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, cancelReason } = req.body;
  const result = await bookingService.updateBookingStatus(req.user!.userId, req.user!.role, id, status, cancelReason);
  res.status(200).json(result);
};

export const getHistory = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const result = await bookingService.getBookingHistory(req.user!.userId, req.user!.role, page, limit);
  res.status(200).json(result);
};

export const getBookingById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bookingService.getBookingById(req.user!.userId, id);
  res.status(200).json(result);
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cancelReason } = req.body;
  const result = await bookingService.cancelBooking(req.user!.userId, id, cancelReason ?? 'Cancelled by user');
  // Notify partner
  const booking = result as any;
  if (booking.partnerProfileId) emitJobCancelled(booking.partnerProfileId, id);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

// ─── Partner Job Actions ──────────────────────────────────────────────────────

export const acceptJob = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bookingService.acceptJob(req.user!.userId, id);
  emitBookingUpdated((result as any).userId, result);
  emitBookingConfirmed((result as any).userId, result);
  emitJobUpdated((result as any).partnerProfileId, result);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

export const rejectJob = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bookingService.rejectJob(req.user!.userId, id);
  emitBookingUpdated((result as any).userId, result);
  emitJobUpdated((result as any).partnerProfileId, result);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

export const startJob = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bookingService.startJob(req.user!.userId, id);
  emitBookingUpdated((result as any).userId, result);
  emitJobUpdated((result as any).partnerProfileId, result);
  emitJobStarted((result as any).partnerProfileId, result);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

export const completeJob = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bookingService.completeJob(req.user!.userId, id);
  emitBookingUpdated((result as any).userId, result);
  emitJobUpdated((result as any).partnerProfileId, result);
  emitJobCompleted((result as any).partnerProfileId, result);
  emitAdminBookingUpdated(result);
  res.status(200).json(result);
};

export const getPartnerJobs = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const result = await bookingService.getPartnerJobs(req.user!.userId, page, limit);
  res.status(200).json(result);
};
