'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loading } from '@/components/shared/loading';
import { CustomerTickets } from '@/components/customers/customer-tickets';
import { toast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/use-permission';

import { CustomerDetailHeader } from './_components/customer-detail-header';
import { CustomerInfoCard } from './_components/customer-info-card';
import { CustomerStatsGrid } from './_components/customer-stats-grid';
import { CustomerTabs } from './_components/customer-tabs';
import { InfoTab } from './_components/tabs/info-tab';
import { ProjectsTab } from './_components/tabs/projects-tab';
import { ActivitiesTab } from './_components/tabs/activities-tab';
import { NotesTab } from './_components/tabs/notes-tab';
import { EditCustomerModal } from './_components/modals/edit-customer-modal';
import { AddProjectModal } from './_components/modals/add-project-modal';

import { useCustomerDetail } from './_hooks/use-customer-detail';
import { useOpportunityStages } from './_hooks/use-opportunity-stages';
import { customerDetailService } from './_services/customer-detail.service';
import { CUSTOMER_CHANGED_EVENT } from './_constants';
import type {
  CreateProjectPayload,
  CustomerTabId,
  UpdateCustomerPayload,
} from './_types';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isFullMode = searchParams.get('full') === '1';

  const { customer, error, reload, setError } = useCustomerDetail(params?.id);
  const stages = useOpportunityStages();
  const perm = usePermission();

  const [activeTab, setActiveTab] = useState<CustomerTabId>('info');
  const [editOpen, setEditOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setNotes(customer.notes || '');
    if (customer.opportunities.length > 0) {
      setActiveTab('projects');
    }
  }, [customer?.id]);

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaved(false);
  }

  async function handleConvert() {
    if (!customer) return;
    try {
      await customerDetailService.convert(customer.id);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateCustomer(payload: UpdateCustomerPayload) {
    if (!customer) return;
    try {
      const updated = await customerDetailService.update(customer.id, payload);
      setEditOpen(false);
      window.dispatchEvent(
        new CustomEvent(CUSTOMER_CHANGED_EVENT, { detail: updated })
      );
      toast.success('Đã cập nhật thông tin khách hàng');
      await reload();
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi khi cập nhật khách hàng');
    }
  }

  async function handleSaveNotes() {
    if (!customer) return;
    try {
      await customerDetailService.updateNotes(customer.id, notes);
      setNotesSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddProject(payload: Omit<CreateProjectPayload, 'customerId'>) {
    if (!customer) return;
    try {
      await customerDetailService.createProject({
        ...payload,
        customerId: customer.id,
      });
      setAddProjectOpen(false);
      toast.success('Đã thêm dự án mới');
      await reload();
      setActiveTab('projects');
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi khi thêm dự án');
    }
  }

  function handleActivitySaved() {
    reload().catch((err: Error) => setError(err.message));
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-medium text-destructive">Không tải được dữ liệu</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Loading text="Đang tải hồ sơ khách hàng" />;
  }

  return (
    <div className="w-full px-5 py-4">
      <CustomerDetailHeader
        customer={customer}
        isFullMode={isFullMode}
        onConvert={handleConvert}
        onEdit={() => setEditOpen(true)}
      />

      <CustomerInfoCard customer={customer} />

      <CustomerStatsGrid projects={customer.opportunities} />

      <div className="detail-card-compact">
        <CustomerTabs
          activeTab={activeTab}
          projectCount={customer.opportunities.length}
          onChange={setActiveTab}
        />

        {activeTab === 'info' && <InfoTab customer={customer} />}

        {activeTab === 'projects' && (
          <ProjectsTab
            projects={customer.opportunities}
            onAdd={() => setAddProjectOpen(true)}
          />
        )}

        {activeTab === 'activities' && (
          <ActivitiesTab
            customerId={customer.id}
            activities={customer.activities}
            onSaved={handleActivitySaved}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            saved={notesSaved}
            canUpdate={perm.has('customer:update')}
            onChange={handleNotesChange}
            onSave={handleSaveNotes}
          />
        )}
      </div>

      {editOpen && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdateCustomer}
        />
      )}

      {addProjectOpen && (
        <AddProjectModal
          customerName={customer.name}
          stages={stages}
          onClose={() => setAddProjectOpen(false)}
          onSubmit={handleAddProject}
        />
      )}

      <CustomerTickets customerId={customer.id} />
    </div>
  );
}