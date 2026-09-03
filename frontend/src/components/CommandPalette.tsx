import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Users,
  FileText,
  IndianRupee,
  Wrench,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useProperties, useTenants, useLeases, useMaintenanceRequests } from '../hooks/useApi';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (type: string, id?: string) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: leases = [] } = useLeases();
  const { data: maintenance = [] } = useMaintenanceRequests();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Filter items
  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q));
  const filteredLeases = leases.filter(l => l.tenant?.name?.toLowerCase().includes(q) || l.unit?.unit_number?.toLowerCase().includes(q));
  const filteredMaintenance = maintenance.filter(m => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));

  const hasResults =
    filteredProperties.length > 0 ||
    filteredTenants.length > 0 ||
    filteredLeases.length > 0 ||
    filteredMaintenance.length > 0;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-modal-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <Search className="w-5 h-5 text-[var(--primary)] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type to search properties, tenants, leases, or tickets... (ESC to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--ink)] placeholder-[var(--ink-dim)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[rgba(232,234,240,0.08)] text-[var(--ink-dim)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {q === '' && (
            <div className="p-4 text-center text-xs text-[var(--ink-dim)] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Quick Navigation: Type property names, tenant phone numbers, or invoice codes</span>
            </div>
          )}

          {!hasResults && q !== '' && (
            <div className="py-8 text-center text-sm text-[var(--ink-dim)]">
              No matching results found for "<span className="text-[var(--ink)]">{query}</span>"
            </div>
          )}

          {/* Properties */}
          {filteredProperties.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
                Properties ({filteredProperties.length})
              </div>
              {filteredProperties.slice(0, 3).map(p => (
                <div
                  key={p.id}
                  onClick={() => handleNavigate('/properties')}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--primary-dim)] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{p.name}</p>
                      <p className="text-xs text-[var(--ink-dim)]">{p.city} • {p.total_units} Units</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--ink-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {/* Tenants */}
          {filteredTenants.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
                Tenants ({filteredTenants.length})
              </div>
              {filteredTenants.slice(0, 3).map(t => (
                <div
                  key={t.id}
                  onClick={() => handleNavigate('/tenants')}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--accent-dim)] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{t.name}</p>
                      <p className="text-xs text-[var(--ink-dim)]">{t.phone} • {t.profession || 'Tenant'}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--ink-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {/* Maintenance */}
          {filteredMaintenance.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
                Maintenance Tickets ({filteredMaintenance.length})
              </div>
              {filteredMaintenance.slice(0, 3).map(m => (
                <div
                  key={m.id}
                  onClick={() => handleNavigate('/maintenance')}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[rgba(245,158,11,0.12)] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-[var(--warning)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{m.title}</p>
                      <p className="text-xs text-[var(--ink-dim)]">{m.category} • Priority: {m.priority}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--ink-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--ink-dim)] bg-[rgba(15,17,23,0.6)]">
          <span>Navigate with click or arrow keys</span>
          <span className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">CTRL + K</span>
        </div>
      </div>
    </div>
  );
}
