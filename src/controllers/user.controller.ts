import { Request, Response } from 'express';
import * as userService from '../services/user.service';

export const getProfile = async (req: Request, res: Response) => {
  const result = await userService.getUserProfile(req.user!.userId);
  res.status(200).json(result);
};

export const updateProfile = async (req: Request, res: Response) => {
  const result = await userService.updateUserProfile(req.user!.userId, req.body);
  res.status(200).json(result);
};

export const addAddress = async (req: Request, res: Response) => {
  const result = await userService.addUserAddress(req.user!.userId, req.body);
  res.status(201).json(result);
};

export const getAddresses = async (req: Request, res: Response) => {
  const result = await userService.getUserAddresses(req.user!.userId);
  res.status(200).json(result);
};
