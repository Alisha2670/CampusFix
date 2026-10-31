import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/constants/enums.js';

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@campus.edu';
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log(`[Seed] Admin user already exists: ${adminEmail}`);
      await disconnectDB();
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('AdminPass123!', saltRounds);

    const admin = await User.create({
      name: 'Campus Administrator',
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
    });

    console.log(`[Seed SUCCESS] Admin account created!`);
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: AdminPass123!`);
    console.log(`Role:     ${admin.role}`);

    await disconnectDB();
  } catch (error) {
    console.error('[Seed Error] Failed to create admin user:', error);
    process.exit(1);
  }
};

seedAdmin();

