import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { sameMonth } from './dashboard.helper';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const where = owned(user);
      const tenantWhere = scope(user.tenantId);
      
      const [customers, opportunities, tasks, activities, quotes, stages, users] = await Promise.all([
        tx.customer.findMany({ where }),
        tx.opportunity.findMany({ where, include: { stage: true, customer: true } }),
        tx.task.findMany({ where, orderBy: { dueDate: 'asc' } }),
        tx.activity.findMany({
          where: user.role === 'sales' ? scope(user.tenantId, { userId: user.sub }) : tenantWhere,
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        tx.quote.findMany({
          where: scope(user.tenantId, user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
          include: { items: true },
        }),
        tx.stage.findMany({ where: tenantWhere, orderBy: { orderIndex: 'asc' } }),
        tx.user.findMany({ where: tenantWhere, select: { id: true, name: true } }),
      ]);

      const names = new Map(users.map((item) => [item.id, item.name]));
      const customerNames = new Map(customers.map((item) => [item.id, item.name]));
      const leads = customers.filter((item) => item.status === 'lead').length;
      const active = customers.filter((item) => item.status === 'active').length;
      const open = opportunities.filter((item) => item.status === 'open');
      const won = opportunities.filter((item) => item.status === 'won');
      const pipeline = open.reduce((sum, item) => sum + Number(item.value), 0);
      const conversion = customers.length ? Math.round((active / customers.length) * 1000) / 10 : 0;
      
      const sources = new Map<string, number>();
      for (const customer of customers) {
        const key = customer.sourceName || 'Khác';
        sources.set(key, (sources.get(key) || 0) + 1);
      }
      
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const name = `T${date.getMonth() + 1}`;
        
        const actual = quotes
          .filter((quote) => quote.status === 'accepted' && sameMonth(quote.createdAt, date))
          .reduce((sum, quote) => {
            const quoteTotal = quote.items?.reduce((itemSum, item) => itemSum + Number(item.total), 0) || 0;
            return sum + quoteTotal;
          }, 0);
          
        const expected = opportunities
          .filter((item) => sameMonth(item.createdAt, date))
          .reduce((sum, item) => sum + Number(item.value), 0);
          
        return { name, actual: Math.round(actual / 1_000_000), expected: Math.round(expected / 1_000_000) };
      });

      return {
        leads,
        customers: customers.length,
        active,
        conversion,
        pipeline,
        openOpportunities: open.length,
        won: won.length,
        sources: [...sources.entries()].map(([name, value]) => ({ name, value })),
        stages: stages.map((stage) => ({
          label: stage.name,
          count: opportunities.filter((item) => item.stageId === stage.id).length,
          color: stage.color,
        })),
        months,
        tasks: tasks.slice(0, 8).map((task) => ({
          id: task.id,
          title: task.title,
          done: task.status === 'done',
          priority: task.priority === 'high' ? 'Cao' : task.priority === 'low' ? 'Thấp' : 'Trung bình',
          time: task.dueDate
            ? task.dueDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '',
          customer:
            task.relatedType === 'customer' && task.relatedId
              ? customerNames.get(task.relatedId) || 'Nội bộ'
              : 'Nội bộ',
        })),
        activities: activities.map((item) => ({
          id: item.id,
          customer: item.relatedType === 'customer' && item.relatedId ? customerNames.get(item.relatedId) || 'Nội bộ' : item.subject,
          company: item.content || '',
          type: item.subject,
          text: item.content || '',
          owner: item.userId ? names.get(item.userId) || '' : '',
          time: item.createdAt.toLocaleString('vi-VN'),
          status: 'Hoàn thành',
        })),
      };
    });
  }
}