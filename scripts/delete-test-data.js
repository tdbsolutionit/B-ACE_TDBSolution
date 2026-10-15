const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- BẮT ĐẦU DỌN DẸP DATA TEST ---');

  // Danh sách ID hoặc tên các khách hàng test ban đầu
  const testCustomerNames = [
    'Công ty TNHH An Phát',
    'Công ty CP Đại Việt',
    'Công ty TNHH Minh Long',
    'Công ty TNHH Hoàng Gia',
    'Nguyễn Văn Khoa',
    'Khoa',
  ];

  const testCustomers = await prisma.customer.findMany({
    where: {
      name: { in: testCustomerNames },
    },
    select: { id: true, name: true },
  });

  console.log(`Tìm thấy ${testCustomers.length} khách hàng test cần xoá:`);
  for (const c of testCustomers) {
    console.log(` - ${c.name} (${c.id})`);
  }

  // Xoá khách hàng test (sẽ tự động cascade xoá cơ hội & báo giá liên quan)
  if (testCustomers.length > 0) {
    const custIds = testCustomers.map(c => c.id);
    const deleteResult = await prisma.customer.deleteMany({
      where: { id: { in: custIds } },
    });
    console.log(`=> Đã xoá thành công ${deleteResult.count} khách hàng test và toàn bộ cơ hội/báo giá kèm theo.`);
  }

  // Dọn dẹp các task test
  const testTasks = await prisma.task.deleteMany({
    where: {
      OR: [
        { title: { contains: 'test', mode: 'insensitive' } },
        { title: { contains: 'SME', mode: 'insensitive' } },
        { title: { contains: 'quảng cáo', mode: 'insensitive' } },
        { title: { contains: 'Huy', mode: 'insensitive' } },
        { title: 'Nhắc quá hạn: gọi lại khách' },
        { title: 'Gửi báo giá dự án website' },
      ],
    },
  });
  console.log(`=> Đã xoá thành công ${testTasks.count} công việc (task) test.`);

  // Đếm lại tổng số bản ghi thực tế
  const totalCustomers = await prisma.customer.count();
  const totalOpportunities = await prisma.opportunity.count();
  const totalQuotes = await prisma.quote.count();
  const totalTasks = await prisma.task.count();

  console.log('\n========================================');
  console.log('HIỆN TRẠNG DỮ LIỆU CHÍNH THỨC CỦA CÔNG TY:');
  console.log(`- Khách hàng chính thức: ${totalCustomers}`);
  console.log(`- Dự án / Cơ hội: ${totalOpportunities}`);
  console.log(`- Báo giá: ${totalQuotes}`);
  console.log(`- Công việc (Tasks): ${totalTasks}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Lỗi khi xoá data test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
