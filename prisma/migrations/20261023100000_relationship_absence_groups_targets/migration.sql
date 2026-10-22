-- PRD §8 Relationship Team, §23 Absence & Coverage, §9.2 External Groups,
-- §19 Gram Targets. Additive throughout: six new tables plus three nullable
-- columns on the existing order tables, so this is safe on live data.

CREATE TABLE "CrmRelationshipMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'backup',
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmRelationshipMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmRelationshipMember_contactId_userId_key" ON "CrmRelationshipMember"("contactId", "userId");
CREATE INDEX "CrmRelationshipMember_tenantId_contactId_idx" ON "CrmRelationshipMember"("tenantId", "contactId");
CREATE INDEX "CrmRelationshipMember_tenantId_userId_idx" ON "CrmRelationshipMember"("tenantId", "userId");

CREATE TABLE "CrmAbsence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'leave',
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "coveredByUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAbsence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmAbsence_tenantId_userId_idx" ON "CrmAbsence"("tenantId", "userId");
CREATE INDEX "CrmAbsence_tenantId_startsAt_idx" ON "CrmAbsence"("tenantId", "startsAt");

CREATE TABLE "CrmCoverageEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "absenceId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "coveringUserId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCoverageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmCoverageEvent_tenantId_ownerUserId_idx" ON "CrmCoverageEvent"("tenantId", "ownerUserId");
CREATE INDEX "CrmCoverageEvent_tenantId_coveringUserId_idx" ON "CrmCoverageEvent"("tenantId", "coveringUserId");
CREATE INDEX "CrmCoverageEvent_absenceId_idx" ON "CrmCoverageEvent"("absenceId");

CREATE TABLE "CrmExternalGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "zoneId" TEXT,
    "whatsappNumberId" TEXT,
    "primaryUserId" TEXT,
    "backupUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "managerUserId" TEXT,
    "inviteLink" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastManualUpdateAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmExternalGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmExternalGroup_tenantId_contactId_idx" ON "CrmExternalGroup"("tenantId", "contactId");
CREATE INDEX "CrmExternalGroup_tenantId_status_idx" ON "CrmExternalGroup"("tenantId", "status");

CREATE TABLE "CrmExternalGroupLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'update',
    "text" TEXT,
    "fileId" TEXT,
    "byUserId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmExternalGroupLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmExternalGroupLog_groupId_at_idx" ON "CrmExternalGroupLog"("groupId", "at");
CREATE INDEX "CrmExternalGroupLog_tenantId_idx" ON "CrmExternalGroupLog"("tenantId");

ALTER TABLE "CrmExternalGroupLog" ADD CONSTRAINT "CrmExternalGroupLog_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "CrmExternalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CrmGramTarget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "targetGrams" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "setByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmGramTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmGramTarget_tenantId_userId_period_key" ON "CrmGramTarget"("tenantId", "userId", "period");
CREATE INDEX "CrmGramTarget_tenantId_period_idx" ON "CrmGramTarget"("tenantId", "period");

CREATE TABLE "CrmActivityTarget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "period" TEXT,
    "setByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmActivityTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmActivityTarget_tenantId_userId_kind_period_key" ON "CrmActivityTarget"("tenantId", "userId", "kind", "period");
CREATE INDEX "CrmActivityTarget_tenantId_kind_idx" ON "CrmActivityTarget"("tenantId", "kind");

-- Orders carry weight so a gram target can be measured at all.
ALTER TABLE "CrmOrderItem" ADD COLUMN "grams" DOUBLE PRECISION;
ALTER TABLE "CrmOrder" ADD COLUMN "totalGrams" DOUBLE PRECISION;
ALTER TABLE "CrmOrder" ADD COLUMN "countsTowardTarget" BOOLEAN NOT NULL DEFAULT true;
