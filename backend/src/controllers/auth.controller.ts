import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { sendSuccess, sendError } from '../utils/response.util.js';
import { ENV } from '../config/env.js';

const COOKIE_NAME = 'token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: ENV.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const { user, token } = await AuthService.registerStudent(validatedInput);

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      sendSuccess(
        res,
        'Student registered successfully',
        { user: user.toJSON(), token },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(validatedInput);

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      sendSuccess(
        res,
        'Login successful',
        { user: user.toJSON(), token },
        200
      );
    } catch (error: any) {
      if (error.code === 'INVALID_CREDENTIALS') {
        sendError(res, error.message, error.code, 401);
        return;
      }
      next(error);
    }
  }

  static async logout(
    _req: Request,
    res: Response
  ): Promise<void> {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    sendSuccess(res, 'Logged out successfully', null, 200);
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.id);
      if (!user) {
        sendError(res, 'User account not found', 'NOT_FOUND', 404);
        return;
      }

      sendSuccess(res, 'User profile fetched successfully', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }
}
