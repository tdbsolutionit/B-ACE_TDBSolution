import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, scope } from '../../common/auth';
import { logActivity } from '../../common/activity';
import { ImportDto, ImportRow } from '../dto/customer.dto';
import { OdooService } from '../odoo.service';
import { CustomerHelperService } from './customer-helper.service';

@Injectable()
export class CustomersImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly odooService: OdooService,
    private readonly helper: CustomerHelperService,
  ) {}

  async import(user: AuthUser, dto: ImportDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, phone: true, email: true, contactPhone: true, contactEmail: true },
      });

      const skipped: Array<{ name: string; reason: string }> = [];
      const toCreate: ImportRow[] = [];

      for (const row of dto.rows || []) {
        const name = (row.name || '').trim();
        if (!name) continue;

        const phone = this.helper.blank(row.phone);
        const email = this.helper.blank(row.email);

        const isDupe = existing.some(
          (ex) =>
            this.helper.sameContact(phone, ex.phone) ||
            this.helper.sameContact(phone, ex.contactPhone) ||
            this.helper.sameEmail(email, ex.email) ||
            this.helper.sameEmail(email, ex.contactEmail),
        );

        if (isDupe) {
          skipped.push({ name, reason: 'Số điện thoại hoặc email đã tồn tại' });
          continue;
        }

        existing.push({ id: '', phone, email, contactPhone: null, contactEmail: null });
        toCreate.push(row);
      }

      let createdCount = 0;
      for (const row of toCreate) {
        const created = await tx.customer.create({
          data: {
            tenantId: user.tenantId,
            name: row.name.trim(),
            code: this.helper.blank(row.code),
            shortCode: this.helper.blank(row.shortCode),
            phone: this.helper.blank(row.phone),
            email: this.helper.blank(row.email),
            company: this.helper.blank(row.company),
            taxCode: this.helper.blank(row.taxCode),
            address: this.helper.blank(row.address),
            industry: this.helper.blank(row.industry),
            type: row.company || row.type === 'business' ? 'business' : 'personal',
            status: (row.status === 'active' || row.status === 'inactive') ? row.status : 'lead',
            sourceName: this.helper.blank(row.sourceName) || 'Import Excel/CSV',
            assignedTo: user.sub,
            createdBy: user.sub,
          },
        });
        
        this.odooService.pushCustomerToOdoo(created).then(async (odooId) => {
          if (odooId) {
            await this.prisma.withTenant(user.tenantId, (t) =>
              t.customer.update({
                where: { id: created.id },
                data: { odooPartnerId: String(odooId) },
              }),
            );
          }
        }).catch(console.error);

        createdCount++;
      }

      if (createdCount > 0) {
        await logActivity(tx, user, {
          type: 'note',
          subject: 'Import khách hàng',
          content: `Import thành công ${createdCount} khách hàng (${skipped.length} bỏ qua)`,
          relatedType: 'customer',
        });
      }

      return { created: createdCount, skipped };
    });
  }
}