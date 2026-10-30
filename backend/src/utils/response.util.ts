import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  message: string,
  code: string = 'INTERNAL_SERVER_ERROR',
  statusCode: number = 500,
  details?: any
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(responsePayload);
};
