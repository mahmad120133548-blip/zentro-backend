import prisma from "../config/prisma.js";

export const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      message: "Access denied",
    });
  }

  next();
};

export const isVendor = (req, res, next) => {
  if (req.user.role !== "VENDOR") {
    return res.status(403).json({
      message: "Access denied",
    });
  }

  next();
};

export const isApprovedVendor = async (req, res, next) => {
  try {
    if (req.user.role !== "VENDOR") {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        approvalStatus: true,
      },
    });

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor profile not found",
      });
    }

    if (vendor.approvalStatus !== "APPROVED") {
      return res.status(403).json({
        message: "Vendor account is not approved",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};