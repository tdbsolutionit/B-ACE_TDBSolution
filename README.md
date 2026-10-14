# B-ACE SME

CRM nội bộ, chuẩn bị cho multi-tenant. Giao diện port từ B-ACE SME. Stack: Next.js, NestJS, PostgreSQL.

## Chạy local

Cần Node 20 trở lên (`nvm use` nếu có nvm) và Docker Desktop.

```bash
git clone https://github.com/tdbsolutionit/B-ACE_TDBSolution.git
cd B-ACE_TDBSolution
cp .env.example .env
docker compose up -d postgres
npm install
npm run build -w @bace/shared
npm run db:generate
npm run db:migrate
npm run db:seed
```

Mở hai terminal trong cùng thư mục:

```bash
npm run dev:api
npm run dev:web
```

Web: http://localhost:3000  
API: http://localhost:3001/api  
OpenAPI: http://localhost:3001/docs  

Đăng nhập demo: `admin@b-ace.vn` / `password`  
Sales thử phạm vi dữ liệu riêng: `lan@b-ace.vn` / `password`

## Đã có trong bản này

CRM chạy trên PostgreSQL, không còn dữ liệu mẫu trên giao diện.

- Khách hàng: tạo, sửa, ghi chú, chuyển cá nhân sang doanh nghiệp, cảnh báo trùng số điện thoại hoặc email, nhập CSV.
- Dự án: menu riêng, pipeline kéo thả theo giai đoạn, lý do khi thua, tệp tải lên xem và tải xuống.
- Báo giá: sửa từng hạng mục, xuất PDF qua hộp in của trình duyệt.
- Công việc và lịch dùng chung một nguồn. Chuông nhắc việc quá hạn, hôm nay và ngày mai, có rung và tiếng chuông.
- Sales chỉ thấy hồ sơ được giao. Admin và quản lý thấy cả tenant.
- Tìm kiếm khách, dự án và báo giá. Nhật ký cuộc gọi, cuộc họp và ghi chú.

Postgres map cổng **5433** để tránh đụng Postgres local đang chiếm 5432.

## Tenant

Mọi query nghiệp vụ đi qua `scope(tenantId)` và `PrismaService.withTenant`. `tenant_id` lấy từ JWT, không hard-code một tenant. Phase 1 seed một tenant `bace-internal`. RLS nằm ở `apps/api/prisma/rls.sql` như lớp bảo vệ thêm.

Redis và BullMQ chưa bật. Chỉ thêm khi có job thật (email, import, đồng bộ API).

## Module

- `apps/web` — shell, đăng nhập, tổng quan, khách hàng, Kanban cơ hội, công việc, lịch, báo cáo, báo giá, người dùng
- `apps/api` — auth JWT, RBAC, customers, opportunities, quotes, users, tasks, dashboard
- `packages/shared` — Zod và công thức giá báo giá
