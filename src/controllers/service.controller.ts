import { Request, Response } from 'express';
import * as serviceService from '../services/service.service';

export const getCategories = async (req: Request, res: Response) => {
  const result = await serviceService.getAllCategories();
  res.status(200).json(result);
};

export const getServicesByCategory = async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const result = await serviceService.getServicesByCategory(categoryId);
  res.status(200).json(result);
};

export const getServices = async (req: Request, res: Response) => {
  const categorySlug = typeof req.query.categorySlug === 'string' ? req.query.categorySlug : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const popular = req.query.popular === 'true';

  const result = await serviceService.getAllServices({ categorySlug, search, popular });
  res.status(200).json(result);
};

export const getServiceDetails = async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const result = await serviceService.getServiceDetails(serviceId);
  res.status(200).json(result);
};
