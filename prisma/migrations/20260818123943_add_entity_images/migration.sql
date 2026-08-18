-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "logoUrl" TEXT;

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
