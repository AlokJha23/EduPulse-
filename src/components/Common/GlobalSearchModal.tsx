import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Search, X, Users, BookOpen, FileCheck2, Megaphone, ArrowRight, HelpCircle } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, detailId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 20);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setResults(res.results || []);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (item: any) => {
    if (item.type === 'student') {
      onNavigate('students', item.id);
    } else if (item.type === 'material') {
      onNavigate('notes', item.id);
    } else if (item.type === 'assignment') {
      onNavigate('assignments', item.id);
    } else if (item.type === 'test') {
      onNavigate('tests', item.id);
    } else if (item.type === 'announcement') {
      onNavigate('announcements', item.id);
    }
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'material':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'assignment':
        return <FileCheck2 className="w-4 h-4 text-amber-500" />;
      case 'test':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-rose-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      id="global-search-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="global-search-modal-card"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, study notes, homework, announcements..."
            className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Searching records...</div>
          ) : query && results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records found for "{query}"
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-100 text-left flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-white border border-slate-200/60">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Type keywords to search across students, notes, and tasks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
