ALTER TABLE "customers"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "short_code" TEXT;

ALTER TABLE "opportunities"
  ADD COLUMN "code" TEXT;

CREATE INDEX "customers_tenant_id_code_idx"
  ON "customers"("tenant_id", "code");
