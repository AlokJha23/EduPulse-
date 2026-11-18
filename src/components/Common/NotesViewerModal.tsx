import React, { useState } from 'react';
import { StudyMaterial, MaterialAttachment } from '../../types';
import {
  X,
  BookOpen,
  Download,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Layers,
  GraduationCap,
  FileText,
  Sparkles,
  Image as ImageIcon,
  ExternalLink,
  Paperclip,
  ZoomIn,
} from 'lucide-react';

interface NotesViewerModalProps {
  material: StudyMaterial | null;
  onClose: () => void;
  onToggleBookmark?: (id: string) => void;
  isStudent?: boolean;
}

export const NotesViewerModal: React.FC<NotesViewerModalProps> = ({
  material,
  onClose,
  onToggleBookmark,
  isStudent,
}) => {
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  if (!material) return null;

  const handleDownload = (url?: string, name?: string) => {
    const targetUrl = url || material.file_url;
    if (targetUrl && (targetUrl.startsWith('http') || targetUrl.startsWith('data:'))) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = name || material.file_name || `${material.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Generate text blob download
      const element = document.createElement('a');
      const file = new Blob([material.content_text || material.description], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = material.file_name || `${material.title.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const allImages: string[] = [
    ...(material.preview_images || []),
    ...(material.attachments?.filter((a) => a.type === 'image').map((a) => a.url) || []),
    ...(material.material_type === 'image' && material.file_url ? [material.file_url] : []),
  ];

  return (
    <div
      id="notes-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 sm:p-6"
    >
      <div
        id="notes-viewer-modal"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                {material.subject}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700">
                {material.class_name} • Chapter: {material.chapter}
              </span>
              {material.material_type && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 uppercase">
                  {material.material_type}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{material.title}</h2>
            {material.topic && (
              <p className="text-xs text-slate-500 mt-0.5">Topic: {material.topic}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStudent && onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(material.id)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  material.is_bookmarked
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title={material.is_bookmarked ? 'Remove Bookmark' : 'Bookmark Note'}
              >
                {material.is_bookmarked ? (
                  <BookmarkCheck className="w-5 h-5 fill-amber-500" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
            )}

            {material.allow_download && (
              <button
                type="button"
                onClick={() => handleDownload()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Notes</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {material.description && (
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Instructor Summary:</strong> {material.description}
              </div>
            </div>
          )}

          {/* Formatted Content View */}
          {material.content_text && (
            <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 p-5 sm:p-6 rounded-xl border border-slate-200">
              {material.content_text}
            </div>
          )}

          {/* Attached Images / Diagrams Gallery */}
          {allImages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Diagrams, Photos & Handwritten Boards ({allImages.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPreviewImage(imgUrl)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-40 cursor-pointer"
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-3 py-1.5 bg-white/90 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Enlarge</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files / Extra format documents */}
          {material.attachments && material.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                <span>Attached Study Files & PDF Handouts</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {material.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        {att.type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{att.name}</h5>
                        <p className="text-[10px] text-slate-400">
                          {att.type.toUpperCase()} • {att.size || '1.8 MB'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(att.url, att.name)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0 transition-colors"
                      title="Download Attached Document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External URL or Online Resource Link */}
          {(material.external_url || (material.file_url && (material.file_url.startsWith('http://') || material.file_url.startsWith('https://')))) && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900">Direct Resource / Document URL</h4>
                  <p className="text-[11px] text-indigo-700 truncate max-w-md font-mono">
                    {material.external_url || material.file_url}
                  </p>
                </div>
              </div>

              <a
                href={material.external_url || material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                <span>Open Resource</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Primary file card if present */}
          {material.file_name && (!material.attachments || material.attachments.length === 0) && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  PDF
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{material.file_name}</h4>
                  <p className="text-[11px] text-slate-500">File size: {material.file_size || '2.4 MB'}</p>
                </div>
              </div>
              {material.allow_download && (
                <button
                  type="button"
                  onClick={() => handleDownload()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Uploaded by {material.teacher_name || 'Faculty'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(material.created_at).toLocaleDateString()}</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Academiq Offline-Ready Library
          </div>
        </div>
      </div>

      {/* Full Resolution Image Lightbox */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img src={selectedPreviewImage} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white rounded-full text-slate-900 shadow-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
