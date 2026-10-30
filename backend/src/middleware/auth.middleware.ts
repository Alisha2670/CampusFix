import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { sendError } from '../utils/response.util.js';
import { Role } from '../constants/enums.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      sendError(res, 'Authentication required. Please log in.', 'UNAUTHORIZED', 401);
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired session token. Please log in again.', 'INVALID_TOKEN', 401);
  }
};
