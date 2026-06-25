import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, Users, FileText, IndianRupee, Wrench, Info } from 'lucide-react';
import { api } from '../lib/api';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  entity_id: string | null;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function activityIcon(type: string) {
  if (type?.includes('tenant')) return Users;
  if (type?.includes('lease')) return FileText;
  if (type?.includes('rent') || type?.includes('payment')) return IndianRupee;
  if (type?.includes('maintenance')) return Wrench;
  return Info;
}

function activityColor(type: string) {
  if (type?.includes('tenant')) return 'var(--primary)';
  if (type?.includes('lease')) return 'var(--accent)';
  if (type?.includes('rent') || type?.includes('payment')) return '#22c55e';
  if (type?.includes('maintenance')) return 'var(--warning)';
  return 'var(--ink-dim)';
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [seenCount, setSeenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Fetch activity
  const fetchActivity = async () => {
    try {
      const res = await api.get('/api/dashboard/activity');
      setItems(res.data.data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = Math.max(0, items.length - seenCount);

  const handleOpen = () => {
    setOpen(v => {
      if (!v) {
        // Mark all as seen when opening
        setSeenCount(items.length);
      }
      return !v;
    });
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
        style={{
          background: open ? 'var(--primary-dim)' : 'transparent',
          color: open ? 'var(--primary)' : 'var(--ink-dim)',
          border: '1px solid transparent',
        }}
        onMouseEnter={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,234,240,0.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-dim)';
          }
        }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white"
            style={{
              width: 16,
              height: 16,
              fontSize: 9,
              fontWeight: 700,
              background: 'var(--primary)',
              boxShadow: '0 0 6px var(--primary-glow)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-full top-0 ml-2 animate-fade-in"
          style={{
            width: 320,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.01em' }}
            >
              Notifications
            </span>
            <button
              onClick={() => setOpen(false)}
              className="btn-icon w-6 h-6"
              style={{ minWidth: 'unset' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-8 h-8" style={{ color: 'var(--ink-dim)', opacity: 0.3 }} />
                <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>No notifications yet</p>
              </div>
            ) : (
              items.map((item, idx) => {
                const Icon = activityIcon(item.type);
                const color = activityColor(item.type);
                const isNew = idx < unread + (open ? 0 : 0); // just styling
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 px-4 py-3 transition-colors duration-100"
                    style={{
                      borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(232,234,240,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <div
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ background: `${color}18` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug" style={{ color: 'var(--ink)' }}>
                        {item.message}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
