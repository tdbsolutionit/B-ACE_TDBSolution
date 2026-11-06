import { useEffect } from 'react';
import { api, ApiError } from '@/lib/auth';

export function useSessionCheck() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await api('/auth/me', {}, true);
        } catch (error) {
           if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
             return; 
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}