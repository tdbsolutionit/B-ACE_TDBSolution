import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export type OdooConfig = {
  url: string;
  db: string;
  username: string;
  password: string;
};

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);

  async authenticate(config: OdooConfig): Promise<number> {
    try {
      const response = await axios.post(`${config.url}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: config.db,
          login: config.username,
          password: config.password,
        },
        id: 1,
      });

      if (response.data.error) {
        throw new Error(response.data.error.data.message);
      }

      return response.data.result;
    } catch (error) {
      this.logger.error('Lỗi xác thực Odoo', error);
      throw error;
    }
  }

  async testConnection(config: any): Promise<boolean> {
    await this.authenticate(config);
    return true;
  }

  async syncCustomer(customer: any, config: any): Promise<string | null> {
    const odooId = await this.pushCustomerToOdoo(customer, config);
    return odooId ? String(odooId) : null;
  }

  private async pushCustomerToOdoo(customer: any, config: OdooConfig): Promise<number | null> {
    if (!config.url || !config.db) {
      this.logger.warn('Chưa cấu hình Odoo, bỏ qua đồng bộ');
      return null;
    }

    try {
      const uid = await this.authenticate(config);

      const partnerData = {
        name: customer.name,
        company_name: customer.company || customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        street: customer.address || '',
        is_company: customer.type === 'business',
      };

      let odooId = customer.odooPartnerId ? Number(customer.odooPartnerId) : null;

      if (odooId) {
        await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.partner', 'write', [[odooId], partnerData]],
          },
          id: 2,
        });
        this.logger.log(`Đã cập nhật khách hàng ${customer.name} (ID: ${odooId}) trên Odoo`);
        return odooId;
      } else {
        const response = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.partner', 'create', [partnerData]],
          },
          id: 3,
        });

        odooId = response.data.result;
        this.logger.log(`Đã tạo mới khách hàng ${customer.name} (ID: ${odooId}) trên Odoo`);
        return odooId;
      }
    } catch (error) {
      this.logger.error(`Đồng bộ khách hàng ${customer.name} sang Odoo thất bại`, error);
      return null;
    }
  }
}