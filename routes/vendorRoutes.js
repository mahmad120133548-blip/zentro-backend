import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { isVendor } from "../middleware/roleMiddleware.js";
import { isApprovedVendor } from "../middleware/roleMiddleware.js";
import { getVendorDashboardStats } from "../controllers/vendorController.js";
import { getVendorNotifications } from "../controllers/vendorController.js";
import { markNotificationAsRead } from "../controllers/adminController.js";
import { getVendorStoreStatus } from "../controllers/vendorController.js";
import { updateStoreStatus } from "../controllers/vendorController.js";
import { getVendorStoreInformation } from "../controllers/vendorController.js";
import { updateVendorStoreInformation } from "../controllers/vendorController.js";

const router=express.Router()

router.get("/dashboard/stats",authenticate,isVendor,isApprovedVendor,getVendorDashboardStats);
router.get("/notifications",authenticate,isVendor,isApprovedVendor,getVendorNotifications);
router.patch( "/notifications/:id/read",authenticate,isVendor,isApprovedVendor,markNotificationAsRead);
router.get( "/store-status",authenticate,isVendor,isApprovedVendor,getVendorStoreStatus);
router.patch( "/store-status",authenticate,isVendor,isApprovedVendor,updateStoreStatus);
router.get( "/store-information",authenticate,isVendor,isApprovedVendor,getVendorStoreInformation);
router.patch( "/store-information",authenticate,isVendor,isApprovedVendor,updateVendorStoreInformation);



export default router;