import express from "express";
import {authenticate} from "../middleware/authMiddleware.js";
import {isVendor} from "../middleware/roleMiddleware.js";
import upload from "../middleware/upload.js";
import { isApprovedVendor } from "../middleware/roleMiddleware.js";
import { getProductById } from "../controllers/productController.js";
import { getAllProducts } from "../controllers/productController.js";
import { createProduct } from "../controllers/productController.js";
import { updateProduct } from "../controllers/productController.js";
import { restockProduct } from "../controllers/productController.js";
import { deleteProduct } from "../controllers/productController.js";

const router=express.Router()

router.post("/",authenticate,isVendor,isApprovedVendor, upload.array("images"),createProduct);
router.get("/",authenticate,isVendor,isApprovedVendor,getAllProducts);
router.get("/:id",authenticate,isVendor,isApprovedVendor,getProductById);
router.put("/:id",authenticate,isVendor,isApprovedVendor,upload.array("images"),updateProduct);
router.patch("/restock/:id",authenticate,isVendor,isApprovedVendor,restockProduct);
router.delete("/delete/:id", authenticate, isVendor,isApprovedVendor, deleteProduct);
export default router;