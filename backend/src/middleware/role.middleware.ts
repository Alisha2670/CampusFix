import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util.js';
import { Role } from '../constants/enums.js';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'Access denied: You do not possess the required permissions for this resource',
        'FORBIDDEN',
        403
      );
      return;
    }

    next();
  };
};
