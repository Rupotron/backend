import { Request, Response } from 'express';
import * as partnerService from '../services/partner.service';

export const createProfile = async (req: Request, res: Response) => {
  const result = await partnerService.createProfile(req.user!.userId, req.body);
  res.status(201).json(result);
};

export const getProfile = async (req: Request, res: Response) => {
  const result = await partnerService.getProfile(req.user!.userId);
  res.status(200).json(result);
};

export const addService = async (req: Request, res: Response) => {
  const result = await partnerService.addService(req.user!.userId, req.body);
  res.status(201).json(result);
};

export const toggleStatus = async (req: Request, res: Response) => {
  const result = await partnerService.toggleStatus(req.user!.userId, req.body);
  res.status(200).json(result);
};
