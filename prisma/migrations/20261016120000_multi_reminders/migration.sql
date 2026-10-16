-- Multiple reminder times per planned activity, in minutes rather than days.
-- Additive: remindDaysBefore is kept and backfilled into the new array, so
-- existing events keep the reminder their owner configured.

ALTER TABLE "CrmPlanEvent" ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CrmPlanEvent" ADD COLUMN "remindOffsets" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "CrmPlanEvent" ADD COLUMN "remindersSent" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Carry every configured reminder across. A day is 1440 minutes; "0 days
-- before" becomes offset 0, meaning "at the start", which is what it meant.
UPDATE "CrmPlanEvent"
   SET "remindOffsets" = ARRAY["remindDaysBefore" * 1440]
 WHERE "remindDaysBefore" IS NOT NULL;

-- An event whose single reminder already fired must not fire again under the
-- new scheme, so mark that offset delivered.
UPDATE "CrmPlanEvent"
   SET "remindersSent" = ARRAY["remindDaysBefore" * 1440]
 WHERE "remindDaysBefore" IS NOT NULL AND "reminderSentAt" IS NOT NULL;

DROP INDEX IF EXISTS "CrmPlanEvent_reminderSentAt_idx";
CREATE INDEX "CrmPlanEvent_date_idx" ON "CrmPlanEvent"("date");
