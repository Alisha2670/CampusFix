import { Router } from 'express';
import { ComplaintController } from '../controllers/complaint.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { uploadComplaintImage } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/enums.js';

const router = Router();

// Student only: submit a complaint with optional image
router.post(
  '/',
  requireAuth,
  requireRole(ROLES.STUDENT),
  uploadComplaintImage.single('image'),
  ComplaintController.create
);

// Student only: view own submitted complaints
router.get(
  '/my',
  requireAuth,
  requireRole(ROLES.STUDENT),
  ComplaintController.getMyComplaints
);

// Community Campus Feed (Open to authenticated students and staff, placed BEFORE /:id)
router.get(
  '/feed',
  requireAuth,
  ComplaintController.getCampusFeed
);

// Student only: toggle upvote ("Me Too / +1") on a complaint
router.post(
  '/:id/upvote',
  requireAuth,
  requireRole(ROLES.STUDENT),
  ComplaintController.toggleUpvote
);

// Owner or Admin: view single complaint details
router.get(
  '/:id',
  requireAuth,
  ComplaintController.getById
);

export default router;

