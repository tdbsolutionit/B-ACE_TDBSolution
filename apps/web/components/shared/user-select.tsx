'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/auth';
import { Search, ChevronDown, Check } from 'lucide-react';

type UserOption = {
  id: string;
  name: string;
};

interface UserSelectProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  defaultLabel?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function UserSelect({ name, required, defaultValue, defaultLabel = '-- Chọn nhân viên --', onChange, ...props }: UserSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<UserOption | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    api<UserOption[]>('/users')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        setUsers(list);
        
        if (defaultValue) {
          const found = list.find(u => u.id === defaultValue);
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

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (u: UserOption) => {
    setSelected(u);
    setIsOpen(false);
    setSearchTerm('');
    
    if (onChange) {
      const event = {
        target: { value: u.id, name: name || '' },
        currentTarget: { value: u.id, name: name || '' },
        type: 'change',
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input type="hidden" name={name} value={selected?.id || ''} required={required} {...props} />
      
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ul className="p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-center text-muted-foreground">Không tìm thấy nhân viên.</li>
            )}
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="truncate text-left">{u.name}</span>
                  {selected?.id === u.id && <Check size={14} className="text-primary shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}