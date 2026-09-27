/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Int`.
  - You are about to alter the column `unitPrice` on the `orderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Int`.
  - You are about to alter the column `subtotal` on the `orderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Int`.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `totalAmount` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `orderitem` MODIFY `unitPrice` INTEGER NOT NULL,
    MODIFY `subtotal` INTEGER NOT NULL;
