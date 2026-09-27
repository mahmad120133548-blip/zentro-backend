import express from "express";
import { login } from "../controllers/authController.js";
import { logout } from "../controllers/authController.js";
import { getMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { vendorRegister } from "../controllers/authController.js";
import { customerRegister } from "../controllers/authController.js";
const router=express.Router();

router.post("/login",login);
router.post("/logout", logout);
router.post("/vendor-register", vendorRegister);
router.get("/me",authenticate,getMe);
router.post("/customer/register",customerRegister);

export default router;