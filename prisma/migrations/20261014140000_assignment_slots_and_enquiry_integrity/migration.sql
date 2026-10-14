-- ---------------------------------------------------------------------------
-- 1. Second named owner slot on the contact.
--    ownerId stays the sales owner (and the primary visibility key);
--    marketingOwnerId is the second slot. Two fixed columns rather than a join
--    table so scoping stays one indexed OR instead of a subquery per read.
-- ---------------------------------------------------------------------------
ALTER TABLE "CrmContact" ADD COLUMN IF NOT EXISTS "marketingOwnerId" TEXT;

CREATE INDEX IF NOT EXISTS "CrmContact_tenantId_marketingOwnerId_idx"
  ON "CrmContact"("tenantId", "marketingOwnerId");

-- ---------------------------------------------------------------------------
-- 2. Optional mobile login identifier.
--    E.164 without the '+', so formatting cannot defeat the unique index.
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- ---------------------------------------------------------------------------
-- 3. Enquiry integrity. A contact may have many enquiries; what was missing is
--    anything stopping a bad contactId and anything stopping a repeated
--    enquiry number (it was generated from a row COUNT, so it repeated after
--    any delete). Repair first, then constrain.
-- ---------------------------------------------------------------------------

-- 3a. Detach enquiries pointing at a contact that no longer exists, so the
--     foreign key can be added without dropping the enquiry itself.
UPDATE "CrmEnquiry" e
   SET "contactId" = NULL
 WHERE e."contactId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "CrmContact" c WHERE c."id" = e."contactId");

-- 3b. Renumber duplicates within a tenant, keeping the oldest row's number.
WITH dupes AS (
  SELECT "id",
         "enquiryNo",
         ROW_NUMBER() OVER (PARTITION BY "tenantId", "enquiryNo" ORDER BY "createdAt", "id") AS rn
    FROM "CrmEnquiry"
)
UPDATE "CrmEnquiry" e
   SET "enquiryNo" = e."enquiryNo" || '-D' || d.rn
  FROM dupes d
 WHERE d."id" = e."id"
   AND d.rn > 1;

ALTER TABLE "CrmEnquiry"
  ADD CONSTRAINT "CrmEnquiry_tenantId_enquiryNo_key" UNIQUE ("tenantId", "enquiryNo");

ALTER TABLE "CrmEnquiry"
  ADD CONSTRAINT "CrmEnquiry_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
