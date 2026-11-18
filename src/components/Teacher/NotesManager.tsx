import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { StudyMaterial, MaterialAttachment } from '../../types';
import { NotesViewerModal } from '../Common/NotesViewerModal';
import { ALL_CLASSES, COMMON_SUBJECTS } from '../../constants/academic';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Trash2,
  Download,
  FileText,
  Bookmark,
  Layers,
  Sparkles,
  X,
  UploadCloud,
  Image as ImageIcon,
  Paperclip,
  Film,
  ExternalLink,
} from 'lucide-react';

interface NotesManagerProps {
  initialDetailMaterialId?: string;
}

export const NotesManager: React.FC<NotesManagerProps> = ({ initialDetailMaterialId }) => {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<StudyMaterial | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [className, setClassName] = useState('All Classes');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [materialType, setMaterialType] = useState<'pdf' | 'notes' | 'image' | 'video' | 'worksheet' | 'link'>('pdf');
  const [description, setDescription] = useState('');
  const [contentText, setContentText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getMaterials();
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

  const subjectOptions = useMemo(() => {
    const set = new Set<string>(COMMON_SUBJECTS.filter((s) => s !== 'All Subjects'));
    materials.forEach((m) => {
      if (m.subject) set.add(m.subject);
    });
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((mat) => {
      if (subjectFilter && (mat.subject || '').trim().toLowerCase() !== subjectFilter.trim().toLowerCase()) {
        return false;
      }
      if (classFilter && (mat.class_name || '').trim().toLowerCase() !== classFilter.trim().toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${mat.title || ''} ${mat.chapter || ''} ${mat.topic || ''} ${mat.subject || ''} ${mat.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, search, subjectFilter, classFilter]);

  useEffect(() => {
    if (initialDetailMaterialId && materials.length > 0) {
      const match = materials.find((m) => m.id === initialDetailMaterialId);
      if (match) setSelectedMaterialForView(match);
    }
  }, [initialDetailMaterialId, materials]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isVid = file.type.startsWith('video/');

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (isImg) {
          setPreviewImages((prev) => [...prev, dataUrl]);
        }
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: dataUrl,
            dataUrl,
            type: isImg ? 'image' : isPdf ? 'pdf' : isVid ? 'video' : 'document',
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a Resource Title');
      return;
    }
    setSubmitting(true);

    try {
      let normalizedExternalUrl = externalUrl.trim();
      if (normalizedExternalUrl && !/^https?:\/\//i.test(normalizedExternalUrl) && !normalizedExternalUrl.startsWith('data:')) {
        normalizedExternalUrl = `https://${normalizedExternalUrl}`;
      }

      const primaryUrl = attachments.length > 0 ? attachments[0].url : normalizedExternalUrl || '';
      const primaryFileName = attachments.length > 0 ? attachments[0].name : `${title.trim().replace(/\s+/g, '_')}.pdf`;
      const primarySize = attachments.length > 0 ? attachments[0].size : '1.5 MB';

      await api.teacher.createMaterial({
        title: title.trim(),
        subject,
        class_name: className,
        chapter: chapter.trim() || 'General',
        topic: topic.trim() || 'General',
        material_type: materialType,
        description: description.trim(),
        content_text: contentText.trim(),
        file_name: primaryFileName,
        file_url: primaryUrl,
        file_size: primarySize,
        external_url: normalizedExternalUrl || undefined,
        allow_download: allowDownload,
        attachments,
        preview_images: previewImages,
      });

      setIsAddModalOpen(false);
      // Reset
      setTitle('');
      setChapter('');
      setTopic('');
      setDescription('');
      setContentText('');
      setExternalUrl('');
      setAttachments([]);
      setPreviewImages([]);
      await loadMaterials();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save study material.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study resource?')) return;
    try {
      await api.teacher.deleteMaterial(id);
      await loadMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Study Notes & Rich Media Repository</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload PDFs, handwritten notes, ray diagrams, formula cheat sheets, and videos for students.
          </p>
        </div>

        <button
          id="open-upload-notes-modal-btn"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Material (Pics / PDF / Extra)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by title, topic, or chapter..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Classes</option>
            <option value="All Classes">All Classes (Shared)</option>
            {ALL_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading resources...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Study Materials Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {materials.length === 0
              ? 'Get started by uploading your lecture notes, formula PDFs, and diagrams for students.'
              : 'No study materials match your current search or filter selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((mat) => {
            const hasAttachments = mat.attachments && mat.attachments.length > 0;
            const previewImg = mat.preview_images?.[0] || (mat.material_type === 'image' ? mat.file_url : null);

            return (
              <div
                key={mat.id}
                onClick={() => setSelectedMaterialForView(mat)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Subject & Class Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                        {mat.subject}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600">
                        {mat.class_name}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {mat.material_type || 'PDF'}
                    </span>
                  </div>

                  {/* Thumbnail if picture note */}
                  {previewImg && (
                    <div className="mb-3 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={previewImg} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {mat.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {mat.description || mat.chapter || 'Chapter reference notes'}
                  </p>

                  {/* Attachments pills & External URL */}
                  {(hasAttachments || mat.external_url || (mat.file_url && mat.file_url.startsWith('http'))) && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      {hasAttachments && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                          <Paperclip className="w-3 h-3 text-indigo-500" />
                          <span>{mat.attachments?.length} File(s)</span>
                        </span>
                      )}
                      {(mat.external_url || (mat.file_url && mat.file_url.startsWith('http'))) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-medium text-indigo-700">
                          <ExternalLink className="w-3 h-3 text-indigo-600" />
                          <span>Online Resource</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(mat.created_at).toLocaleDateString()}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMaterialForView(mat);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                      title="View Notes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(mat.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload New Notes Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Upload Study Notes & Rich Media</h2>
                  <p className="text-xs text-slate-500">Attach PDFs, photos, diagrams, and extra material formats</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electromagnetic Induction Master Revision Notes"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All Classes">All Classes (All Students)</option>
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjectOptions.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="image">Diagram / Photo</option>
                    <option value="notes">Handwritten Notes</option>
                    <option value="worksheet">Practice Worksheet</option>
                    <option value="video">Video Lecture</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter</label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Ray Optics"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Prism Formula & Dispersion"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Key Highlights</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of formulas, derivation points, and key questions included..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* External URL or Cloud Resource Link */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Direct Web Link / Google Drive / Video URL</span>
                  </span>
                  <span className="text-[10px] font-normal text-indigo-600">Optional</span>
                </label>
                <input
                  type="text"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="Paste Google Drive, YouTube, Dropbox, or PDF link (e.g. drive.google.com/...)"
                  className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Students will be able to click and open this link directly from their study material viewer.
                </p>
              </div>

              {/* Multi-Format File Attachment Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Attach Files (PDFs, Images, Diagrams, Sheets)
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Upload Picture / Diagram</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Upload PDF Notes</span>
                    <input
                      type="file"
                      accept="application/pdf,.doc,.docx"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Attached items list */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((att, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {att.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className="truncate font-medium text-slate-800">{att.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({att.size})</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Markdown or Formula Text Notes (Optional)</label>
                <textarea
                  rows={4}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Paste formulas, derivation steps, or markdown notes here..."
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit / Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {submitting ? 'Uploading...' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Viewer Modal */}
      {selectedMaterialForView && (
        <NotesViewerModal
          material={selectedMaterialForView}
          onClose={() => setSelectedMaterialForView(null)}
          isStudent={false}
        />
      )}
    </div>
  );
};
