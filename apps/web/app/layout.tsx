import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { RealtimeProvider } from '@/lib/realtime';
import { Toaster } from '@/components/ui/toast';
import { ChatProvider } from '@/lib/chat';
import { ChatWidget } from '@/components/chat/chat-widget';

export const metadata: Metadata = {
  title: 'B-ACE SME',
  description: 'CRM cho doanh nghiệp SME Việt Nam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <RealtimeProvider>
            <ChatProvider>
              {children}
              <ChatWidget />
            </ChatProvider>
          </RealtimeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}