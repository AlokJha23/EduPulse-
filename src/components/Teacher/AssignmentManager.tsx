import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Assignment } from '../../types';
import { ALL_CLASSES, STANDARD_SECTIONS } from '../../constants/academic';
import {
  FileCheck2,
  Plus,
  Calendar,
  Users,
  Award,
  CheckCircle,
  Clock,
  Eye,
  X,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface AssignmentManagerProps {
  initialDetailAssignmentId?: string;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({ initialDetailAssignmentId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubmissionsData, setSelectedSubmissionsData] = useState<any | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);

  // Grade form
  const [gradeMarks, setGradeMarks] = useState<number>(20);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // New assignment form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [className, setClassName] = useState('Class 1');
  const [section, setSection] = useState('A');
  const [chapter, setChapter] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('2026-03-05');
  const [maxMarks, setMaxMarks] = useState(25);
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getAssignments();
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
    if (initialDetailAssignmentId) {
      handleViewSubmissions(initialDetailAssignmentId);
    }
  }, [initialDetailAssignmentId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.teacher.createAssignment({
        title,
        subject,
        class_name: className,
        section,
        chapter,
        instructions,
        due_date: dueDate,
        max_marks: Number(maxMarks),
      });
      setIsAddModalOpen(false);
      setTitle('');
      setChapter('');
      setInstructions('');
      loadAssignments();
    } catch (err: any) {
      alert(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSubmissions = async (assignmentId: string) => {
    try {
      const data = await api.teacher.getAssignmentSubmissions(assignmentId);
      setSelectedSubmissionsData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load submissions');
    }
  };

  const handleOpenGrade = (sub: any) => {
    setGradingSubmission(sub);
    setGradeMarks(sub.marks_obtained !== undefined && sub.marks_obtained !== null ? sub.marks_obtained : selectedSubmissionsData?.assignment?.max_marks || 20);
    setGradeFeedback(sub.feedback || 'Great effort. Well explained answers.');
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionsData || !gradingSubmission) return;

    setSubmittingGrade(true);
    try {
      await api.teacher.gradeSubmission(selectedSubmissionsData.assignment.id, {
        submission_id: gradingSubmission.id,
        marks: Number(gradeMarks),
        feedback: gradeFeedback,
      });

      // Update local submissions
      setSelectedSubmissionsData((prev: any) => ({
        ...prev,
        submissions: prev.submissions.map((s: any) =>
          s.id === gradingSubmission.id
            ? { ...s, status: 'graded', marks_obtained: Number(gradeMarks), feedback: gradeFeedback }
            : s
        ),
      }));

      setGradingSubmission(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit grade');
    } finally {
      setSubmittingGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-600" />
            <span>Homework & Assignments Hub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create homework tasks, review student submissions, and provide targeted feedback.
          </p>
        </div>

        <button
          id="open-create-assignment-modal-btn"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Assignment List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs">
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs">
            No assignments created yet.
          </div>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    {a.subject}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {a.class_name} • Sec {a.section}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{a.title}</h3>
                <div className="text-[11px] text-slate-500 font-medium">Chapter: {a.chapter}</div>

                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                  {a.instructions}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewSubmissions(a.id)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Submissions</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submissions Modal */}
      {selectedSubmissionsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-amber-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {selectedSubmissionsData.assignment.title} — Submissions
                </h3>
                <p className="text-amber-200 text-xs mt-0.5">
                  Max Marks: {selectedSubmissionsData.assignment.max_marks} • Due Date:{' '}
                  {selectedSubmissionsData.assignment.due_date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionsData(null)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {(!selectedSubmissionsData.submissions || selectedSubmissionsData.submissions.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No students have submitted this assignment yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                        <th className="py-2.5 px-3">Answer / Content</th>
                        <th className="py-2.5 px-3">Status / Marks</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedSubmissionsData.submissions || []).map((sub: any) => {
                        const hasSubmitted =
                          sub.has_submitted !== undefined ? sub.has_submitted : !!sub.submitted_at;
                        const roll = sub.student_roll || sub.roll_number || '—';

                        return (
                          <tr key={sub.id || sub.student_id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {sub.student_name} (Roll #{roll})
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {hasSubmitted && sub.submitted_at
                                ? new Date(sub.submitted_at).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="py-3 px-3">
                              {hasSubmitted ? (
                                <p className="text-slate-700 line-clamp-1">
                                  {sub.content_text || sub.file_name || 'Attached document'}
                                </p>
                              ) : (
                                <span className="text-slate-400 italic">Not submitted yet</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {!hasSubmitted ? (
                                <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                  Pending
                                </span>
                              ) : sub.status === 'graded' ? (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {sub.marks_obtained} / {selectedSubmissionsData.assignment.max_marks}
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                                  Needs Grading
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {hasSubmitted ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenGrade(sub)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer"
                                >
                                  {sub.status === 'graded' ? 'Regrade' : 'Grade'}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Awaiting</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Grade Submission</h3>
                <p className="text-indigo-200 text-xs">{gradingSubmission.student_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="p-1 rounded text-indigo-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrade} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-700">Submitted Response:</span>
                <p className="text-slate-600 italic">
                  "{gradingSubmission.content_text || 'Document file submitted.'}"
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marks Awarded (Max: {selectedSubmissionsData?.assignment?.max_marks || 25})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={selectedSubmissionsData?.assignment?.max_marks || 100}
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide guidance, suggestions, or praise..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGrade}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  {submittingGrade ? 'Saving...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-amber-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Assign New Homework</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 4 Practice Problems"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Physics"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="All Classes">All Classes (Shared)</option>
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  >
                    {STANDARD_SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chapter</label>
                  <input
                    type="text"
                    required
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Light Reflection"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Instructions & Questions
                </label>
                <textarea
                  rows={4}
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Detail the questions to solve, expected formatting, and submission guidelines..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Assigning...' : 'Assign Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
