import prisma from "../../config/prisma.js";

const updateProductStockStatus = async () => {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      stockQuantity: true,
      minimumStock: true,
    },
  });

  for (const product of products) {
    let stockStatus;

    if (product.stockQuantity === 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (product.stockQuantity <= product.minimumStock) {
      stockStatus = "LOW_STOCK";
    } else {
      stockStatus = "IN_STOCK";
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { stockStatus },
    });
  }

  await prisma.$disconnect();
};

updateProductStockStatus();