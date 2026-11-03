'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/auth';
import { Search, ChevronDown, Check } from 'lucide-react';

type CustomerOption = {
  id: string;
  name: string;
  company?: string | null;
};

interface CustomerSelectProps {
  name: string;
  required?: boolean;
  defaultValue?: string;
  defaultLabel?: string;
}

export function CustomerSelect({ name, required, defaultValue, defaultLabel = '-- Chọn khách hàng --' }: CustomerSelectProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    api<{ data: CustomerOption[] } | CustomerOption[]>('/customers?limit=1000')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.data || []);
        setCustomers(list);
        
        if (defaultValue) {
          const found = list.find(c => c.id === defaultValue);
          if (found) setSelected(found);
        }
      })
      .catch(console.error)
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [defaultValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <input type="hidden" name={name} value={selected?.id || ''} required={required} />
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground'}>
          {loading ? 'Đang tải...' : selected ? selected.name : defaultLabel}
        </span>
        <ChevronDown size={16} className="text-muted-foreground ml-2 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
          <div className="sticky top-0 bg-card p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
                placeholder="Tìm kiếm khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ul className="p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-center text-muted-foreground">Không tìm thấy khách hàng.</li>
            )}
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(c);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="truncate text-left">{c.name} {c.company && c.company !== c.name ? `(${c.company})` : ''}</span>
                  {selected?.id === c.id && <Check size={14} className="text-primary shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}