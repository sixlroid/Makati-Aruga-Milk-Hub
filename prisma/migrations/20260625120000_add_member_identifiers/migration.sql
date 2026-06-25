-- AlterTable
ALTER TABLE "Member_Profiles"
ADD COLUMN "dtn" TEXT,
ADD COLUMN "rtn" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_Profiles_dtn_key" ON "Member_Profiles"("dtn");

-- CreateIndex
CREATE UNIQUE INDEX "Member_Profiles_rtn_key" ON "Member_Profiles"("rtn");
