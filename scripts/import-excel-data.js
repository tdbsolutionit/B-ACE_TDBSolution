const { readFileSync } = require('fs');
const { resolve } = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function clean(val) {
  if (!val) return null;
  const s = val.replace(/^"+|"+$/g, '').trim();
  if (!s || s === 'NA' || s === 'N/A' || s === '-' || s === 'NaN') return null;
  return s;
}

function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('--- BẮT ĐẦU IMPORT / CẬP NHẬT DỮ LIỆU CHUẨN MÃ KH & MÃ DỰ ÁN ---');

  // 1. Tenant & Users
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'bace-internal' },
  }) || (await prisma.tenant.findFirst());

  if (!tenant) throw new Error('Không tìm thấy tenant!');
  console.log(`Tenant: [${tenant.slug}] ${tenant.name}`);

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'admin' },
  }) || (await prisma.user.findFirst({ where: { tenantId: tenant.id } }));

  // Xoá khách hàng rác nếu có
  await prisma.customer.deleteMany({
    where: {
      tenantId: tenant.id,
      name: { in: ['tạp chí', 'báo', 'văn phòng phẩm'] }
    }
  });

  // 2. Stages
  const allStages = await prisma.stage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { orderIndex: 'asc' },
  });

  const stageWon = allStages.find(s => s.isWon) || allStages.find(s => s.name.includes('Thắng')) || allStages[allStages.length - 1];
  const stageQuote = allStages.find(s => s.name.includes('Báo giá')) || allStages[0];
  const stageConsult = allStages.find(s => s.name.includes('Đang tư vấn')) || allStages.find(s => s.name.includes('Đã liên hệ')) || allStages[0];

  // 3. Đọc CSV
  const csvPath = resolve(__dirname, 'data/khach-hang-va-du-an.csv');
  const content = readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');

  const customerLines = [];
  const project2023Lines = [];
  const project2024Lines = [];
  const project2025Lines = [];

  let currentSection = 'customer';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('Năm 2023')) {
      currentSection = '2023';
      continue;
    }
    if (trimmed.startsWith('Năm 2024')) {
      currentSection = '2024';
      continue;
    }
    if (trimmed.startsWith('Năm 2025')) {
      currentSection = '2025';
      continue;
    }

    if (currentSection === 'customer') {
      customerLines.push(rawLine);
    } else if (currentSection === '2023') {
      project2023Lines.push(rawLine);
    } else if (currentSection === '2024') {
      project2024Lines.push(rawLine);
    } else if (currentSection === '2025') {
      project2025Lines.push(rawLine);
    }
  }

  // 4. Xử lý Khách hàng
  const codeToCustomer = new Map();
  const nameToCustomer = new Map();

  let customerCount = 0;

  for (let i = 0; i < customerLines.length; i++) {
    const cols = parseCSVLine(customerLines[i]);
    if (!cols.length || cols[0] === 'STT' || cols[0].startsWith('Quy định') || cols[0].startsWith('Template')) continue;

    const stt = clean(cols[0]);
    const code = clean(cols[1]); // e.g. "01"
    const shortName = clean(cols[2]); // e.g. "Z751"
    const custCode = clean(cols[3]); // e.g. "KH00001"
    const companyFull = clean(cols[4]); // e.g. "CÔNG TY TNHH..."
    const taxCode = clean(cols[6]);
    const address = clean(cols[7]);
    const website = clean(cols[8]);
    const contactName = clean(cols[9]);
    const contactRole = clean(cols[10]);
    const email = clean(cols[11]);
    const phone = clean(cols[12]);
    const industry = clean(cols[13]);
    const contact2Name = clean(cols[14]);
    const contact2Role = clean(cols[15]);
    const email2 = clean(cols[16]);
    const phone2 = clean(cols[17]);

    const displayName = shortName || companyFull;
    if (!displayName) continue;
    const companyName = companyFull && companyFull !== shortName ? companyFull : null;

    // Ghi chú
    const notesParts = [];
    if (custCode) notesParts.push(`Mã KH: ${custCode}`);
    if (code) notesParts.push(`Mã số: ${code}`);
    if (contactRole) notesParts.push(`Chức vụ: ${contactRole}`);
    if (website) notesParts.push(`Web: ${website}`);
    if (contact2Name) {
      const c2 = [contact2Name, contact2Role, phone2, email2].filter(Boolean).join(' - ');
      notesParts.push(`Liên hệ phụ: ${c2}`);
    }
    const notes = notesParts.length ? notesParts.join(' | ') : null;

    let existing = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { name: displayName },
          ...(custCode ? [{ code: custCode }] : []),
          ...(companyName ? [{ company: companyName }] : []),
          ...(taxCode ? [{ taxCode }] : []),
        ],
      },
    });

    if (existing) {
      existing = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          code: custCode || existing.code,
          shortCode: code || existing.shortCode,
          name: displayName,
          company: companyName || existing.company,
          taxCode: taxCode || existing.taxCode,
          address: address || existing.address,
          industry: industry || existing.industry,
          contactName: contactName || existing.contactName,
          contactPhone: phone || existing.contactPhone,
          contactEmail: email || existing.contactEmail,
          phone: phone || existing.phone,
          email: email || existing.email,
          notes: notes || existing.notes,
          status: 'active',
        },
      });
    } else {
      existing = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          code: custCode,
          shortCode: code,
          name: displayName,
          company: companyName,
          taxCode,
          address,
          industry,
          contactName,
          contactPhone: phone,
          contactEmail: email,
          phone,
          email,
          notes,
          type: 'business',
          status: 'active',
          sourceName: 'Danh sách công ty',
          assignedTo: adminUser?.id,
          createdBy: adminUser?.id,
        },
      });
    }

    customerCount++;

    if (code) {
      codeToCustomer.set(code, existing);
      codeToCustomer.set(String(parseInt(code, 10)), existing);
      codeToCustomer.set(code.padStart(2, '0'), existing);
    }
    if (custCode) {
      codeToCustomer.set(custCode, existing);
    }
    if (shortName) {
      nameToCustomer.set(normalizeKey(shortName), existing);
    }
    if (companyFull) {
      nameToCustomer.set(normalizeKey(companyFull), existing);
    }
    nameToCustomer.set(normalizeKey(displayName), existing);
  }

  console.log(`=> Đã cập nhật ${customerCount} khách hàng với Mã KH chuẩn`);

  // 5. Xử lý Dự án
  let totalProjectCount = 0;

  async function importProjects(projectLines, label) {
    console.log(`\nImporting ${label}...`);
    for (let i = 0; i < projectLines.length; i++) {
      const cols = parseCSVLine(projectLines[i]);
      if (!cols.length || cols[0] === 'STT' || !cols[1]) continue;

      const yearCode = clean(cols[1]); // e.g. "240124", "20231013"
      const custCode = clean(cols[2]); // e.g. "01", "13"
      const orderInYear = clean(cols[3]); // e.g. "01"
      const custName = clean(cols[4]); // e.g. "Z751"
      const projectName = clean(cols[5]); // e.g. "Mua hàng 20 bộ treo xe"
      const projectCode = clean(cols[6]);
      const statusText = clean(cols[7]) || '';

      if (!projectName) continue;

      // Tìm khách hàng
      let customer = null;
      if (custCode) {
        customer = codeToCustomer.get(custCode) || codeToCustomer.get(String(parseInt(custCode, 10))) || codeToCustomer.get(custCode.padStart(2, '0'));
      }
      if (!customer && custName) {
        customer = nameToCustomer.get(normalizeKey(custName));
      }
      if (!customer && custName) {
        const norm = normalizeKey(custName);
        if (norm === 'hdp') customer = nameToCustomer.get(normalizeKey('DHP'));
        if (norm === 'mrbau') customer = nameToCustomer.get(normalizeKey('Mr Báu'));
        if (norm === 'mrtuan') customer = nameToCustomer.get(normalizeKey('Mr Tuấn'));
        if (norm === 'mrphuc') customer = nameToCustomer.get(normalizeKey('Mr Phúc'));
        if (norm === 'mranh') customer = nameToCustomer.get(normalizeKey('Mr Anh'));
        if (norm === 'tientuan') customer = nameToCustomer.get(normalizeKey('Tiến Tuấn'));
        if (norm === 'akc') customer = nameToCustomer.get(normalizeKey('AnhKhoa'));
      }

      if (!customer) {
        const newCustName = custName || `KH-${custCode || 'Chưa đặt tên'}`;
        customer = await prisma.customer.create({
          data: {
            tenantId: tenant.id,
            name: newCustName,
            status: 'active',
            type: 'business',
            sourceName: 'Từ danh sách dự án',
            assignedTo: adminUser?.id,
            createdBy: adminUser?.id,
          },
        });
        if (custCode) {
          codeToCustomer.set(custCode, customer);
          codeToCustomer.set(String(parseInt(custCode, 10)), customer);
        }
        if (custName) {
          nameToCustomer.set(normalizeKey(custName), customer);
        }
      }

      // Format chuẩn Mã năm 8 chữ số: 202xMMDD
      let yearFull = yearCode || '20240101';
      if (yearFull.length === 6) {
        yearFull = `20${yearFull}`; // VD: 240124 -> 20240124
      }

      // Format chuẩn Mã dự án: 20240124-0101_Z751_Mua hàng 20 bộ treo xe
      const cShortCode = (custCode || customer.shortCode || '01').padStart(2, '0');
      const order2D = (orderInYear || '01').padStart(2, '0');
      const standardProjectCode = `${yearFull}-${cShortCode}${order2D}_${customer.name}_${projectName}`;

      // Ngày tạo
      let createdAt = new Date();
      if (/^\d{8}$/.test(yearFull)) {
        const y = parseInt(yearFull.slice(0, 4), 10);
        const m = parseInt(yearFull.slice(4, 6), 10) - 1;
        const d = parseInt(yearFull.slice(6, 8), 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          createdAt = new Date(Date.UTC(y, m, d, 8, 0, 0));
        }
      }

      // Giai đoạn & Trạng thái
      let stage = stageConsult;
      let oppStatus = 'open';
      let probability = 30;

      const st = statusText.toLowerCase().trim();
      if (st === 'done' || st === 'thắng') {
        stage = stageWon;
        oppStatus = 'won';
        probability = 100;
      } else if (st === 'đang triển khai') {
        stage = stageWon;
        oppStatus = 'won';
        probability = 90;
      } else if (st.includes('báo giá')) {
        if (st.includes('chưa')) {
          stage = stageConsult;
          probability = 30;
        } else {
          stage = stageQuote;
          probability = 60;
        }
      }

      const description = `Mã dự án: ${standardProjectCode}${statusText ? ` | Tình trạng: ${statusText}` : ''}`;

      let existingOpp = await prisma.opportunity.findFirst({
        where: {
          tenantId: tenant.id,
          customerId: customer.id,
          name: projectName,
        },
      });

      if (existingOpp) {
        await prisma.opportunity.update({
          where: { id: existingOpp.id },
          data: {
            code: standardProjectCode,
            stageId: stage.id,
            status: oppStatus,
            probability,
            description,
            createdAt,
          },
        });
      } else {
        await prisma.opportunity.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            code: standardProjectCode,
            name: projectName,
            stageId: stage.id,
            status: oppStatus,
            probability,
            description,
            value: 0,
            assignedTo: adminUser?.id,
            createdBy: adminUser?.id,
            createdAt,
          },
        });
      }

      totalProjectCount++;
    }
  }

  await importProjects(project2023Lines, 'Năm 2023');
  await importProjects(project2024Lines, 'Năm 2024');
  await importProjects(project2025Lines, 'Năm 2025 - 2026');

  console.log(`\n=> Đã cập nhật xong ${totalProjectCount} dự án với Mã dự án chuẩn 202xMMDD!\n`);
}

main()
  .catch((e) => {
    console.error('LỖI:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
