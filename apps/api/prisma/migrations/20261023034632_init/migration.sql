-- AlterTable
ALTER TABLE "project_files" ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "preview_name" TEXT,
ALTER COLUMN "opportunity_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "prospect_email" TEXT,
ADD COLUMN     "prospect_name" TEXT,
ADD COLUMN     "prospect_phone" TEXT,
ALTER COLUMN "opportunity_id" DROP NOT NULL,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bank_account" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "bank_owner" TEXT,
ADD COLUMN     "director_name" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "quote_notes" TEXT,
ADD COLUMN     "quote_terms" TEXT,
ADD COLUMN     "quote_unit" TEXT DEFAULT 'Gói',
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE INDEX "project_files_tenant_id_customer_id_idx" ON "project_files"("tenant_id", "customer_id");

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
