-- CreateTable
CREATE TABLE "CrmBranch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "CrmBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL,
    "qualityRating" TEXT NOT NULL,
    "messagingLimit" TEXT NOT NULL,
    "permittedRoles" TEXT[],

    CONSTRAINT "CrmNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "CrmTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "permittedWhatsAppNumberIds" TEXT[],
    "availability" TEXT NOT NULL,

    CONSTRAINT "CrmUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "tags" TEXT[],
    "source" TEXT NOT NULL,
    "consent" TEXT NOT NULL,
    "salesTier" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "primaryWhatsAppNumberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmBranch_tenantId_idx" ON "CrmBranch"("tenantId");

-- CreateIndex
CREATE INDEX "CrmNumber_tenantId_idx" ON "CrmNumber"("tenantId");

-- CreateIndex
CREATE INDEX "CrmTeam_tenantId_idx" ON "CrmTeam"("tenantId");

-- CreateIndex
CREATE INDEX "CrmUser_tenantId_idx" ON "CrmUser"("tenantId");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_idx" ON "CrmContact"("tenantId");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_stage_idx" ON "CrmContact"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_ownerId_idx" ON "CrmContact"("tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmContact_tenantId_mobile_key" ON "CrmContact"("tenantId", "mobile");
