import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doubt, DoubtAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Plus,
  Search,
  MessageSquare,
  ThumbsUp,
  Paperclip,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  X,
  Sparkles,
  Download,
  Filter,
  Check,
  ChevronRight,
} from 'lucide-react';

const SUBJECT_LIST = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science'];

export const StudentDoubts: React.FC = () => {
  const { user, student } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected doubt for detail view
  const [activeDoubt, setActiveDoubt] = useState<Doubt | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Ask Doubt Modal State
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('Physics');
  const [newChapter, setNewChapter] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'urgent'>('normal');
  const [attachments, setAttachments] = useState<DoubtAttachment[]>([]);
  const [submittingDoubt, setSubmittingDoubt] = useState(false);

  const loadDoubts = async () => {
    try {
      setLoading(true);
      const data = await api.doubts.getDoubts({
        subject: selectedSubject !== 'All' ? selectedSubject : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDoubts(data);
      if (activeDoubt) {
        const refreshed = data.find((d) => d.id === activeDoubt.id);
        if (refreshed) setActiveDoubt(refreshed);
      }
    } catch (err) {
      console.error('Error loading doubts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoubts();
  }, [selectedSubject, statusFilter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: dataUrl,
            dataUrl,
            type: isImg ? 'image' : isPdf ? 'pdf' : 'document',
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

  const handleAskDoubtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      alert('Please fill in both title and doubt question description.');
      return;
    }

    try {
      setSubmittingDoubt(true);
      const created = await api.doubts.createDoubt({
        subject: newSubject,
        chapter: newChapter,
        topic: newTopic,
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        attachments,
      });

      setIsAskModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewChapter('');
      setNewTopic('');
      setNewDescription('');
      setAttachments([]);
      setNewPriority('normal');
      await loadDoubts();
      setActiveDoubt(created);
    } catch (err: any) {
      alert(err.message || 'Failed to submit doubt');
    } finally {
      setSubmittingDoubt(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoubt || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      await api.doubts.replyDoubt(activeDoubt.id, {
        content: replyText,
      });
      setReplyText('');
      await loadDoubts();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpvote = async (doubtId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.doubts.toggleUpvote(doubtId);
      await loadDoubts();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDoubts = doubts.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.chapter?.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <span>Student Doubt Clearing Portal</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ask questions with photos, PDF notes, formulas, and diagrams to get verified solutions from faculty.
          </p>
        </div>

        <button
          id="open-ask-doubt-modal-btn"
          type="button"
          onClick={() => setIsAskModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ask a New Doubt</span>
        </button>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SUBJECT_LIST.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSelectedSubject(subj)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              selectedSubject === subj
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Main Grid: Doubt List & Active Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Doubt List */}
        <div className={`${activeDoubt ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {/* Search and Status bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doubt topics, chapters..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            </div>

            <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  statusFilter === 'open' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  statusFilter === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Doubt Cards */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading doubts forum...</div>
          ) : filteredDoubts.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Doubts Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Have a question about a numerical, diagram, or formula? Click "Ask a New Doubt" with photos or PDFs!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDoubts.map((doubt) => {
                const isSelected = activeDoubt?.id === doubt.id;
                const hasSolution = doubt.status === 'resolved' || doubt.replies?.some((r) => r.is_solution);

                return (
                  <div
                    key={doubt.id}
                    onClick={() => setActiveDoubt(doubt)}
                    className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                          {doubt.subject}
                        </span>
                        {doubt.chapter && (
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[150px]">
                            {doubt.chapter}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasSolution ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Solved</span>
                          </span>
                        ) : doubt.priority === 'urgent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span>Urgent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                      {doubt.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {doubt.description}
                    </p>

                    {/* Attachments preview pill */}
                    {doubt.attachments && doubt.attachments.length > 0 && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                          <Paperclip className="w-3 h-3" />
                          <span>{doubt.attachments.length} attachment(s)</span>
                        </span>
                      </div>
                    )}

                    {/* Footer: Author & Counts */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          {doubt.student_photo ? (
                            <img src={doubt.student_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            doubt.student_name.charAt(0)
                          )}
                        </div>
                        <span className="truncate max-w-[120px] text-slate-600 font-medium">
                          {doubt.student_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => handleUpvote(doubt.id, e)}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{doubt.upvotes || 0}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{doubt.replies?.length || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Thread Detail View */}
        {activeDoubt && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    {activeDoubt.subject}
                  </span>
                  {activeDoubt.chapter && (
                    <span className="text-xs font-medium text-slate-600">
                      {activeDoubt.chapter} {activeDoubt.topic ? `• ${activeDoubt.topic}` : ''}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900">{activeDoubt.title}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Asked by {activeDoubt.student_name} ({activeDoubt.student_class} - {activeDoubt.student_section}) •{' '}
                  {new Date(activeDoubt.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveDoubt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Conversation Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Question Statement */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {activeDoubt.description}
                </p>

                {/* Attachments list / gallery */}
                {activeDoubt.attachments && activeDoubt.attachments.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Attached Materials & Photos:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeDoubt.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {att.type === 'image' ? (
                              <ImageIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                            ) : (
                              <FileText className="w-5 h-5 text-red-500 shrink-0" />
                            )}
                            <div className="overflow-hidden">
                              <span className="block text-xs font-semibold text-slate-800 truncate">
                                {att.name}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {att.type.toUpperCase()} • {att.size || 'Attachment'}
                              </span>
                            </div>
                          </div>

                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
                              title="Open full resolution"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Image Preview Thumbnail if images are attached */}
                    {activeDoubt.attachments.filter((a) => a.type === 'image').map((imgAtt, i) => (
                      <div key={i} className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-w-sm">
                        <img
                          src={imgAtt.url}
                          alt="Doubt snap"
                          className="w-full h-auto max-h-60 object-contain bg-slate-900/5"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Solutions & Teacher Responses */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Solutions & Discussions ({activeDoubt.replies?.length || 0})</span>
                  </h4>
                </div>

                {(!activeDoubt.replies || activeDoubt.replies.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Faculty is reviewing this question. You can add a follow-up query below.
                  </div>
                ) : (
                  activeDoubt.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-xl border transition-all ${
                        reply.is_solution
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {reply.author_name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {reply.author_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {reply.author_role === 'TEACHER' ? 'Faculty Solution' : 'Student'} •{' '}
                              {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {reply.is_solution && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>Verified Solution</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed mt-2">
                        {reply.content}
                      </p>

                      {/* Reply attachments if any */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                          {reply.attachments.map((rAtt, rIdx) => (
                            <a
                              key={rIdx}
                              href={rAtt.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-indigo-600 font-medium hover:bg-indigo-50"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{rAtt.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom: Post Reply Bar */}
            <form onSubmit={handleSendReply} className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a follow-up or add clarification..."
                className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Ask Doubt Modal */}
      {isAskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Ask a Question / Doubt</h2>
                  <p className="text-xs text-slate-500">Attach photos of textbook questions, formulas, or notes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleAskDoubtSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {SUBJECT_LIST.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent (Before Exam / Quiz)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter Name</label>
                  <input
                    type="text"
                    value={newChapter}
                    onChange={(e) => setNewChapter(e.target.value)}
                    placeholder="e.g. Electromagnetic Induction"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specific Topic</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g. Faraday Law Numerical 4"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doubt Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Why is induced EMF negative in Lenz Law formula?"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Question *</label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain where you got stuck, what steps you tried, or what equation is confusing..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Multi-Format Upload Section (Photos, PDFs, JPEGs) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Attach Photo / Diagram / PDF Notes
                </label>
                
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Upload Image / Photo</span>
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
                    <span>Upload PDF Document</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Selected Attachments List */}
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

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDoubt}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {submittingDoubt ? 'Submitting...' : 'Post Doubt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
