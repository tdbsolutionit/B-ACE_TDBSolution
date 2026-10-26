-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hashed_refresh_token" TEXT,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
