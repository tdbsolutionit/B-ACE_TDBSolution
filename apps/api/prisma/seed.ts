import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'bace-internal' },
    update: {},
    create: { name: 'B-ACE SME', slug: 'bace-internal' },
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@b-ace.vn' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Nguyễn Minh Anh',
      email: 'admin@b-ace.vn',
      passwordHash,
      role: 'admin',
      phone: '0901234567',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'lan@b-ace.vn' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Trần Thị Lan',
      email: 'lan@b-ace.vn',
      passwordHash,
      role: 'sales',
      phone: '0912345678',
    },
  });

  const stageNames = [
    ['Lead mới', false, false],
    ['Đã liên hệ', false, false],
    ['Đang tư vấn', false, false],
    ['Báo giá', false, false],
    ['Đàm phán', false, false],
    ['Thắng', true, false],
  ] as const;

  const stages = [];
  for (const [index, [name, isWon, isLost]] of stageNames.entries()) {
    const existing = await prisma.stage.findFirst({
      where: { tenantId: tenant.id, name },
    });
    stages.push(
      existing ??
        (await prisma.stage.create({
          data: {
            tenantId: tenant.id,
            name,
            orderIndex: index,
            isWon,
            isLost,
          },
        })),
    );
  }

  const customers = [
    ['Công ty TNHH An Phát', 'An Phat Co., Ltd', 'business', 'active', 'Zalo', '0901111222'],
    ['Công ty CP Đại Việt', 'Dai Viet JSC', 'business', 'active', 'Website', '0902222333'],
    ['Công ty TNHH Minh Long', 'Minh Long Co., Ltd', 'business', 'lead', 'Facebook', '0903333444'],
    ['Công ty TNHH Hoàng Gia', 'Hoang Gia Co., Ltd', 'business', 'active', 'Giới thiệu', '0904444555'],
    ['Nguyễn Văn Khoa', null, 'personal', 'lead', 'Email', '0905555666'],
  ] as const;

  for (const [name, company, type, status, sourceName, phone] of customers) {
    const found = await prisma.customer.findFirst({ where: { tenantId: tenant.id, name } });
    if (found) continue;
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name,
        company,
        type,
        status,
        sourceName,
        phone,
        email: `${name.split(' ').slice(-1)[0].toLowerCase()}@example.com`,
        assignedTo: admin.id,
        createdBy: admin.id,
      },
    });
  }

  const anPhat = await prisma.customer.findFirstOrThrow({
    where: { tenantId: tenant.id, name: 'Công ty TNHH An Phát' },
  });
  const existingOpp = await prisma.opportunity.findFirst({
    where: { tenantId: tenant.id, name: 'Gói quảng cáo SME' },
  });
  if (!existingOpp) {
    const opp = await prisma.opportunity.create({
      data: {
        tenantId: tenant.id,
        name: 'Gói quảng cáo SME',
        customerId: anPhat.id,
        stageId: stages[3].id,
        value: 185000000,
        assignedTo: admin.id,
        createdBy: admin.id,
        description: 'Tư vấn gói dịch vụ quảng cáo quý 4',
      },
    });
    await prisma.quote.create({
      data: {
        tenantId: tenant.id,
        opportunityId: opp.id,
        customerId: anPhat.id,
        quoteNumber: 'BG-0001',
        title: 'Báo giá website + quảng cáo',
        scenario: 'mid',
        workingDays: 98,
        freelancers: 2,
        freelanceRate: 1000000,
        personnelCost: 196000000,
        otherCost: 45000000,
        totalCost: 241000000,
        profitMargin: 50,
        sellingPrice: 361500000,
        status: 'sent',
        createdBy: admin.id,
      },
    });
  }

  const taskCount = await prisma.task.count({ where: { tenantId: tenant.id } });
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          tenantId: tenant.id,
          title: 'Gọi điện tư vấn gói dịch vụ SME',
          dueDate: new Date(),
          priority: 'high',
          status: 'done',
          assignedTo: admin.id,
          createdBy: admin.id,
        },
        {
          tenantId: tenant.id,
          title: 'Gửi báo giá dự án website',
          dueDate: new Date(),
          priority: 'high',
          status: 'pending',
          assignedTo: admin.id,
          createdBy: admin.id,
        },
        {
          tenantId: tenant.id,
          title: 'Follow-up hợp đồng quảng cáo',
          dueDate: new Date(),
          priority: 'medium',
          status: 'pending',
          assignedTo: admin.id,
          createdBy: admin.id,
        },
      ],
    });
    await prisma.activity.createMany({
      data: [
        {
          tenantId: tenant.id,
          type: 'call',
          subject: 'Cuộc gọi',
          content: 'Tư vấn gói dịch vụ quảng cáo',
          relatedType: 'customer',
          relatedId: anPhat.id,
          userId: admin.id,
        },
        {
          tenantId: tenant.id,
          type: 'email',
          subject: 'Email',
          content: 'Gửi báo giá dự án website',
          userId: admin.id,
        },
      ],
    });
  }

  const refreshed = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, name: 'Công ty TNHH An Phát' },
  });
  if (refreshed && !refreshed.taxCode) {
    await prisma.customer.update({
      where: { id: refreshed.id },
      data: {
        taxCode: '0312345678',
        industry: 'Thương mại',
        contactName: 'Phạm An',
        contactPhone: '0901111222',
        contactEmail: 'pic@anphat.vn',
        address: 'Quận 1, TP.HCM',
      },
    });
  }

  const lostStage = await prisma.stage.findFirst({
    where: { tenantId: tenant.id, name: 'Thua' },
  });
  if (!lostStage) {
    const last = await prisma.stage.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { orderIndex: 'desc' },
    });
    await prisma.stage.create({
      data: {
        tenantId: tenant.id,
        name: 'Thua',
        orderIndex: (last?.orderIndex ?? 0) + 1,
        color: '#e11d48',
        isLost: true,
      },
    });
  }

  const lan = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'lan@b-ace.vn' },
  });
  if (lan) {
    await prisma.customer.updateMany({
      where: { tenantId: tenant.id, name: 'Nguyễn Văn Khoa', assignedTo: admin.id },
      data: { assignedTo: lan.id },
    });
  }

  const reminder = await prisma.task.findFirst({
    where: { tenantId: tenant.id, title: 'Nhắc quá hạn: gọi lại khách' },
  });
  if (!reminder) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        title: 'Nhắc quá hạn: gọi lại khách',
        dueDate: yesterday,
        priority: 'high',
        status: 'pending',
        assignedTo: admin.id,
        createdBy: admin.id,
        relatedType: 'customer',
        relatedId: refreshed?.id,
      },
    });
  }

  const liveOpp = await prisma.opportunity.findFirst({
    where: { tenantId: tenant.id, name: 'Gói quảng cáo SME' },
  });
  if (liveOpp) {
    if (!liveOpp.probability) {
      await prisma.opportunity.update({
        where: { id: liveOpp.id },
        data: { probability: 60, expectedCloseDate: new Date('2026-10-30') },
      });
    }
    const extras = [
      ['proposal', 'DX-0001', 'Đề xuất gói quảng cáo quý 4', 185000000],
      ['po', 'PO-0001', 'Đơn hàng triển khai đợt 1', 120000000],
    ] as const;
    for (const [kind, quoteNumber, title, sellingPrice] of extras) {
      const found = await prisma.quote.findFirst({
        where: { tenantId: tenant.id, quoteNumber },
      });
      if (found) continue;
      await prisma.quote.create({
        data: {
          tenantId: tenant.id,
          opportunityId: liveOpp.id,
          customerId: liveOpp.customerId,
          quoteNumber,
          kind,
          title,
          sellingPrice,
          totalCost: sellingPrice,
          status: kind === 'po' ? 'draft' : 'sent',
          createdBy: admin.id,
        },
      });
    }
  }
    // ═══════════════════════════════════════════════════════════
  // SEED CHAT ROOM #general
  // ═══════════════════════════════════════════════════════════
  const generalRoomId = `general-${tenant.id}`;

  const generalRoom = await prisma.chatRoom.upsert({
    where: { id: generalRoomId },
    update: {},
    create: {
      id: generalRoomId,
      tenantId: tenant.id,
      name: 'Chung',
      type: 'general',
      createdBy: admin.id,
    },
  });

  // Add tất cả users trong tenant
  const allUsers = await prisma.user.findMany({
    where: { tenantId: tenant.id },
  });

  for (const u of allUsers) {
    await prisma.chatMember.upsert({
      where: {
        roomId_userId: {
          roomId: generalRoom.id,
          userId: u.id,
        },
      },
      update: {},
      create: {
        roomId: generalRoom.id,
        userId: u.id,
      },
    });
  }

  console.log(`✅ Chat room "${generalRoom.name}" với ${allUsers.length} members`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
