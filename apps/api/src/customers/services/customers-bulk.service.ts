import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuthUser, owned, scope } from '../../common/auth';
import { logActivity } from '../../common/activity';
import { BulkAssignDto, BulkStatusDto, BulkDeleteDto } from '../dto/customer.dto';

@Injectable()
export class CustomersBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async bulkAssign(user: AuthUser, dto: BulkAssignDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const targetUser = await tx.user.findFirstOrThrow({
        where: scope(user.tenantId, { id: dto.assignedTo }),
      });
      const updated = await tx.customer.updateMany({
        where: owned(user, { id: { in: dto.ids } }),
        data: { assignedTo: dto.assignedTo },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Chuyển nhượng khách hàng',
        content: `Gán ${updated.count} khách cho ${targetUser.name}`,
        relatedType: 'customer',
      });
      return { count: updated.count, assigneeName: targetUser.name };
    });

    this.realtime.emit(
      'customer:assigned',
      { count: result.count, assigneeName: result.assigneeName, assignedTo: dto.assignedTo },
      { tenantId: user.tenantId },
    );

    return result;
  }

  async bulkStatus(user: AuthUser, dto: BulkStatusDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const updated = await tx.customer.updateMany({
        where: owned(user, { id: { in: dto.ids } }),
        data: { status: dto.status },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Đổi trạng thái khách hàng',
        content: `Cập nhật trạng thái ${updated.count} khách sang ${dto.status}`,
        relatedType: 'customer',
      });
      return { count: updated.count };
    });
  }

  async bulkDelete(user: AuthUser, dto: BulkDeleteDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const deleted = await tx.customer.deleteMany({
        where: owned(user, { id: { in: dto.ids } }),
      });
      return { count: deleted.count };
    });
  }
}