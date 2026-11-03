import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { OAuthService } from '../services/oauth.service.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator.js';
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

  /**
   * POST /api/auth/google
   * Authenticate or auto-provision a student via Google OAuth ID token
   */
  static async googleAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { credential } = req.body;
      if (!credential || typeof credential !== 'string') {
        sendError(res, 'Google credential token is required', 'VALIDATION_ERROR', 400);
        return;
      }

      const { user, token } = await OAuthService.authenticateWithGoogle(credential);

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      sendSuccess(
        res,
        'Google authentication successful',
        { user: user.toJSON(), token },
        200
      );
    } catch (error: any) {
      sendError(res, error.message || 'Google authentication failed', 'UNAUTHORIZED', 401);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset link
   */
  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.requestPasswordReset(validatedInput.email);

      sendSuccess(
        res,
        result.message,
        {
          resetUrl: result.resetUrl,
          token: result.token,
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password using cryptographic token
   */
  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = resetPasswordSchema.parse(req.body);
      const { user, token } = await AuthService.resetPassword(
        validatedInput.token,
        validatedInput.password
      );

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      sendSuccess(
        res,
        'Password has been reset successfully. You are now signed in.',
        { user: user.toJSON(), token },
        200
      );
    } catch (error: any) {
      if (error.code === 'INVALID_OR_EXPIRED_TOKEN') {
        sendError(res, error.message, error.code, 400);
        return;
      }
      next(error);
    }
  }
}
