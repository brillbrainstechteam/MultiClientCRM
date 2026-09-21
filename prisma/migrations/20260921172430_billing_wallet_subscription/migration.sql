-- AlterTable
ALTER TABLE "CrmCampaign" ADD COLUMN     "actualCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "costBreakdown" JSONB,
ADD COLUMN     "estimatedCost" DECIMAL(14,4),
ADD COLUMN     "pausedReason" TEXT,
ADD COLUMN     "templateCategory" TEXT;

-- AlterTable
ALTER TABLE "CrmCampaignRecipient" ADD COLUMN     "billed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cost" DECIMAL(12,4),
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "market" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quarterlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "annualPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "features" JSONB,
    "limits" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "cycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'trial',
    "priceSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "graceUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingMode" TEXT NOT NULL DEFAULT 'wallet',
    "balance" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "lowBalanceThreshold" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "balanceAfter" DECIMAL(14,4) NOT NULL,
    "description" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRate" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metaRate" DECIMAL(12,4) NOT NULL,
    "markup" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "customerRate" DECIMAL(12,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageBillingRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "recipient" TEXT NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "campaignId" TEXT,
    "category" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "metaRate" DECIMAL(12,4) NOT NULL,
    "markup" DECIMAL(12,4) NOT NULL,
    "finalRate" DECIMAL(12,4) NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "billingStatus" TEXT NOT NULL DEFAULT 'pending',
    "walletDebit" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "ledgerId" TEXT,
    "rateId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageBillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT NOT NULL DEFAULT 'razorpay',
    "gatewayOrderId" TEXT,
    "gatewayRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "lineItems" JSONB,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_tenantId_key" ON "Wallet"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedger_idempotencyKey_key" ON "WalletLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedger_tenantId_createdAt_idx" ON "WalletLedger"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_walletId_idx" ON "WalletLedger"("walletId");

-- CreateIndex
CREATE INDEX "MessageRate_market_category_effectiveFrom_idx" ON "MessageRate"("market", "category", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "MessageBillingRecord_waMessageId_key" ON "MessageBillingRecord"("waMessageId");

-- CreateIndex
CREATE INDEX "MessageBillingRecord_tenantId_at_idx" ON "MessageBillingRecord"("tenantId", "at");

-- CreateIndex
CREATE INDEX "MessageBillingRecord_tenantId_category_idx" ON "MessageBillingRecord"("tenantId", "category");

-- CreateIndex
CREATE INDEX "MessageBillingRecord_campaignId_idx" ON "MessageBillingRecord"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayRef_key" ON "Payment"("gatewayRef");

-- CreateIndex
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_tenantId_createdAt_idx" ON "NotificationEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_tenantId_readAt_idx" ON "NotificationEvent"("tenantId", "readAt");

-- CreateIndex
CREATE INDEX "CrmCampaignRecipient_campaignId_status_idx" ON "CrmCampaignRecipient"("campaignId", "status");

