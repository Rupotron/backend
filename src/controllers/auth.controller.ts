import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json(result);
};

export const google = async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  res.status(200).json(result);
};

export const sendOtp = async (req: Request, res: Response) => {
  const result = await authService.sendOtp(req.body.phone);
  res.status(200).json(result);
};

export const verifyOtp = async (req: Request, res: Response) => {
  const result = await authService.verifyOtp(req.body.phone, req.body.otp);
  res.status(200).json(result);
};
