-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

