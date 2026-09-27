import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getHomeProducts } from "../controllers/customerController.js";
import { getAllProducts } from "../controllers/customerController.js";
import { getCategoryProducts } from "../controllers/customerController.js";
import { getProductById } from "../controllers/customerController.js";
import { getVendorStore } from "../controllers/customerController.js";
import { validateCart } from "../controllers/customerController.js";

const router = express.Router();

router.get("/home", getHomeProducts);
router.get("/products",getAllProducts);
router.get("/categories/products/:categorySlug",getCategoryProducts);
router.get("/products/:productId",getProductById);
router.get("/vendors/:vendorId",getVendorStore);
router.post("/cart/validate", authenticate, validateCart);

export default router;