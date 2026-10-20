export const kpis = [
  { label: 'Tổng lead tháng này', value: '426', change: '18,6%', note: 'so với tháng trước', icon: 'users', tone: 'blue', bars: [3, 5, 4, 7, 6, 9, 8, 11, 10, 13] },
  { label: 'Tỷ lệ chuyển đổi', value: '24,8%', change: '4,2%', note: 'so với tháng trước', icon: 'trending', tone: 'green', bars: [3, 3, 5, 4, 6, 5, 8, 7, 10, 11] },
  { label: 'Doanh thu dự kiến', value: '1,85', unit: 'tỷ ₫', change: '12,5%', note: 'so với tháng trước', icon: 'wallet', tone: 'violet', bars: [4, 6, 4, 8, 7, 6, 10, 9, 12, 13] },
  { label: 'Cơ hội đang mở', value: '68', change: '8', note: 'cơ hội mới tuần này', icon: 'target', tone: 'amber', bars: [3, 4, 5, 4, 7, 6, 8, 9, 7, 11] },
];

export const leadSources = [
  { name: 'Website', value: 124 },
  { name: 'Zalo', value: 96 },
  { name: 'Facebook', value: 82 },
  { name: 'Email', value: 54 },
  { name: 'Giới thiệu', value: 42 },
  { name: 'Khác', value: 28 },
];

export const revenue = [
  { name: 'T5', actual: 180, expected: 210 },
  { name: 'T6', actual: 240, expected: 280 },
  { name: 'T7', actual: 215, expected: 310 },
  { name: 'T8', actual: 330, expected: 370 },
  { name: 'T9', actual: 300, expected: 410 },
  { name: 'T10', actual: 425, expected: 480 },
];

export const stageLegend = [
  { label: 'Lead mới', count: 16 },
  { label: 'Đã liên hệ', count: 12 },
  { label: 'Đang tư vấn', count: 15 },
  { label: 'Báo giá', count: 11 },
  { label: 'Đàm phán', count: 8 },
  { label: 'Thắng / Thua', count: 6 },
];

export const todayTasks = [
  { id: '1', title: 'Gọi điện tư vấn gói dịch vụ SME', customer: 'Công ty TNHH An Phát', priority: 'Cao', time: '09:00', done: true },
  { id: '2', title: 'Gửi báo giá dự án website', customer: 'Công ty CP Đại Việt', priority: 'Cao', time: '10:30', done: false },
  { id: '3', title: 'Follow-up hợp đồng quảng cáo', customer: 'Công ty TNHH Minh Long', priority: 'Trung bình', time: '14:00', done: false },
  { id: '4', title: 'Họp review chiến dịch tháng 10', customer: 'Nội bộ', priority: 'Trung bình', time: '15:30', done: false },
  { id: '5', title: 'Cập nhật trạng thái khách hàng', customer: 'Công ty TNHH Hoàng Gia', priority: 'Thấp', time: '16:30', done: false },
];

export const activities = [
  { customer: 'Công ty TNHH An Phát', company: 'An Phat Co., Ltd', type: 'Cuộc gọi', text: 'Tư vấn gói dịch vụ quảng cáo', owner: 'Nguyễn Minh Anh', time: '5 phút trước', status: 'Hoàn thành' },
  { customer: 'Công ty CP Đại Việt', company: 'Dai Viet JSC', type: 'Email', text: 'Gửi báo giá dự án website', owner: 'Trần Thị Lan', time: '20 phút trước', status: 'Hoàn thành' },
  { customer: 'Công ty TNHH Minh Long', company: 'Minh Long Co., Ltd', type: 'Zalo', text: 'Hỏi thăm sau bán hàng', owner: 'Lê Văn Hùng', time: '1 giờ trước', status: 'Đang xử lý' },
  { customer: 'Công ty TNHH Hoàng Gia', company: 'Hoang Gia Co., Ltd', type: 'Cuộc họp', text: 'Demo sản phẩm cho khách hàng', owner: 'Nguyễn Minh Anh', time: '2 giờ trước', status: 'Hoàn thành' },
  { customer: 'Công ty CP Thịnh Vượng', company: 'Thinh Vuong JSC', type: 'Cuộc gọi', text: 'Xác nhận lịch ký hợp đồng', owner: 'Trần Thị Lan', time: '3 giờ trước', status: 'Đang xử lý' },
];

export type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  type: 'individual' | 'business';
  status: 'lead' | 'active' | 'inactive';
  sourceName: string | null;
  assigneeName: string | null;
  oppCount: number;
  openOppCount: number;
  createdAt: string;
  notes?: string | null;
  taxCode?: string | null;
  industry?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export const stages = ['Lead mới', 'Đã liên hệ', 'Đang tư vấn', 'Báo giá', 'Đàm phán', 'Thắng'];

export type ProjectRow = {
  id: string;
  name: string;
  customerId: string;
  customer: string;
  stage: string;
  stageColor: string;
  value: number;
  probability: number;
  closeDate: string;
  status: 'open' | 'won' | 'lost';
  isLead: boolean;
  owner: string;
};

export type DocCard = {
  id: string;
  projectId: string;
  kind: 'proposal' | 'quote' | 'po';
  number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  price: number;
  date: string;
};

export const sampleDocs: DocCard[] = [
  { id: 'd1', projectId: 'o1', kind: 'proposal', number: 'DX-0001', title: 'Đề xuất gói quảng cáo quý 4', status: 'sent', price: 185000000, date: '2026-10-08' },
  { id: 'q1', projectId: 'o1', kind: 'quote', number: 'BG-0001', title: 'Báo giá website + quảng cáo', status: 'sent', price: 361500000, date: '2026-10-09' },
  { id: 'p1', projectId: 'o1', kind: 'po', number: 'PO-0001', title: 'Đơn hàng triển khai đợt 1', status: 'draft', price: 120000000, date: '2026-10-11' },
  { id: 'q2', projectId: 'o2', kind: 'quote', number: 'BG-0002', title: 'Báo giá website thương mại', status: 'draft', price: 520000000, date: '2026-10-06' },
  { id: 'q3', projectId: 'o3', kind: 'quote', number: 'BG-0003', title: 'Báo giá CRM', status: 'accepted', price: 610000000, date: '2026-09-28' },
];

export const sampleQuotes = [
  { id: 'q1', number: 'BG-0001', title: 'Báo giá website + quảng cáo', customer: 'Công ty TNHH An Phát', project: 'Gói quảng cáo SME', scenario: 'Trung', status: 'sent', price: 361500000 },
  { id: 'q2', number: 'BG-0002', title: 'Báo giá website thương mại', customer: 'Công ty CP Đại Việt', project: 'Website thương mại', scenario: 'Cao', status: 'draft', price: 520000000 },
  { id: 'q3', number: 'BG-0003', title: 'Báo giá CRM', customer: 'Công ty TNHH Hoàng Gia', project: 'CRM nội bộ', scenario: 'Tùy chỉnh', status: 'accepted', price: 610000000 },
];

export const sampleUsers = [
  { id: 'u1', name: 'Nguyễn Minh Anh', email: 'admin@b-ace.vn', role: 'admin', phone: '0901234567', status: 'active', createdAt: '2026-01-12' },
  { id: 'u2', name: 'Trần Thị Lan', email: 'lan@b-ace.vn', role: 'sales', phone: '0912345678', status: 'active', createdAt: '2026-03-02' },
  { id: 'u3', name: 'Lê Văn Hùng', email: 'hung@b-ace.vn', role: 'manager', phone: '0988123456', status: 'inactive', createdAt: '2026-04-19' },
];
