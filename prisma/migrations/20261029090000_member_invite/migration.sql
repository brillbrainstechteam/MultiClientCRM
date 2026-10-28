-- Self-serve team invite: member sets their own password via a secure link.
ALTER TABLE "User" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "User" ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");
