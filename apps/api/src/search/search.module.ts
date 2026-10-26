import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async query(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    const text = q.trim();
    if (text.length < 1) return { customers: [], opportunities: [], quotes: [] };
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const contains = { contains: text, mode: 'insensitive' as const };
      const [customers, opportunities, quotes] = await Promise.all([
        tx.customer.findMany({
          where: owned(user, { OR: [{ name: contains }, { phone: contains }, { email: contains }, { company: contains }] }),
          take: 8,
          orderBy: { name: 'asc' },
        }),
        tx.opportunity.findMany({
          where: owned(user, { name: contains }),
          include: { customer: true },
          take: 8,
        }),
        tx.quote.findMany({
          where: scope(user.tenantId, {
            ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
            OR: [{ title: contains }, { quoteNumber: contains }],
          }),
          include: { customer: true },
          take: 8,
        }),
      ]);
      return {
        customers: customers.map((row) => ({ id: row.id, name: row.name, phone: row.phone, href: `/customers/${row.id}` })),
        opportunities: opportunities.map((row) => ({ id: row.id, name: row.name, customer: row.customer?.name?? 'Khách vãng lai', href: `/projects/${row.id}` })),
        quotes: quotes.map((row) => ({ id: row.id, name: `${row.quoteNumber} · ${row.title}`, customer: row.customer?.name ?? 'Khách vãng lai', href: `/quotes/${row.id}` })),
      };
    });
  }
}

@Module({ controllers: [SearchController] })
export class SearchModule {}
