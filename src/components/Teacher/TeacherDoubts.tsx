import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doubt, DoubtAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Search,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  X,
  Check,
  Download,
  Filter,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science'];

export const TeacherDoubts: React.FC = () => {
  const { teacher } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected doubt for detail view & reply
  const [activeDoubt, setActiveDoubt] = useState<Doubt | null>(null);
  const [solutionContent, setSolutionContent] = useState('');
  const [solutionAttachments, setSolutionAttachments] = useState<DoubtAttachment[]>([]);
  const [isMarkAsSolution, setIsMarkAsSolution] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);

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
      console.error(err);
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
        setSolutionAttachments((prev) => [
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
    setSolutionAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoubt || !solutionContent.trim()) return;

    try {
      setSubmittingReply(true);
      await api.doubts.replyDoubt(activeDoubt.id, {
        content: solutionContent,
        attachments: solutionAttachments,
        is_solution: isMarkAsSolution,
      });

      setSolutionContent('');
      setSolutionAttachments([]);
      await loadDoubts();
    } catch (err: any) {
      alert(err.message || 'Failed to post faculty solution');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleStatus = async (doubtId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'resolved' ? 'open' : 'resolved';
    try {
      await api.doubts.updateStatus(doubtId, nextStatus as any);
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
      d.student_name.toLowerCase().includes(q) ||
      d.chapter?.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <span>Faculty Doubt Resolution Hub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve student queries with step-by-step explanations, handwritten diagrams, and verified solution notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {doubts.filter((d) => d.status !== 'resolved').length} Pending Doubts
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {doubts.filter((d) => d.status === 'resolved').length} Solved
          </span>
        </div>
      </div>

      {/* Main Grid: Doubt List & Solution Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Doubt List */}
        <div className={`${activeDoubt ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {/* Filter and Search */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student doubts, names, topics..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            </div>

            <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
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
            <div className="py-12 text-center text-slate-400 text-xs">Loading doubts...</div>
          ) : filteredDoubts.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">All Doubts Cleared!</h3>
              <p className="text-xs text-slate-500">No pending questions in this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDoubts.map((doubt) => {
                const isSelected = activeDoubt?.id === doubt.id;
                const isResolved = doubt.status === 'resolved';

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
                        <span className="text-[11px] font-semibold text-slate-700">
                          {doubt.student_class} ({doubt.student_section})
                        </span>
                      </div>

                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Resolved</span>
                        </span>
                      ) : doubt.priority === 'urgent' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          <span>Urgent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Needs Answer</span>
                        </span>
                      )}
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
                          <span>{doubt.attachments.length} attachment(s) attached by student</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400">
                      <span className="text-slate-600 font-medium truncate">
                        Student: {doubt.student_name} (Roll: {doubt.student_roll || '01'})
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{doubt.replies?.length || 0} replies</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Solution & Thread Workspace */}
        {activeDoubt && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    {activeDoubt.subject}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {activeDoubt.student_class} • Chapter: {activeDoubt.chapter || 'General'}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{activeDoubt.title}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Asked by {activeDoubt.student_name} • {new Date(activeDoubt.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(activeDoubt.id, activeDoubt.status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeDoubt.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{activeDoubt.status === 'resolved' ? 'Mark as Open' : 'Mark Resolved'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDoubt(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Thread & Student Question */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Question Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Student Query:
                </div>
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {activeDoubt.description}
                </p>

                {/* Attached student files / diagrams */}
                {activeDoubt.attachments && activeDoubt.attachments.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Student Attachments:
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
                                {att.size || 'Attachment'}
                              </span>
                            </div>
                          </div>

                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Image preview */}
                    {activeDoubt.attachments.filter((a) => a.type === 'image').map((imgAtt, i) => (
                      <div key={i} className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-w-sm">
                        <img src={imgAtt.url} alt="" className="w-full h-auto max-h-60 object-contain bg-slate-900/5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing replies */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Response History ({activeDoubt.replies?.length || 0})
                </h4>

                {(!activeDoubt.replies || activeDoubt.replies.length === 0) ? (
                  <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No solutions posted yet. Write a solution below.
                  </div>
                ) : (
                  activeDoubt.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-xl border transition-all ${
                        reply.is_solution ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'
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
                              {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {reply.is_solution && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>Faculty Verified Solution</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {reply.content}
                      </p>

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

            {/* Bottom: Teacher Solution Composer */}
            <form onSubmit={handlePostSolution} className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Write Step-by-Step Faculty Solution</span>
                </span>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMarkAsSolution}
                    onChange={(e) => setIsMarkAsSolution(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mark as Official Solution</span>
                </label>
              </div>

              <textarea
                required
                rows={3}
                value={solutionContent}
                onChange={(e) => setSolutionContent(e.target.value)}
                placeholder="Explain the concept, formula substitution, or step-by-step mathematical derivation..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {/* Solution Attachments (Photos/PDFs) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attach Photo / Diagram</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>Attach Solution PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingReply || !solutionContent.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReply ? 'Posting...' : 'Post Solution'}</span>
                </button>
              </div>

              {/* Render Selected Attachments */}
              {solutionAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {solutionAttachments.map((att, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800 font-medium"
                    >
                      <span>{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-indigo-500 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
