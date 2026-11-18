import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Announcement } from '../../types';
import {
  Megaphone,
  AlertTriangle,
  Bell,
  Calendar,
  Film,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Play,
} from 'lucide-react';

interface StudentAnnouncementsProps {
  initialDetailAnnouncementId?: string;
}

export const StudentAnnouncements: React.FC<StudentAnnouncementsProps> = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.student.getAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-rose-600" />
          <span>School & Class Notice Board</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Important announcements, special video lectures, schedule alerts, and circulars broadcasted by faculty.
        </p>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading notices...
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No notices published right now.
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 bg-white rounded-2xl border shadow-2xs transition-all ${
                ann.priority === 'urgent'
                  ? 'border-red-200 bg-red-50/20'
                  : ann.priority === 'important'
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ann.priority === 'urgent'
                          ? 'bg-red-100 text-red-800'
                          : ann.priority === 'important'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ann.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      Target: {ann.target_value || 'Class Notice'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {ann.message}
                  </p>

                  {/* Embedded Video Lecture if attached */}
                  {ann.video_url && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 max-w-2xl bg-black">
                      {ann.video_title && (
                        <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-rose-500" />
                          <span>{ann.video_title}</span>
                        </div>
                      )}
                      {ann.video_url.includes('youtube.com/embed') || ann.video_url.includes('vimeo.com') ? (
                        <div className="aspect-video w-full">
                          <iframe
                            src={ann.video_url}
                            title={ann.video_title || 'Video lecture'}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      ) : ann.video_url.endsWith('.mp4') || ann.video_url.startsWith('data:video') ? (
                        <video controls className="w-full max-h-80 object-cover" src={ann.video_url}>
                          Your browser does not support HTML video.
                        </video>
                      ) : (
                        <div className="p-4 bg-slate-900 flex items-center justify-between text-white">
                          <div className="flex items-center gap-2 text-xs">
                            <Film className="w-4 h-4 text-rose-400" />
                            <span className="truncate max-w-sm">{ann.video_url}</span>
                          </div>
                          <a
                            href={ann.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Open Link
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments (PDFs / Photos) */}
                  {ann.attachments && ann.attachments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {ann.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        >
                          {att.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                          ) : att.type === 'video' ? (
                            <Film className="w-4 h-4 text-rose-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-600" />
                          )}
                          <span>{att.name}</span>
                          <Download className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(ann.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
