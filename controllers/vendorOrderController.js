
import prisma from "../config/prisma.js";

export const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;

    const { search = "", status = "All" } = req.query;

    const orders = await prisma.orderVendor.findMany({
      where: {
        vendorId,
        ...(status !== "All" && {
          status: status.toUpperCase(),
        }),
        ...(search && {
          order: {
            OR: [
              {
                orderNumber: {
                  contains: search,
                },
              },
              {
                customerName: {
                  contains: search,
                },
              },
              {
                customerEmail: {
                  contains: search,
                },
              },
            ],
          },
        }),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            city: true,
            shippingAddress: true,
            createdAt: true,
            status: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOrders = orders.map((orderVendor) => {
      const total = orderVendor.orderItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      return {
        id: orderVendor.id,
        orderId: orderVendor.order.id,
        orderNumber: orderVendor.order.orderNumber,
        customer: orderVendor.order.customerName,
        email: orderVendor.order.customerEmail,
        phone: orderVendor.order.customerPhone,
        products: orderVendor.orderItems.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal,
        })),
        total,
        date: orderVendor.createdAt,
        status: orderVendor.status,
        shipping: {
          city: orderVendor.order.city,
          address: orderVendor.order.shippingAddress,
        },
      };
    });

    return res.status(200).json({
      orders: formattedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getVendorOrderById = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;

    const orderVendor = await prisma.orderVendor.findFirst({
      where: {
        id: Number(id),
        vendorId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            city: true,
            shippingAddress: true,
            createdAt: true,
            status: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                images: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!orderVendor) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const total = orderVendor.orderItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    return res.status(200).json({
      order: {
        id: orderVendor.id,
        orderId: orderVendor.order.id,
        orderNumber: orderVendor.order.orderNumber,
        customer: {
          name: orderVendor.order.customerName,
          email: orderVendor.order.customerEmail,
          phone: orderVendor.order.customerPhone,
        },
        shipping: {
          city: orderVendor.order.city,
          address: orderVendor.order.shippingAddress,
        },
        products: orderVendor.orderItems.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal,
          image: item.product.images[0]?.imagePath || null,
        })),
        total,
        status: orderVendor.status,
        date: orderVendor.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const approveVendorOrder = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;

    const orderVendor = await prisma.orderVendor.findFirst({
      where: {
        id: Number(id),
        vendorId,
      },
      include: {
        order: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderVendor) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (orderVendor.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending orders can be approved",
      });
    }

    for (const item of orderVendor.orderItems) {
      if (item.product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    await prisma.$transaction(async (transaction) => {
      for (const item of orderVendor.orderItems) {
        const newStock = item.product.stockQuantity - item.quantity;

        let stockStatus = "IN_STOCK";

        if (newStock <= 0) {
          stockStatus = "OUT_OF_STOCK";
        } else if (newStock <= item.product.minimumStock) {
          stockStatus = "LOW_STOCK";
        }

        await transaction.product.update({
          where: {
            id: item.product.id,
          },
          data: {
            stockQuantity: newStock,
            stockStatus,
          },
        });
      }

      await transaction.orderVendor.update({
        where: {
          id: orderVendor.id,
        },
        data: {
          status: "APPROVED",
        },
      });
    });

    return res.status(200).json({
      message: "Order approved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const rejectVendorOrder = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;

    const orderVendor = await prisma.orderVendor.findFirst({
      where: {
        id: Number(id),
        vendorId,
      },
    });

    if (!orderVendor) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (orderVendor.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending orders can be rejected",
      });
    }

    await prisma.orderVendor.update({
      where: {
        id: orderVendor.id,
      },
      data: {
        status: "REJECTED",
      },
    });

    return res.status(200).json({
      message: "Order rejected successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

