import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

const ODOO_INTERNAL_GROUP_ID = 1;
const ODOO_TEMP_PASSWORD_PREFIX = 'Bace@';

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
          service: 'common',
          method: 'login',
          args: [config.db, config.username, config.password],
        },
        id: 1,
      });

      if (response.data.error) {
        throw new Error(response.data.error.data.message);
      }

      return response.data.result;
    } catch (error: any) {
      this.logger.error('Lỗi xác thực Odoo', error?.message || error);
      throw new Error('Không thể xác thực Odoo. Vui lòng kiểm tra lại thông tin đăng nhập.');
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

  async syncUser(user: any, config: OdooConfig): Promise<string | null> {
    if (!config.url || !config.db) return null;

    try {
      const uid = await this.authenticate(config);

      const userData: any = {
        name: user.name,
        login: user.email,
        email: user.email,
      };

      if (user.phone) userData.phone = user.phone;

      let odooUserId = user.odooUserId ? Number(user.odooUserId) : null;

      if (!odooUserId) {
        const searchResponse = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0', method: 'call',
          params: {
            service: 'object', method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.users', 'search', [[['login', '=', user.email]]]],
          }, id: 4,
        });

        if (searchResponse.data.result && searchResponse.data.result.length > 0) {
          odooUserId = searchResponse.data.result[0];
        }
      }

      if (odooUserId) {
        const updateResponse = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0', method: 'call',
          params: {
            service: 'object', method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.users', 'write', [[odooUserId], userData]],
          }, id: 5,
        });

        if (updateResponse.data.error) {
          const errMsg = updateResponse.data.error.data?.message || '';
          if (errMsg.includes('does not exist') || errMsg.includes('missing')) {
            this.logger.warn(`Nhân viên ID ${odooUserId} không còn tồn tại trên Odoo. Sẽ tiến hành tạo mới.`);
            odooUserId = null;
          } else {
            this.logger.error(`Odoo từ chối cập nhật nhân viên ${user.name}:`, JSON.stringify(updateResponse.data.error.data, null, 2));
            return null;
          }
        } else {
          this.logger.log(`Đã cập nhật nhân viên ${user.name} (ID: ${odooUserId}) trên Odoo`);
          return String(odooUserId);
        }
      }

      if (!odooUserId) {
        const randomString = crypto.randomBytes(4).toString('hex');
        const tempPassword = `${ODOO_TEMP_PASSWORD_PREFIX}${randomString}`;
        
        const newUserData = {
          ...userData,
          password: tempPassword,
          group_ids: [[6, 0, [ODOO_INTERNAL_GROUP_ID]]],
        };

        const createResponse = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0', method: 'call',
          params: {
            service: 'object', method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.users', 'create', [newUserData]],
          }, id: 6,
        });

        if (createResponse.data.error) {
          this.logger.error(`Odoo từ chối tạo nhân viên ${user.name}:`, JSON.stringify(createResponse.data.error.data, null, 2));
          return null;
        }

        const newId = createResponse.data.result;
        this.logger.log(`Đã tạo mới nhân viên ${user.name} (ID: ${newId}) trên Odoo với pass tạm: ${tempPassword}`);
        return String(newId);
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Đồng bộ nhân viên ${user.name} sang Odoo thất bại`, error?.message || error);
      return null;
    }
  }

  private async pushCustomerToOdoo(customer: any, config: OdooConfig): Promise<number | null> {
    if (!config.url || !config.db) {
      this.logger.warn('Chưa cấu hình Odoo, bỏ qua đồng bộ');
      return null;
    }

    try {
      const uid = await this.authenticate(config);

      const partnerData: any = {
        name: customer.name,
        is_company: customer.type === 'business',
      };

      if (customer.email) partnerData.email = customer.email;
      if (customer.phone) partnerData.phone = customer.phone;
      if (customer.address) partnerData.street = customer.address;
      
      if (customer.company && customer.company !== customer.name) {
        partnerData.comment = `Công ty: ${customer.company}`; 
      }

      let odooId = customer.odooPartnerId ? Number(customer.odooPartnerId) : null;

      if (!odooId) {
        const searchDomain: any[] = [];
        
        if (customer.email) {
          searchDomain.push(['email', '=', customer.email]);
        } else if (customer.phone) {
          searchDomain.push(['phone', '=', customer.phone]);
        }

        if (searchDomain.length > 0) {
          const searchResponse = await axios.post(`${config.url}/jsonrpc`, {
            jsonrpc: '2.0', method: 'call',
            params: {
              service: 'object', method: 'execute_kw',
              args: [config.db, uid, config.password, 'res.partner', 'search', [searchDomain]],
            }, id: 7,
          });

          if (searchResponse.data.result && searchResponse.data.result.length > 0) {
            odooId = searchResponse.data.result[0];
          }
        }
      }

      if (odooId) {
        const updateResponse = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0', method: 'call',
          params: {
            service: 'object', method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.partner', 'write', [[odooId], partnerData]],
          }, id: 2,
        });

        if (updateResponse.data.error) {
          const errMsg = updateResponse.data.error.data?.message || '';
          if (errMsg.includes('does not exist') || errMsg.includes('missing')) {
            this.logger.warn(`Khách hàng ID ${odooId} không còn tồn tại trên Odoo. Sẽ tiến hành tạo mới.`);
            odooId = null;
          } else {
            this.logger.error(`Odoo từ chối cập nhật khách hàng ${customer.name}:`, JSON.stringify(updateResponse.data.error.data, null, 2));
            return null;
          }
        } else {
          this.logger.log(`Đã cập nhật khách hàng ${customer.name} (ID: ${odooId}) trên Odoo`);
          return odooId;
        }
      }

      if (!odooId) {
        const createResponse = await axios.post(`${config.url}/jsonrpc`, {
          jsonrpc: '2.0', method: 'call',
          params: {
            service: 'object', method: 'execute_kw',
            args: [config.db, uid, config.password, 'res.partner', 'create', [partnerData]],
          }, id: 3,
        });

        if (createResponse.data.error) {
          this.logger.error(`Odoo từ chối tạo khách hàng ${customer.name}:`, JSON.stringify(createResponse.data.error.data, null, 2));
          return null;
        }

        const newId = createResponse.data.result;
        this.logger.log(`Đã tạo mới khách hàng ${customer.name} (ID: ${newId}) trên Odoo`);
        return newId;
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Đồng bộ khách hàng ${customer.name} sang Odoo thất bại`, error?.message || error);
      return null;
    }
  }

    async pullUpdatedPartners(config: OdooConfig, lastSyncDate: Date | null): Promise<any[]> {
    if (!config.url || !config.db) return [];

    try {
      const uid = await this.authenticate(config);
      
      const domain: any[] = [];

      if (lastSyncDate) {
        const dateStr = lastSyncDate.toISOString().slice(0, 19).replace('T', ' ');
        domain.push(['write_date', '>', dateStr]);
      }

      const response = await axios.post(`${config.url}/jsonrpc`, {
        jsonrpc: '2.0', method: 'call',
        params: {
          service: 'object', method: 'execute_kw',
          args: [
            config.db, uid, config.password, 
            'res.partner', 'search_read', 
            [domain], 
            { fields: ['id', 'name', 'email', 'phone', 'street', 'is_company', 'user_ids'], limit: 100 } 
          ],
        }, id: 9,
      });

      if (response.data.error) {
        this.logger.error('Odoo từ chối lấy dữ liệu:', JSON.stringify(response.data.error.data, null, 2));
        return [];
      }

      return response.data.result || [];
    } catch (error: any) {
      this.logger.error('Lỗi khi kéo dữ liệu từ Odoo', error?.message || error);
      return [];
    }
  }
}