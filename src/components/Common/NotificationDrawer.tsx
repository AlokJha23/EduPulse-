import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { Bell, Check, X, BookOpen, FileCheck2, HelpCircle, Megaphone, Award } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  onNavigate?: (view: string, detailId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen = true,
  onClose,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string, item?: NotificationItem) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (item && onNavigate) {
        if (item.type === 'material') onNavigate('notes', item.reference_id);
        else if (item.type === 'assignment') onNavigate('assignments', item.reference_id);
        else if (item.type === 'test') onNavigate('tests', item.reference_id);
        else if (item.type === 'marks') onNavigate('marks');
        else if (item.type === 'announcement') onNavigate('announcements', item.reference_id);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'material':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'assignment':
        return <FileCheck2 className="w-4 h-4 text-amber-500" />;
      case 'test':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'marks':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <>
      {/* Backdrop for easy closing on touch/click outside */}
      <div
        id="notifications-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
      />

      {/* Notification Modal Card */}
      <div
        id="notifications-dropdown-menu"
        className="fixed top-16 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                {notifications.filter((n) => !n.is_read).length} new
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.is_read) && (
              <button
                id="mark-all-read-btn"
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                Mark all as read
              </button>
            )}
            <button
              id="close-notifications-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
              <span>No notifications right now.</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id, item)}
                className={`p-3 text-xs transition-colors flex items-start gap-3 cursor-pointer ${
                  item.is_read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50/80 font-medium'
                }`}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900">{item.title}</h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{item.message}</p>
                </div>
                {!item.is_read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
