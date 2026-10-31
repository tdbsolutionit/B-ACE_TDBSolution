import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  private readonly odooUrl = process.env.ODOO_URL;
  private readonly odooDb = process.env.ODOO_DB;
  private readonly odooUsername = process.env.ODOO_USERNAME;
  private readonly odooPassword = process.env.ODOO_PASSWORD;

  async authenticate(): Promise<number> {
    try {
      const response = await axios.post(`${this.odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: this.odooDb,
          login: this.odooUsername,
          password: this.odooPassword,
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

  async pushCustomerToOdoo(customer: any): Promise<number | null> {
    if (!this.odooUrl || !this.odooDb) {
      this.logger.warn('Chưa cấu hình Odoo, bỏ qua đồng bộ');
      return null;
    }

    try {
      const uid = await this.authenticate();

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
        await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [this.odooDb, uid, this.odooPassword, 'res.partner', 'write', [[odooId], partnerData]],
          },
          id: 2,
        });
        this.logger.log(`Đã cập nhật khách hàng ${customer.name} (ID: ${odooId}) trên Odoo`);
        return odooId;
      } else {
        const response = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [this.odooDb, uid, this.odooPassword, 'res.partner', 'create', [partnerData]],
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