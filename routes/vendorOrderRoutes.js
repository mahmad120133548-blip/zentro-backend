import express from "express";
import {
  getVendorOrders,
  getVendorOrderById,
  approveVendorOrder,
  rejectVendorOrder,
} from "../controllers/vendorOrderController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { isVendor } from "../middleware/roleMiddleware.js";
import { isApprovedVendor } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authenticate, isVendor,isApprovedVendor, getVendorOrders);

router.get("/:id", authenticate, isVendor,isApprovedVendor, getVendorOrderById);

router.patch( "/:id/approve", authenticate,isVendor,isApprovedVendor,approveVendorOrder);

router.patch( "/:id/reject", authenticate,isVendor,isApprovedVendor, rejectVendorOrder);

export default router;