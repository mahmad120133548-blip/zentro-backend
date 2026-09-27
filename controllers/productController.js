import prisma from "../config/prisma.js";
import sharp from "sharp";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import cloudinary from "../services/cloudinaryService.js";

export const createProduct = async (req, res) => {
  const processedImages = [];

  try {
    const {
      name,
      sku,
      categoryId,
      price,
      stockQuantity,
      minimumStock,
      description,
    } = req.body;

    if (!name || !sku || !categoryId || !price || !description) {
      return res.status(400).json({
        message: "Name, SKU, category, price or description are required",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        vendorId_sku: {
          vendorId: vendor.id,
          sku,
        },
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        message: "SKU already exists for your store",
      });
    }

    const productStock = Number(stockQuantity) || 0;
const productMinimumStock = Number(minimumStock) || 0;

let stockStatus;

if (productStock === 0) {
  stockStatus = "OUT_OF_STOCK";
} else if (productStock <= productMinimumStock) {
  stockStatus = "LOW_STOCK";
} else {
  stockStatus = "IN_STOCK";
}

    const files = req.files || [];

for (let index = 0; index < files.length; index++) {
  const file = files[index];

  const processedBuffer = await sharp(file.buffer)
    .resize({
      width: 1000,
      height: 1000,
      fit: "contain",
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    })
    .webp({
      quality: 95,
    })
    .toBuffer();

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "zentro/products",
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(processedBuffer);
  });

  processedImages.push({
    imagePath: uploadResult.secure_url,
    isPrimary: index === 0,
    sortOrder: index,
    filePath: null,
  });
}
     
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: Number(categoryId),
        name,
        sku,
        description,
        price: Number(price),
       stockQuantity: productStock,
        minimumStock: productMinimumStock,
    stockStatus,

        images: {
          create: processedImages.map((image) => ({
            imagePath: image.imagePath,
            isPrimary: image.isPrimary,
            sortOrder: image.sortOrder,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } 
} catch (error) {
  return res.status(500).json({
    message: "Failed to create product",
  });
}

export const getAllProducts = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const productsPerPage = 8;

    const search = req.query.search?.trim() || "";
    const stockFilter = req.query.stockFilter || "All";

    const where = {
      vendorId: vendor.id,
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
          },
        },
        {
          sku: {
            contains: search,
          },
        },
      ];
    }

    if (stockFilter === "Out of Stock") {
      where.stockStatus = "OUT_OF_STOCK";
    }

    if (stockFilter === "Low Stock") {
      where.stockStatus = "LOW_STOCK";
    }

    if (stockFilter === "In Stock") {
      where.stockStatus = "IN_STOCK";
    }

    const totalProducts = await prisma.product.count({
      where,
    });

    const totalPages = Math.ceil(
      totalProducts / productsPerPage
    );

    const validPage =
      totalPages > 0 ? Math.min(page, totalPages) : 1;

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: "asc",
      },
      skip: (validPage - 1) * productsPerPage,
      take: productsPerPage,
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    return res.status(200).json({
      products,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalProducts,
        productsPerPage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};
export const getProductById=async(req,res)=>{

    try{
        const vendor=await prisma.vendor.findUnique({
            where:{
                userId:req.user.id
            },
        });

        if(!vendor)
        {
            return res.status(404).json({
                message:"vendor not found"
            });
        }

        const product=await prisma.product.findFirst({
             where: {
        id: Number(req.params.id),
        vendorId: vendor.id,
        },
        include:{
            category:true,
            images:{
                orderBy:{
                    sortOrder:"asc",
                },
            },
        },
        });

        if(!product)
        {
            return res.status(404).json({
                message:"Product not found"
            });
        }

         return res.status(200).json({
         product,
          });
    } 
  
  catch (error)
   {
    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }

}

export const updateProduct = async (req, res) => {
  const processedImages = [];

  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const {
      name,
      sku,
      categoryId,
      price,
      description,
      existingImageIds,
      imageOrder,
    } = req.body;

    if (!name || !sku || !categoryId || !price || !description) {
      return res.status(400).json({
        message: "Name, SKU, category, price and description are required",
      });
    }

    const productId = Number(req.params.id);

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendor.id,
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const duplicateSku = await prisma.product.findFirst({
      where: {
        vendorId: vendor.id,
        sku,
        id: {
          not: productId,
        },
      },
    });

    if (duplicateSku) {
      return res.status(400).json({
        message: "SKU already exists for your store",
      });
    }

    let imageIdsToKeep = [];
    let orderedImageIds = [];

    if (existingImageIds) {
      try {
        imageIdsToKeep = JSON.parse(existingImageIds);
      } catch {
        return res.status(400).json({
          message: "Invalid existing image data",
        });
      }

      if (!Array.isArray(imageIdsToKeep)) {
        return res.status(400).json({
          message: "Invalid existing image data",
        });
      }

      imageIdsToKeep = imageIdsToKeep.map(Number);
    }

    if (imageOrder) {
      try {
        orderedImageIds = JSON.parse(imageOrder);
      } catch {
        return res.status(400).json({
          message: "Invalid image order data",
        });
      }

      if (!Array.isArray(orderedImageIds)) {
        return res.status(400).json({
          message: "Invalid image order data",
        });
      }

      orderedImageIds = orderedImageIds.map(Number);
    } else {
      orderedImageIds = imageIdsToKeep;
    }

    const productImageIds = existingProduct.images.map(
      (image) => image.id
    );

    const invalidImageIds = imageIdsToKeep.filter(
      (id) => !productImageIds.includes(id)
    );

    if (invalidImageIds.length > 0) {
      return res.status(400).json({
        message: "Invalid product image",
      });
    }

    const invalidOrderIds = orderedImageIds.filter(
      (id) => !imageIdsToKeep.includes(id)
    );

    if (invalidOrderIds.length > 0) {
      return res.status(400).json({
        message: "Invalid image order",
      });
    }

    if (orderedImageIds.length !== imageIdsToKeep.length) {
      return res.status(400).json({
        message: "Image order is incomplete",
      });
    }

    const imagesToDelete = existingProduct.images.filter(
      (image) => !imageIdsToKeep.includes(image.id)
    );

 
const files = req.files || [];

for (let index = 0; index < files.length; index++) {
  const file = files[index];

  const processedBuffer = await sharp(file.buffer)
    .resize({
      width: 1000,
      height: 1000,
      fit: "contain",
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    })
    .webp({ quality: 90 })
    .toBuffer();

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "zentro/products",
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(processedBuffer);
  });

  processedImages.push({
    imagePath: uploadResult.secure_url,
    filePath: null,
  });
}

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          name,
          sku,
          categoryId: Number(categoryId),
          price: Number(price),
          description,
        },
      });

      if (imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: {
            id: {
              in: imagesToDelete.map((image) => image.id),
            },
            productId,
          },
        });
      }

      for (let index = 0; index < orderedImageIds.length; index++) {
        await tx.productImage.update({
          where: {
            id: orderedImageIds[index],
          },
          data: {
            sortOrder: index,
            isPrimary: index === 0,
          },
        });
      }

      if (processedImages.length > 0) {
        await tx.productImage.createMany({
          data: processedImages.map((image, index) => ({
            productId,
            imagePath: image.imagePath,
            sortOrder: orderedImageIds.length + index,
            isPrimary:
              orderedImageIds.length === 0 && index === 0,
          })),
        });
      }

      return tx.product.findUnique({
        where: {
          id: productId,
        },
        include: {
          category: true,
          images: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });
    });


    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } 
} catch (error) {
  return res.status(500).json({
    message: "Failed to update product",
  });
}

export const restockProduct = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const productId = Number(req.params.id);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: "Restock quantity must be a positive whole number",
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendor.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const newStockQuantity = product.stockQuantity + quantity;

    let stockStatus;

    if (newStockQuantity === 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (newStockQuantity <= product.minimumStock) {
      stockStatus = "LOW_STOCK";
    } else {
      stockStatus = "IN_STOCK";
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stockQuantity: newStockQuantity,
        stockStatus,
      },
    });

    return res.status(200).json({
      message: "Product restocked successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to restock product",
    });
  }
};


export const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendor.id,
      },
      include: {
        images: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const image of product.images) {
  try {
    if (image.imagePath.startsWith("http")) {
      const urlParts = image.imagePath.split("/upload/");

      if (urlParts.length === 2) {
        const publicIdWithVersion = urlParts[1].replace(/^v\d+\//, "");
        const publicId = publicIdWithVersion.replace(/\.[^/.]+$/, "");

        await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
        });
      }
    } else if (image.imagePath.startsWith("/uploads/")) {
      const localPath = path.join(
        __dirname,
        "..",
        image.imagePath
      );

      await fs.unlink(localPath).catch(() => {});
    }
  } catch {
  }
}

    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
};