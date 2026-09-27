import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { isSuperAdmin } from "../middleware/roleMiddleware.js";
import { getDashboardStats } from "../controllers/adminController.js";
import { getVendors } from "../controllers/adminController.js";
import { getPendingApprovals } from "../controllers/adminController.js";
import { getNotifications } from "../controllers/adminController.js";
import { markNotificationAsRead } from "../controllers/adminController.js";
import { getRecentVendors } from "../controllers/adminController.js";
import {approveVendors} from "../controllers/adminController.js"
import { rejectVendor } from "../controllers/adminController.js";
import { getAdminProfile } from "../controllers/adminController.js";
import { updateAdminProfile } from "../controllers/adminController.js";
import { changeAdminPassword } from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard",authenticate,isSuperAdmin,getDashboardStats);
router.get("/vendors",authenticate, isSuperAdmin,getVendors);
router.get("/pending-approvals",authenticate,isSuperAdmin,getPendingApprovals);
router.get("/notifications",authenticate,isSuperAdmin,getNotifications);
router.patch("/notifications/:id/read",authenticate,isSuperAdmin,markNotificationAsRead);
router.get("/recent-vendors",authenticate,isSuperAdmin,getRecentVendors);
router.patch("/vendors/approve/:id",authenticate,isSuperAdmin,approveVendors);
router.patch("/vendors/reject/:id",authenticate,isSuperAdmin,rejectVendor);
router.get("/profile",authenticate,isSuperAdmin,getAdminProfile);
router.patch("/profile",authenticate,isSuperAdmin,updateAdminProfile);
router.patch("/change-password",authenticate,isSuperAdmin,changeAdminPassword);

export default router;