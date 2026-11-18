import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AcademicMarkEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { generateStudentReportCardPDF } from '../../utils/pdfExport';
import { Award, Download, TrendingUp, CheckCircle2 } from 'lucide-react';

export const StudentMarks: React.FC = () => {
  const { student } = useAuth();
  const [marks, setMarks] = useState<AcademicMarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMarks() {
      try {
        setLoading(true);
        const data: any = await api.student.getMarks();
        if (Array.isArray(data)) {
          setMarks(data);
        } else if (data && Array.isArray(data.academic_marks)) {
          setMarks(data.academic_marks);
        } else if (data && Array.isArray(data.marks)) {
          setMarks(data.marks);
        } else {
          setMarks([]);
        }
      } catch (err) {
        console.error(err);
        setMarks([]);
      } finally {
        setLoading(false);
      }
    }
    loadMarks();
  }, []);

  const safeMarks = Array.isArray(marks) ? marks : [];
  const totalObtained = safeMarks.reduce((acc, m) => acc + (m.marks_obtained ?? m.obtained_marks ?? 0), 0);
  const totalMax = safeMarks.reduce((acc, m) => acc + (m.max_marks || 0), 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  const letterGrade =
    safeMarks.length === 0
      ? '—'
      : overallPercentage >= 90
      ? 'A+'
      : overallPercentage >= 80
      ? 'A'
      : overallPercentage >= 70
      ? 'B'
      : overallPercentage >= 60
      ? 'C'
      : overallPercentage >= 40
      ? 'D'
      : 'F';

  const handleDownloadPDF = () => {
    if (!student) return;
    generateStudentReportCardPDF({
      studentName: student.name,
      studentId: student.student_id,
      rollNumber: student.roll_number,
      className: student.class_name,
      section: student.section,
      parentName: student.parent_name,
      attendancePercentage: 0,
      overallPercentage: overallPercentage,
      marks: safeMarks.map((m) => ({
        subject: m.subject,
        exam: m.exam_name,
        obtained: m.marks_obtained ?? m.obtained_marks ?? 0,
        max: m.max_marks,
        grade: m.grade,
      })),
      teacherName: 'Faculty Educator',
      institution: 'Academiq Academy',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span>My Academic Marks & Report Card</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review term examination marks, grades, and download official report cards.
          </p>
        </div>

        <button
          id="download-student-report-card-pdf-btn"
          type="button"
          disabled={safeMarks.length === 0}
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Official PDF Card</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
            Overall Academic Standing
          </span>
          <div className="text-3xl font-black font-mono mt-1 flex items-baseline gap-2">
            <span>{safeMarks.length > 0 ? `${overallPercentage}%` : 'N/A'}</span>
            {safeMarks.length > 0 && (
              <span className="text-sm font-semibold text-indigo-200">
                ({totalObtained} / {totalMax} Marks)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-indigo-200 font-medium block">Letter Grade</span>
            <span className="text-2xl font-black text-amber-400">{letterGrade}</span>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Examination</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading academic records...
                  </td>
                </tr>
              ) : safeMarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No academic marks published yet.
                  </td>
                </tr>
              ) : (
                safeMarks.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{m.exam_name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{m.subject}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {m.marks_obtained ?? m.obtained_marks ?? 0} / {m.max_marks}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">{m.percentage}%</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {m.grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{m.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
