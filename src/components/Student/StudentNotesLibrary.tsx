import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { StudyMaterial } from '../../types';
import { NotesViewerModal } from '../Common/NotesViewerModal';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  Eye,
} from 'lucide-react';

interface StudentNotesLibraryProps {
  initialDetailMaterialId?: string;
}

export const StudentNotesLibrary: React.FC<StudentNotesLibraryProps> = ({
  initialDetailMaterialId,
}) => {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // In-app Reader Modal
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.student.getMaterials();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    if (initialDetailMaterialId && materials.length > 0) {
      const match = materials.find((m) => m.id === initialDetailMaterialId);
      if (match) setActiveMaterial(match);
    }
  }, [initialDetailMaterialId, materials]);

  const handleToggleBookmark = async (id: string) => {
    try {
      const res = await api.student.toggleBookmark(id);
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_bookmarked: res.is_bookmarked } : m))
      );
      if (activeMaterial && activeMaterial.id === id) {
        setActiveMaterial({ ...activeMaterial, is_bookmarked: res.is_bookmarked });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const subjects = useMemo(() => {
    const present = Array.from(
      new Set(materials.map((m) => (m.subject || '').trim()).filter(Boolean))
    );
    if (present.length === 0) {
      return ['All', 'Physics', 'Mathematics', 'Chemistry', 'Biology'];
    }
    return ['All', ...present];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (bookmarkedOnly && !m.is_bookmarked) return false;
      if (selectedSubject !== 'All' && (m.subject || '').trim().toLowerCase() !== selectedSubject.trim().toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${m.title || ''} ${m.subject || ''} ${m.chapter || ''} ${m.topic || ''} ${m.description || ''} ${m.content_text || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, search, selectedSubject, bookmarkedOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span>My Study Notes & Resources</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Read chapter notes, access revision sheets, practice questions, and download materials offline.
        </p>
      </div>

      {/* Subject Pills & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSubject === sub
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Bookmarked Filter Toggle */}
          <button
            type="button"
            onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              bookmarkedOnly
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${bookmarkedOnly ? 'fill-amber-600' : ''}`} />
            <span>Saved Notes</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            id="student-notes-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by chapter, formula, or keyword..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Grid of Notes */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading study notes library...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="col-span-full py-12 text-center space-y-2">
            <p className="text-slate-400 text-xs">
              {materials.length === 0
                ? 'No study notes have been uploaded for your class yet.'
                : 'No study notes found matching your current filters.'}
            </p>
            {materials.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedSubject('All');
                  setBookmarkedOnly(false);
                }}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredMaterials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-xs transition-all group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {m.subject}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(m.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {m.is_bookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {m.title}
                </h3>

                <div className="text-[11px] text-slate-500 font-medium">
                  Chapter: <span className="text-slate-700">{m.chapter}</span> • {m.topic || 'General'}
                </div>

                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                  {m.description || m.content_text?.substring(0, 100)}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>

                <button
                  type="button"
                  onClick={() => setActiveMaterial(m)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Read Full Notes</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full In-App Reader Modal */}
      {activeMaterial && (
        <NotesViewerModal
          material={activeMaterial}
          onClose={() => setActiveMaterial(null)}
          onToggleBookmark={handleToggleBookmark}
          isStudent
        />
      )}
    </div>
  );
};
