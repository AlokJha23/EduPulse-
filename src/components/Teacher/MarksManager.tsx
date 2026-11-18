import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { AcademicMarkEntry, StudentProfile } from '../../types';
import { COMMON_SUBJECTS } from '../../constants/academic';
import { Award, Plus, Search, Download, X } from 'lucide-react';
import { exportToCSV } from '../../utils/pdfExport';

export const MarksManager: React.FC = () => {
  const [marks, setMarks] = useState<AcademicMarkEntry[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [examName, setExamName] = useState('Midterm Examination');
  const [subject, setSubject] = useState('Physics');
  const [marksObtained, setMarksObtained] = useState<number>(88);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [remarks, setRemarks] = useState('Exceptional performance');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [marksData, studentsData] = await Promise.all([
        api.teacher.getMarks(),
        api.teacher.getStudents(),
      ]);
      const safeMarks = Array.isArray(marksData) ? marksData : [];
      const safeStudents = Array.isArray(studentsData) ? studentsData : [];
      setMarks(safeMarks);
      setStudents(safeStudents);
      if (safeStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(safeStudents[0].id);
      }
    } catch (err) {
      console.error(err);
      setMarks([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const examOptions = useMemo(() => {
    const set = new Set<string>([
      'Midterm Examination',
      'Unit Test 1',
      'Unit Test 2',
      'Final Examination',
    ]);
    marks.forEach((m) => {
      if (m.exam_name) set.add(m.exam_name);
    });
    return Array.from(set);
  }, [marks]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>(COMMON_SUBJECTS.filter((s) => s !== 'All Subjects'));
    marks.forEach((m) => {
      if (m.subject) set.add(m.subject);
    });
    return Array.from(set);
  }, [marks]);

  const filteredMarks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return marks.filter((m) => {
      if (examFilter && (m.exam_name || '').trim().toLowerCase() !== examFilter.trim().toLowerCase()) {
        return false;
      }
      if (subjectFilter && (m.subject || '').trim().toLowerCase() !== subjectFilter.trim().toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${m.student_name || ''} ${m.student_id || ''} ${m.exam_name || ''} ${m.subject || ''} ${m.remarks || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [marks, search, examFilter, subjectFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.teacher.addMark({
        student_id: selectedStudentId,
        exam_name: examName,
        subject,
        marks_obtained: Number(marksObtained),
        max_marks: Number(maxMarks),
        remarks,
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record marks');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const rows = filteredMarks.map((m) => ({
      StudentID: m.student_id,
      StudentName: m.student_name,
      Exam: m.exam_name,
      Subject: m.subject,
      Obtained: m.marks_obtained,
      Max: m.max_marks,
      Percentage: `${m.percentage}%`,
      Grade: m.grade,
      Remarks: m.remarks || '',
    }));
    exportToCSV(`Academic_Marks_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span>Academic Marks & Results Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record term examination scores, compute automatic grades & percentage, and generate transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="open-record-marks-modal-btn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Exam Marks</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Instant search by student, exam, or subject..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <select
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Examinations</option>
          {examOptions.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Subjects</option>
          {subjectOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Exam</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading academic records...
                  </td>
                </tr>
              ) : filteredMarks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No academic marks entered for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMarks.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.student_name}</td>
                    <td className="py-3 px-4 text-slate-700">{m.exam_name}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{m.subject}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {m.marks_obtained} / {m.max_marks}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{m.percentage}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {m.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{m.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Marks Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Record Student Exam Marks</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_id}) - {s.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marks Obtained *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Excellent grasp of numericals"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
