'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { IntegrationList } from './_components/integration-list';
import { IntegrationWorkspace } from './_components/integration-workspace';

export default function IntegrationsPage() {
  const [odooConfig, setOdooConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  function loadConfig() {
    setLoading(true);
    api<any>('/integrations/odoo')
      .then(setOdooConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const integrations = [
    {
      id: 'odoo',
      category: 'ERP & Kế toán',
      name: 'Odoo ERP',
      description: 'Đồng bộ khách hàng, đơn hàng sang Odoo.',
      icon: 'Boxes',
      isConnected: !!(odooConfig && odooConfig.url),
      hasError: odooConfig?.syncStatus === 'error',
      isActive: odooConfig?.isActive !== false,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      <IntegrationList 
        integrations={integrations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        search={search}
        onSearchChange={setSearch}
      />
      
      <IntegrationWorkspace 
        selectedId={selectedId}
        odooConfig={odooConfig}
        onRefresh={loadConfig}
      />
    </div>
  );
}