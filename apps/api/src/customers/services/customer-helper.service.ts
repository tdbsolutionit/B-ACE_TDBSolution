import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerHelperService {
  blank(value?: string | null) {
    const text = value?.trim();
    return text ? text : null;
  }

  dbType(type?: string) {
    return type === 'business' ? 'business' : 'personal';
  }

  uiType(type: string) {
    return type === 'business' ? 'business' : 'individual';
  }

  digits(value?: string | null) {
    return (value || '').replace(/\D/g, '');
  }

  sameContact(left?: string | null, right?: string | null) {
    const a = this.digits(left);
    const b = this.digits(right);
    return a.length >= 8 && a === b;
  }

  sameEmail(left?: string | null, right?: string | null) {
    const a = (left || '').trim().toLowerCase();
    const b = (right || '').trim().toLowerCase();
    return a.includes('@') && a === b;
  }

  present(row: any, names: Map<string, string>) {
    return {
      id: row.id,
      code: row.code ?? null,
      shortCode: row.shortCode ?? null,
      name: row.name,
      company: row.company,
      phone: row.phone,
      email: row.email,
      address: row.address,
      taxCode: row.taxCode,
      industry: row.industry,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      type: this.uiType(row.type),
      status: row.status,
      sourceName: row.sourceName,
      notes: row.notes,
      assigneeName: row.assignedTo ? names.get(row.assignedTo) ?? null : null,
      oppCount: row.opportunities?.length || 0,
      openOppCount: row.opportunities?.filter((item: any) => item.status === 'open').length || 0,
      createdAt: row.createdAt.toISOString(),
    };
  }
}