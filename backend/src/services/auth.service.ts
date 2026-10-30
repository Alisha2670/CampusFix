import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
