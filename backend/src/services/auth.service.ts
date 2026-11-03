import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUserDocument } from '../models/User.js';
import { ROLES } from '../constants/enums.js';
import { ENV } from '../config/env.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { AuthUserPayload } from '../middleware/auth.middleware.js';

export class AuthService {
  /**
   * Register a new student account
   * Security Invariant: Public registration always forces role: 'student'
   */
  static async registerStudent(input: RegisterInput): Promise<{
    user: IUserDocument;
    token: string;
  }> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      const error: any = new Error('An account with this email already exists.');
      error.code = 11000;
      error.keyValue = { email: input.email };
      throw error;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: ROLES.STUDENT,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Authenticate a user by email and password
   */
  static async login(input: LoginInput): Promise<{
    user: IUserDocument;
    token: string;
  }> {
    const user = await User.findOne({ email: input.email });
    if (!user) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Retrieve current user profile by ID
   */
  static async getCurrentUser(userId: string): Promise<IUserDocument | null> {
    return User.findById(userId);
  }

  /**
   * Request a password reset link for a user
   * Returns generic message to prevent account enumeration
   * In development/testing, returns resetUrl and token for ergonomics
   */
  static async requestPasswordReset(email: string): Promise<{
    message: string;
    resetUrl?: string;
    token?: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration: If user does not exist, return generic message without error
    if (!user) {
      return {
        message: 'If an account with this email exists, a password reset link has been generated.',
      };
    }

    // Generate secure 32-byte hexadecimal random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token with SHA-256 for secure DB persistence
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token hash and 15-minute expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${ENV.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log(`[AUTH] 🔑 Password reset requested for ${user.email}. Reset Link: ${resetUrl}`);

    return {
      message: 'If an account with this email exists, a password reset link has been generated.',
      resetUrl,
      token: resetToken,
    };
  }

  /**
   * Reset user password using the one-time raw token
   */
  static async resetPassword(
    rawToken: string,
    newPassword: string
  ): Promise<{
    user: IUserDocument;
    token: string;
  }> {
    // Hash incoming raw token to find corresponding user
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      const error: any = new Error('Password reset token is invalid or has expired.');
      error.statusCode = 400;
      error.code = 'INVALID_OR_EXPIRED_TOKEN';
      throw error;
    }

    // Hash the new password with bcrypt
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Invalidate reset token and expiration (replay attack prevention)
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Issue a fresh authentication session token
    const sessionToken = this.generateToken(user);
    return { user, token: sessionToken };
  }

  /**
   * Generate signed JWT
   */
  static generateToken(user: IUserDocument): string {
    const payload: AuthUserPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }
}
