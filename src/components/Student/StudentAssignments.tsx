import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Assignment } from '../../types';
import {
  FileCheck2,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  MessageSquare,
  Send,
} from 'lucide-react';

interface StudentAssignmentsProps {
  initialDetailAssignmentId?: string;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  initialDetailAssignmentId,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [activeSubmittingAssignment, setActiveSubmittingAssignment] = useState<Assignment | null>(
    null
  );
  const [contentText, setContentText] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Graded / Feedback Review Modal
  const [viewingFeedbackAssignment, setViewingFeedbackAssignment] = useState<Assignment | null>(
    null
  );

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.student.getAssignments();
      setAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    if (initialDetailAssignmentId && assignments.length > 0) {
      const match = assignments.find((a) => a.id === initialDetailAssignmentId);
      if (match) {
        if (match.my_submission?.status === 'graded') {
          setViewingFeedbackAssignment(match);
        } else {
          setActiveSubmittingAssignment(match);
        }
      }
    }
  }, [initialDetailAssignmentId, assignments]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmittingAssignment) return;

    setSubmitting(true);
    try {
      await api.student.submitAssignment(activeSubmittingAssignment.id, {
        content_text: contentText,
        file_name: fileName || undefined,
      });

      setActiveSubmittingAssignment(null);
      setContentText('');
      setFileName('');
      loadAssignments();
    } catch (err: any) {
      alert(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-amber-600" />
          <span>My Homework & Assignments</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit responses to homework tasks, track teacher grading, and read instructor feedback.
        </p>
      </div>

      {/* Assignments List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading homework tasks...
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No assignments assigned at this time.
          </div>
        ) : (
          assignments.map((a) => {
            const sub = a.my_submission;
            const isGraded = sub?.status === 'graded';
            const isSubmitted = !!sub;

            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                      {a.subject}
                    </span>

                    {/* Status Pill */}
                    {isGraded ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Graded ({sub.marks_obtained}/{a.max_marks})</span>
                      </span>
                    ) : isSubmitted ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{a.title}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">Chapter: {a.chapter}</div>

                  <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                    {a.instructions}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                  </div>

                  {isGraded ? (
                    <button
                      type="button"
                      onClick={() => setViewingFeedbackAssignment(a)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>View Grade</span>
                    </button>
                  ) : isSubmitted ? (
                    <button
                      type="button"
                      onClick={() => setActiveSubmittingAssignment(a)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Edit Submission
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSubmittingAssignment(a)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Now</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Homework Submission Modal */}
      {activeSubmittingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-amber-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Submit Assignment Response</h3>
                <p className="text-amber-200 text-xs">{activeSubmittingAssignment.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubmittingAssignment(null)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-slate-800">Task Instructions:</span>
                <p className="text-slate-600 whitespace-pre-wrap">
                  {activeSubmittingAssignment.instructions}
                </p>
                <div className="text-[11px] text-slate-500 pt-1 font-mono">
                  Max Marks: {activeSubmittingAssignment.max_marks} • Due Date:{' '}
                  {activeSubmittingAssignment.due_date}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type Your Solution / Answer *
                </label>
                <textarea
                  rows={6}
                  required
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Enter your complete response, derivations, step-by-step problem solutions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach File / Document (Optional)
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. Physics_Homework_Solved.pdf"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveSubmittingAssignment(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit to Teacher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Graded Feedback Modal */}
      {viewingFeedbackAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Teacher Evaluation & Feedback</h3>
                <p className="text-emerald-200 text-xs">{viewingFeedbackAssignment.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingFeedbackAssignment(null)}
                className="p-1 rounded text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase block">
                    Marks Awarded
                  </span>
                  <span className="text-2xl font-black text-emerald-900 font-mono">
                    {viewingFeedbackAssignment.my_submission?.marks_obtained} /{' '}
                    {viewingFeedbackAssignment.max_marks}
                  </span>
                </div>
                <Award className="w-10 h-10 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800">Teacher's Comments & Guidance:</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 italic">
                  "{viewingFeedbackAssignment.my_submission?.feedback || 'Good attempt!'}"
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800">Your Submitted Response:</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-[11px] max-h-36 overflow-y-auto">
                  {viewingFeedbackAssignment.my_submission?.content_text}
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingFeedbackAssignment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
