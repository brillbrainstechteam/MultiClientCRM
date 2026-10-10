-- Plan-event reminders + per-user notification targeting.
ALTER TABLE "CrmPlanEvent" ADD COLUMN "remindDaysBefore" INTEGER;
ALTER TABLE "CrmPlanEvent" ADD COLUMN "assigneeUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CrmPlanEvent" ADD COLUMN "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CrmPlanEvent" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE INDEX "CrmPlanEvent_reminderSentAt_idx" ON "CrmPlanEvent"("reminderSentAt");

ALTER TABLE "NotificationEvent" ADD COLUMN "userId" TEXT;
CREATE INDEX "NotificationEvent_tenantId_userId_idx" ON "NotificationEvent"("tenantId", "userId");
