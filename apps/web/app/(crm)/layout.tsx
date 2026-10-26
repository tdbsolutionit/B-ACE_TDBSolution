import { AppShell } from '@/components/layout/app-shell';

export default function CrmLayout({ 
  children,
  modal, 
}: { 
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      {modal} 
    </AppShell>
  );
}