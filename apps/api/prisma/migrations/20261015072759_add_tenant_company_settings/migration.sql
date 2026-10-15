-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'vi',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "tax_code" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';
