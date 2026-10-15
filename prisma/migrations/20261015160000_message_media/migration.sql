-- Media, location, quoted replies and delivery detail on a message.
--
-- Inbound photos and documents were stored as the literal text "[image]" —
-- for a jeweller whose customers send pictures of designs all day, the most
-- used message type in the product did not exist. Delivery timestamps and
-- failure reasons arrived on the statuses webhook and were discarded too.
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "mediaFileId" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaId" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "replyToWaId" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureCode" TEXT,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

-- Retrying a failed download means finding messages that have Meta's id but no
-- stored file.
CREATE INDEX IF NOT EXISTS "Message_mediaId_idx" ON "Message"("mediaId");
