# Hướng dẫn Deploy B-ACE CRM

Tài liệu này hướng dẫn quy trình làm việc với Git, cách release version, và cách hệ thống tự động deploy lên server production.

---

## 📌 Tóm tắt nhanh

| Việc | Lệnh |
| :--- | :--- |
| Lưu code hàng ngày | `git add . && git commit -m "..." && git push` |
| Release version mới | `git tag v1.0.0 && git push origin v1.0.0` |
| Xem danh sách version | `git tag -l` |
| Quay về version cũ | `git checkout v1.0.0` |

---

## 🔄 QUY TRÌNH LÀM VIỆC HÀNG NGÀY

### 1. Trước khi code — luôn pull code mới nhất

```bash
cd B-ACE_TDBSolution
git checkout main
git pull origin main
```

### 2. Code tính năng mới

```bash
# Tạo branch riêng cho tính năng (khuyến nghị)
git checkout -b feature/ten-tinh-nang

# Code... code... code...

# Xem file đã thay đổi
git status
git diff
```

### 3. Commit code

```bash
# Add tất cả file đã sửa
git add .

# Hoặc chỉ add file cụ thể
git add apps/api/src/modules/xxx.module.ts

# Commit với message rõ ràng
git commit -m "feat(customers): thêm chức năng import Excel"
```

**Quy tắc đặt commit message:**

| Prefix | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- |
| `feat` | Thêm tính năng mới | `feat(deals): thêm Kanban view` |
| `fix` | Sửa bug | `fix(auth): sửa lỗi token hết hạn` |
| `chore` | Việc lặt vặt, không ảnh hưởng chức năng | `chore: update dependencies` |
| `refactor` | Refactor code | `refactor(api): tách service` |
| `docs` | Cập nhật tài liệu | `docs: thêm hướng dẫn deploy` |
| `ci` | Cập nhật CI/CD | `ci: thêm bước test` |

### 4. Push lên GitHub

```bash
# Nếu đang ở branch riêng
git push origin feature/ten-tinh-nang

# Nếu code trực tiếp trên main
git push origin main
```

### 5. Merge vào main (nếu làm branch riêng)

```bash
git checkout main
git pull origin main
git merge feature/ten-tinh-nang
git push origin main

# Xóa branch đã merge (không bắt buộc)
git branch -d feature/ten-tinh-nang
git push origin --delete feature/ten-tinh-nang
```

---

## 🚀 QUY TRÌNH RELEASE VERSION (QUAN TRỌNG)

### Điều kiện tiên quyết

⚠️ **CHỈ TẠO TAG khi:**
- Code đã merge vào `main`
- Đã test kỹ trên máy dev
- CI trên GitHub Actions đã **xanh** (không có lỗi)
- Không có bug nghiêm trọng đang tồn tại

### Cách tạo version mới

**Bước 1:** Đảm bảo đang ở `main` và code mới nhất:

```bash
git checkout main
git pull origin main
git log --oneline -3    # Xem 3 commit gần nhất
```

**Bước 2:** Tạo tag với version mới:

```bash
# Cú pháp: v<số chính>.<số phụ>.<số vá>
git tag v1.0.0
```

**Bước 3:** Push tag lên GitHub:

```bash
git push origin v1.0.0
```

**Bước 4:** Theo dõi deploy trên GitHub Actions:

Mở browser: `https://github.com/tdbsolutionit/B-ACE_TDBSolution/actions`

→ Workflow **"Deploy to Production"** sẽ chạy tự động
→ Chờ 3-5 phút
→ Thấy dấu ✅ xanh là **deploy thành công**

---

## 📖 QUY TẮC ĐẶT VERSION (Semantic Versioning)

Format: **`v<MAJOR>.<MINOR>.<PATCH>`**

| Loại | Khi nào tăng | Ví dụ |
| :--- | :--- | :--- |
| **MAJOR** | Thay đổi lớn, breaking change | `v1.0.0` → `v2.0.0` |
| **MINOR** | Thêm tính năng mới (tương thích ngược) | `v1.0.0` → `v1.1.0` |
| **PATCH** | Sửa bug nhỏ | `v1.0.0` → `v1.0.1` |

### Ví dụ theo giai đoạn dự án

```
v0.1.0    ← Bản thử nghiệm đầu tiên
v0.2.0    ← Thêm tính năng RBAC
v0.3.0    ← Thêm Team + Pipeline
v0.3.1    ← Sửa bug phân quyền
v0.3.2    ← Sửa bug hiển thị ngày tháng
v1.0.0    ← Bản chính thức đầu tiên, dùng được cho khách
v1.1.0    ← Thêm tính năng Báo cáo
v1.1.1    ← Sửa bug báo cáo
v2.0.0    ← Đổi cấu trúc DB, không tương thích với v1
```

---

## 🔍 CÁC LỆNH TAG THƯỜNG DÙNG

### Xem tất cả tag

```bash
git tag -l

# Xem theo pattern
git tag -l "v1.*"          # Tất cả v1.x.x
git tag -l "v1.0.*"        # Tất cả v1.0.x
```

### Xem chi tiết 1 tag

```bash
git show v1.0.0
```

### Xem tag nào đang ở commit nào

```bash
git log --oneline --decorate -10
```

### Xóa tag (nếu lỡ tạo sai)

```bash
# Xóa ở local
git tag -d v1.0.0

# Xóa trên GitHub (bắt buộc nếu đã push)
git push origin --delete v1.0.0
```

⚠️ **Lưu ý:** Xóa tag **KHÔNG rollback code** trên server. Nếu đã deploy version lỗi, xem phần **Rollback** bên dưới.

---

## 🔙 ROLLBACK — QUAY VỀ VERSION CŨ KHI CÓ BUG

### Kịch bản: v1.1.0 có bug, muốn quay về v1.0.0

**Bước 1:** RDP vào server (hoặc SSH nếu có)

**Bước 2:** Stop PM2:

```powershell
pm2 stop all
```

**Bước 3:** Vào folder project và checkout version cũ:

```powershell
cd C:\apps\bace-crm
git fetch --tags
git checkout v1.0.0
```

**Bước 4:** Cài deps + build lại:

```powershell
npm install
npm run build -w @bace/shared
npm run build -w @bace/api
npm run build -w @bace/web
```

**Bước 5:** Start lại:

```powershell
pm2 start all
pm2 status
```

**Bước 6:** Verify:

```powershell
curl.exe -I http://localhost:3000
```

### Sau khi rollback — quay về main để phát triển tiếp

Sau khi fix bug xong và muốn deploy version mới:

```powershell
cd C:\apps\bace-crm
git checkout main
git pull origin main
# Chờ workflow tự deploy khi push tag mới
```

---

## 🌐 TRUY CẬP HỆ THỐNG

### Cho nhân viên

| Dịch vụ | URL |
| :--- | :--- |
| **CRM Web** | `http://192.168.103.8:3000` |
| **API Docs** | `http://192.168.103.8:3001/api` (Swagger) |

### Tài khoản mặc định

- **Email:** `admin@b-ace.vn`
- **Password:** `password` ⚠️ Đổi ngay sau lần đăng nhập đầu tiên!

---

## 🔧 CÁC LỆNH VẬN HÀNH TRÊN SERVER

### Xem trạng thái app

```powershell
pm2 status
```

### Xem log realtime

```powershell
pm2 logs
```

### Xem log 50 dòng cuối

```powershell
pm2 logs --lines 50
```

### Restart app (không đổi code)

```powershell
pm2 restart all
```

### Stop app

```powershell
pm2 stop all
```

### Xem dung lượng RAM/CPU đang dùng

```powershell
pm2 monit
```

---

## 🛠️ TROUBLESHOOTING

### Vấn đề: Workflow deploy fail

**Bước 1:** Vào GitHub → Actions → Click workflow fail
**Bước 2:** Xem bước nào đỏ → click vào để xem log
**Bước 3:** Fix và push lại

**Lỗi thường gặp:**

| Lỗi | Nguyên nhân | Fix |
| :--- | :--- | :--- |
| `Runner not found` | Task Scheduler runner đã tắt | Mở Task Scheduler → Start `GitHubActionsRunner` |
| `EPERM: operation not permitted` | PM2 giữ file lock | `pm2 kill` trên server |
| `fatal: Not possible to fast-forward` | Code trên server bị thay đổi | `git reset --hard HEAD` trên server |
| `P3009: migrate found failed migrations` | Migration trước fail | Xem hướng dẫn riêng Prisma |

### Vấn đề: Web không load sau deploy

**Bước 1:** SSH/RDP vào server
**Bước 2:**
```powershell
pm2 logs bace-web --lines 50
```
**Bước 3:** Xem lỗi cụ thể → fix

### Vấn đề: Không truy cập được từ máy khác trong LAN

**Check 1:** Firewall có mở port 3000/3001?
```powershell
Get-NetFirewallRule -DisplayName "BACE CRM*"
```

**Check 2:** App có đang chạy không?
```powershell
pm2 status
```

**Check 3:** IP server có đúng không?
```powershell
ipconfig | findstr IPv4
```

---

## 📞 LIÊN HỆ KHI CÓ SỰ CỐ

| Vấn đề | Liên hệ |
| :--- | :--- |
| Deploy fail | Dev lead |
| Không truy cập được | IT support |
| Bug chức năng | Dev team |
| Database | Dev lead |

---

## 📋 CHECKLIST TRƯỚC KHI RELEASE

Trước khi tạo tag version mới, tick hết các mục sau:

- [ ] Code đã merge vào `main`
- [ ] CI trên GitHub Actions **xanh**
- [ ] Đã test trên máy dev: login, tạo/sửa/xóa customer, tạo deal
- [ ] Không có `console.log` rác trong code
- [ ] `apps/api/.env` và `apps/web/.env.production` trên server **không bị thay đổi**
- [ ] Đã backup DB (nếu version có migration mới)
- [ ] Thông báo cho team biết sắp release version X.Y.Z

---

## 🔗 LIÊN KẾT HỮU ÍCH

- **GitHub Repo:** https://github.com/tdbsolutionit/B-ACE_TDBSolution
- **GitHub Actions:** https://github.com/tdbsolutionit/B-ACE_TDBSolution/actions
- **GitHub Runners:** https://github.com/tdbsolutionit/B-ACE_TDBSolution/settings/actions/runners

---

*Cập nhật lần cuối: 2026-10-16*