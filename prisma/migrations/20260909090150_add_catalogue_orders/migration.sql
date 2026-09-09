-- CreateTable
CREATE TABLE "CrmCatalogueItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "subCategory" TEXT,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "variants" JSONB,
    "size" TEXT,
    "weight" TEXT,
    "material" TEXT,
    "purity" TEXT,
    "colour" TEXT,
    "attributes" JSONB,
    "grossWeight" TEXT,
    "netWeight" TEXT,
    "stoneWeight" TEXT,
    "stoneDetails" TEXT,
    "karat" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'fixed',
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stockStatus" TEXT NOT NULL DEFAULT 'available',
    "moq" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "collection" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'order',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contactId" TEXT,
    "company" TEXT,
    "contactPerson" TEXT,
    "discount" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "salesOwnerId" TEXT,
    "deliveryDetails" TEXT,
    "notes" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'crm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "catalogueItemId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "lineTotal" DOUBLE PRECISION,

    CONSTRAINT "CrmOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmCatalogueItem_tenantId_idx" ON "CrmCatalogueItem"("tenantId");

-- CreateIndex
CREATE INDEX "CrmCatalogueItem_tenantId_active_idx" ON "CrmCatalogueItem"("tenantId", "active");

-- CreateIndex
CREATE INDEX "CrmOrder_tenantId_idx" ON "CrmOrder"("tenantId");

-- CreateIndex
CREATE INDEX "CrmOrder_tenantId_status_idx" ON "CrmOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmOrder_tenantId_contactId_idx" ON "CrmOrder"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmOrder_tenantId_orderNo_key" ON "CrmOrder"("tenantId", "orderNo");

-- CreateIndex
CREATE INDEX "CrmOrderItem_orderId_idx" ON "CrmOrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "CrmOrderItem" ADD CONSTRAINT "CrmOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CrmOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
