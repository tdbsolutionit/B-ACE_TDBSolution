import { toast } from '@/components/ui/toast';

export function handleApiError(error: any) {
  console.error("Chi tiết lỗi:", error);

  if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
    return toast.error('Mất kết nối đến máy chủ. Vui lòng kiểm tra mạng!');
  }

  try {
    const parsed = JSON.parse(error.message);
    
    if (parsed.statusCode === 400) {
      const msg = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
      return toast.error(`Dữ liệu không hợp lệ: ${msg}`);
    }
    if (parsed.statusCode === 403) {
      return toast.error('Bạn không có quyền thực hiện thao tác này!');
    }
    if (parsed.statusCode === 404) {
      return toast.error('Dữ liệu không tồn tại hoặc đã bị xóa!');
    }
    if (parsed.statusCode >= 500) {
      return toast.error('Hệ thống đang bảo trì. Vui lòng thử lại sau!');
    }
    return toast.error(parsed.message || 'Đã có lỗi xảy ra.');
  } catch {
    return toast.error(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
  }
}