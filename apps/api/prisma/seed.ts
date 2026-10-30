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

const STAGES = [
  { name: 'Tiếp cận', color: '#3b82f6', orderIndex: 1, isWon: false, isLost: false },
  { name: 'Đàm phán', color: '#eab308', orderIndex: 2, isWon: false, isLost: false },
  { name: 'Đề xuất', color: '#a855f7', orderIndex: 3, isWon: false, isLost: false },
  { name: 'Thắng (Won)', color: '#22c55e', orderIndex: 4, isWon: true, isLost: false },
  { name: 'Thua (Lost)', color: '#ef4444', orderIndex: 5, isWon: false, isLost: true },
];

async function main() {
  console.log('Bắt đầu seed dữ liệu...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'b-ace' },
    update: {},
    create: {
      name: 'B-ACE',
      slug: 'b-ace',
    },
  });

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  // TẠO STAGES BẰNG CÁCH CHECK TỒN TẠI TRƯỚC (Tránh lỗi unique constraint)
  for (const s of STAGES) {
    const existingStage = await prisma.stage.findFirst({
      where: {
        tenantId: tenant.id,
        name: s.name,
      },
    });

    if (!existingStage) {
      await prisma.stage.create({
        data: {
          ...s,
          tenantId: tenant.id,
        },
      });
    }
  }

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
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });