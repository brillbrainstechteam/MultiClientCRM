-- Image/video/document header templates carry their media per send, as a public link.
ALTER TABLE "CrmCampaign" ADD COLUMN "headerMediaUrl" TEXT;
ALTER TABLE "CrmCampaign" ADD COLUMN "headerMediaType" TEXT;
