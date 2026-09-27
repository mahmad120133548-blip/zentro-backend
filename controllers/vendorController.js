import prisma from "../config/prisma.js";
export const getVendorDashboardStats = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;

    const totalProducts = await prisma.product.count({
      where: {
        vendorId,
      },
    });

    const totalOrders = await prisma.orderVendor.count({
      where: {
        vendorId,
      },
    });

    const pendingOrders = await prisma.orderVendor.count({
      where: {
        vendorId,
        status: "PENDING",
      },
    });

    const sales = await prisma.orderItem.aggregate({
      _sum: {
        subtotal: true,
      },
      where: {
        orderVendor: {
          vendorId,
          status: "APPROVED",
        },
      },
    });

    const totalSales = sales._sum.subtotal || 0;

    return res.status(200).json({
      totalProducts,
      totalOrders,
      pendingOrders,
      totalSales,
    });
  } 
catch (error) {
  console.error(error);

  return res.status(500).json({
    message: "Something went wrong",
  });
}
};

export const getVendorNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: [
        {
          isRead: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 10,
    });

    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};


export const markVendorNotificationAsRead = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: Number(id),
        user: {
          vendor: {
            id: vendorId,
          },
        },
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      message: "Notification marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to mark notification as read",
    });
  }
};

export const getVendorStoreStatus = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        storeStatus: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      storeStatus: vendor.storeStatus,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to fetch store status",
    });
  }
};

export const updateStoreStatus = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { storeStatus } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(storeStatus)) {
      return res.status(400).json({
        message: "Invalid store status",
      });
    }

    const vendor = await prisma.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        storeStatus,
      },
      select: {
        storeStatus: true,
      },
    });

    return res.status(200).json({
      message: "Store status updated successfully",
      storeStatus: vendor.storeStatus,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update store status",
    });
  }
};

export const getVendorStoreInformation = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        businessName: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      businessName: vendor.businessName,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch store information",
    });
  }
};

export const updateVendorStoreInformation = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { businessName } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        message: "Store name is required",
      });
    }

    const vendor = await prisma.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        businessName: businessName.trim(),
      },
      select: {
        businessName: true,
      },
    });

    return res.status(200).json({
      message: "Store name updated successfully",
      businessName: vendor.businessName,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update store name",
    });
  }
};