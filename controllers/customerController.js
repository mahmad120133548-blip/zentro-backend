import prisma from "../config/prisma.js";

export const getHomeProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        vendor: {
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        },
      },
      include: {
        images: {
          where: {
            isPrimary: true,
          },
          take: 1,
        },
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    });

    return res.status(200).json({
      products,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};



export const getAllProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 15;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where: {
          vendor: {
            approvalStatus: "APPROVED",
            storeStatus: "ACTIVE",
          },
        },
        include: {
          images: {
            where: {
              isPrimary: true,
            },
            take: 1,
          },
          category: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.product.count({
        where: {
          vendor: {
            approvalStatus: "APPROVED",
            storeStatus: "ACTIVE",
          },
        },
      }),
    ]);

    const hasMore = skip + products.length < totalProducts;

    return res.status(200).json({
      products,
      currentPage: page,
      hasMore,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

export const getCategoryProducts = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const category = await prisma.category.findUnique({
      where: {
        slug: categorySlug,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const where = {
      categoryId: category.id,
      vendor: {
        approvalStatus: "APPROVED",
        storeStatus: "ACTIVE",
      },
    };

    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          category: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.product.count({
        where,
      }),
    ]);

    return res.status(200).json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
      },
      products,
      currentPage: page,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      hasMore: page < Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch category products",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id: Number(productId),
        vendor: {
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        },
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const getVendorStore = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: Number(vendorId),
        approvalStatus: "APPROVED",
        storeStatus: "ACTIVE",
      },
      select: {
        id: true,
        businessName: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Store not found",
      });
    }

    const where = {
      vendorId: Number(vendorId),
    };

    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.product.count({
        where,
      }),
    ]);

    return res.status(200).json({
      vendor,
      products,
      currentPage: page,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      hasMore: page < Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch store",
    });
  }
};

export const validateCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.productId)) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          message: "Invalid cart items",
        });
      }
    }

    const productIds = items.map((item) => Number(item.productId));

    const uniqueProductIds = [...new Set(productIds)];

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
        vendor: {
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        },
      },
      include: {
        images: {
          where: {
            isPrimary: true,
          },
          take: 1,
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({
        message: "One or more products are no longer available",
      });
    }

    const validatedItems = [];

    for (const item of items) {
      const product = products.find(
        (product) => product.id === Number(item.productId)
      );

      const quantity = Number(item.quantity);

      if (quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `${product.name} does not have enough stock`,
        });
      }

      validatedItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity,
        subtotal: product.price * quantity,
        stockQuantity: product.stockQuantity,
        image: product.images[0]?.imagePath || null,
        vendor: product.vendor,
      });
    }

    const subtotal = validatedItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );

    const delivery = subtotal > 0 ? 200 : 0;

    const total = subtotal + delivery;

    return res.status(200).json({
      items: validatedItems,
      subtotal,
      delivery,
      total,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to validate cart",
    });
  }
};