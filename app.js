import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import vendorRoutes  from  "./routes/vendorRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import vendorOrderRoutes from "./routes/vendorOrderRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials:true,
    })
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories",categoryRoutes);
app.use("/api/vendor",vendorRoutes);
app.use("/api/vendor/products",productRoutes);
app.use("/api/customer",customerRoutes);
app.use("/api/customer/orders", orderRoutes);
app.use("/api/vendor/orders", vendorOrderRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

export default app;