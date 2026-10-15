-- Real SLA, favourites, blocked, and saved views.
--
-- SLA was hardcoded to "ok" in the UI mapper, so the Overdue and SLA Breached
-- views could never match anything and the "SLA urgent" sort was meaningless.
-- awaitingSince is the fact that makes them real: when the oldest unanswered
-- customer message arrived.
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "awaitingSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAgentReplyAt" TIMESTAMP(3);

-- "Who is waiting longest" is the query the whole SLA view is built on.
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_awaitingSince_idx"
  ON "Conversation"("tenantId", "awaitingSince");

-- Backfill from what we already know: a thread whose last message came from the
-- customer is waiting on us, and it has been waiting since that message.
UPDATE "Conversation" c
   SET "awaitingSince" = sub."at"
  FROM (
    SELECT DISTINCT ON (m."conversationId") m."conversationId", m."at", m."direction"
      FROM "Message" m
     WHERE m."isHistorical" = false
     ORDER BY m."conversationId", m."at" DESC
  ) sub
 WHERE sub."conversationId" = c."id"
   AND sub."direction" = 'inbound'
   AND c."awaitingSince" IS NULL;

UPDATE "Conversation" c
   SET "lastAgentReplyAt" = sub."at"
  FROM (
    SELECT m."conversationId", MAX(m."at") AS "at"
      FROM "Message" m
     WHERE m."direction" = 'outbound' AND m."isHistorical" = false
     GROUP BY m."conversationId"
  ) sub
 WHERE sub."conversationId" = c."id"
   AND c."lastAgentReplyAt" IS NULL;

-- Starring is personal: in a shared inbox, one agent's shortlist is not
-- everyone's.
CREATE TABLE IF NOT EXISTS "ConversationFavourite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationFavourite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationFavourite_conversationId_userId_key"
  ON "ConversationFavourite"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "ConversationFavourite_tenantId_userId_idx"
  ON "ConversationFavourite"("tenantId", "userId");
ALTER TABLE "ConversationFavourite"
  ADD CONSTRAINT "ConversationFavourite_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Saved filter combinations, e.g. "hot leads waiting over a day".
CREATE TABLE IF NOT EXISTS "CrmSavedView" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerId" TEXT,
  "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmSavedView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmSavedView_tenantId_ownerId_idx" ON "CrmSavedView"("tenantId", "ownerId");
