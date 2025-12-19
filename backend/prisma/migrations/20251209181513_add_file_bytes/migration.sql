-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "fileData" BYTEA,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT,
ALTER COLUMN "value" DROP NOT NULL;
