import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'customer:read', module: 'CUSTOMER', description: 'Xem khách hàng' },
  { code: 'customer:create', module: 'CUSTOMER', description: 'Thêm khách hàng' },
  { code: 'customer:update', module: 'CUSTOMER', description: 'Sửa khách hàng' },
  { code: 'customer:delete', module: 'CUSTOMER', description: 'Xóa khách hàng' },
  
  { code: 'deal:read', module: 'DEAL', description: 'Xem cơ hội' },
  { code: 'deal:create', module: 'DEAL', description: 'Thêm cơ hội' },
  { code: 'deal:update', module: 'DEAL', description: 'Sửa cơ hội' },
  { code: 'deal:delete', module: 'DEAL', description: 'Xóa cơ hội' },

  { code: 'quote:read', module: 'QUOTE', description: 'Xem báo giá' },
  { code: 'quote:create', module: 'QUOTE', description: 'Thêm báo giá' },
  { code: 'quote:update', module: 'QUOTE', description: 'Sửa báo giá' },
  { code: 'quote:delete', module: 'QUOTE', description: 'Xóa báo giá' },

  { code: 'task:read', module: 'TASK', description: 'Xem công việc' },
  { code: 'task:create', module: 'TASK', description: 'Thêm công việc' },
  { code: 'task:update', module: 'TASK', description: 'Sửa công việc' },
  { code: 'task:delete', module: 'TASK', description: 'Xóa công việc' },

  { code: 'user:read', module: 'USER', description: 'Xem người dùng' },
  { code: 'user:create', module: 'USER', description: 'Thêm người dùng' },
  { code: 'user:update', module: 'USER', description: 'Sửa người dùng' },
  { code: 'user:delete', module: 'USER', description: 'Xóa người dùng' },

  { code: 'setting:read', module: 'SETTING', description: 'Xem cài đặt' },
  { code: 'setting:update', module: 'SETTING', description: 'Sửa cài đặt' },
];


async function main() {
  console.log('Bắt đầu seed dữ liệu...');

  // 1. Tạo tenant mặc định
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'b-ace' },
    update: {},
    create: {
      name: 'B-ACE',
      slug: 'b-ace',
    },
  });

  // 2. Tạo permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  // 3. Tạo role admin thuộc tenant
  const role = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'admin',
      description: 'Quản trị viên hệ thống',
      isSystem: true,
    },
  });

  // 4. Gán tất cả permissions cho role admin
  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: p.code },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  // 5. Tạo tài khoản admin nếu chưa tồn tại
  const email = 'admin@b-ace.vn';
  const passwordHash = await bcrypt.hash('password', 10);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrator',
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
      roleId: role.id,
    },
  });

  console.log('Seed thành công!');
  console.log('Tenant:', tenant.name);
  console.log('Admin email:', email);
  console.log('Admin password: password');
}

main()
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
