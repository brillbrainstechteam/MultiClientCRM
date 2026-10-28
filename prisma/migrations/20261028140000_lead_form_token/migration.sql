-- Public lead-capture form: one shareable form per tenant.
ALTER TABLE "Tenant" ADD COLUMN "leadFormToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "leadFormEnabled" BOOLEAN NOT NULL DEFAULT true;

-- The token is the only secret in the public URL, so it must be unique.
CREATE UNIQUE INDEX "Tenant_leadFormToken_key" ON "Tenant"("leadFormToken");
