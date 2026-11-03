export interface IIntegrationProvider {
  // Kiểm tra xem kết nối có thành công không
  testConnection(config: any): Promise<boolean>;
  
  // Đồng bộ 1 khách hàng sang hệ thống đích
  syncCustomer(customer: any, config: any): Promise<string | null>; 
  
  // (Mở rộng sau này) Đồng bộ ngược từ hệ thống đích về CRM
  // fetchCustomers(config: any): Promise<any[]>; 
}