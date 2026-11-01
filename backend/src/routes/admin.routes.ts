import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ROLES } from '../constants/enums.js';

const router = Router();

// All admin routes strictly require authentication and ADMIN role
router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/complaints', AdminController.getAllComplaints);
router.get('/analytics', AdminController.getAnalytics);
router.patch('/complaints/:id/status', AdminController.updateComplaintStatus);
router.patch('/complaints/:id', AdminController.updateComplaintTriage);

export default router;

