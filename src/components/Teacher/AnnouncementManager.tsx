import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Announcement, AnnouncementAttachment } from '../../types';
import { ALL_CLASSES } from '../../constants/academic';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  Send,
  Film,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Play,
  Download,
  ExternalLink,
} from 'lucide-react';

interface AnnouncementManagerProps {
  initialDetailAnnouncementId?: string;
}

export const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({
  initialDetailAnnouncementId,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('important');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [targetType, setTargetType] = useState('class');
  const [targetValue, setTargetValue] = useState('All Students');
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

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
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: dataUrl,
            dataUrl,
            type: isVid ? 'video' : isImg ? 'image' : isPdf ? 'pdf' : 'document',
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both Title and Message for the announcement.');
      return;
    }
    setSubmitting(true);
    try {
      // Normalize YouTube embed URL or web URL
      let formattedVideoUrl = videoUrl.trim();
      if (formattedVideoUrl) {
        if (!/^https?:\/\//i.test(formattedVideoUrl)) {
          formattedVideoUrl = `https://${formattedVideoUrl}`;
        }
        if (formattedVideoUrl.includes('youtube.com/watch?v=')) {
          const videoId = formattedVideoUrl.split('watch?v=')[1]?.split('&')[0];
          if (videoId) formattedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (formattedVideoUrl.includes('youtu.be/')) {
          const videoId = formattedVideoUrl.split('youtu.be/')[1]?.split('?')[0];
          if (videoId) formattedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }

      await api.teacher.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        video_url: formattedVideoUrl || undefined,
        video_title: videoTitle.trim() || undefined,
        attachments,
        target_type: targetType,
        target_value: targetValue,
      });

      setIsAddModalOpen(false);
      setTitle('');
      setMessage('');
      setVideoUrl('');
      setVideoTitle('');
      setAttachments([]);
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement notice?')) return;
    try {
      await api.teacher.deleteAnnouncement(id);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-rose-600" />
            <span>Notices, Videos & Announcements Broadcaster</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast circulars, special video lectures, test alerts, and PDF guidelines to your students.
          </p>
        </div>

        <button
          id="open-create-announcement-modal-btn"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Notice / Video Broadcast</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notices...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Announcements Active</h3>
            <p className="text-xs text-slate-500">Publish a circular, lecture video, or notice for your batches.</p>
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border bg-white shadow-2xs transition-all ${
                item.priority === 'urgent'
                  ? 'border-red-200 ring-1 ring-red-100'
                  : item.priority === 'important'
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.priority === 'urgent'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'important'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.priority}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      Target: {item.target_value || 'All Batches'}
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </p>

                  {/* Video Embed Player */}
                  {item.video_url && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 max-w-2xl bg-black">
                      {item.video_title && (
                        <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-rose-500" />
                          <span>{item.video_title}</span>
                        </div>
                      )}
                      {item.video_url.includes('youtube.com/embed') || item.video_url.includes('vimeo.com') ? (
                        <div className="aspect-video w-full">
                          <iframe
                            src={item.video_url}
                            title={item.video_title || 'Video lecture'}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      ) : (
                        <video controls className="w-full max-h-80 object-cover" src={item.video_url}>
                          Your browser does not support HTML video.
                        </video>
                      )}
                    </div>
                  )}

                  {/* Attached Documents / Photos */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {item.attachments.map((att, idx) => (
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
                          <span className="text-[10px] text-slate-400">({att.size || 'File'})</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Broadcast Notice / Video Alert</h2>
                  <p className="text-xs text-slate-500">Send notifications, video lectures, and circulars</p>
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
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🚨 Special Wave Optics Masterclass & Sunday Test Schedule"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="normal">Normal Notice</option>
                    <option value="important">Important (Highlighted)</option>
                    <option value="urgent">Urgent Alert (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="All Students">All Students & Batches</option>
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the full announcement message, revision topics, or instructions for students..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Video URL section */}
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                <label className="block text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-rose-600" />
                  <span>Attach Video Lecture Link (YouTube / MP4 / Vimeo)</span>
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube link (e.g. youtube.com/watch?v=...) or MP4/Vimeo URL"
                  className="w-full px-3 py-2 text-xs border border-rose-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 font-mono"
                />
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Video Title / Topic (e.g. Masterclass Revision Part 1)"
                  className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Multi-Format Attachments (PDFs / Photos) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Attach Documents / Photos
                </label>

                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Attach Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Attach PDF Circular</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {att.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className="truncate font-medium text-slate-800">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {submitting ? 'Publishing...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
