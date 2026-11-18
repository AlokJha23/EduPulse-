import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { exportToCSV, generateStudentReportCardPDF } from '../../utils/pdfExport';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, TrendingUp, Users, CalendarCheck, Award } from 'lucide-react';

export const ReportsManager: React.FC = () => {
  const { teacher } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const data = await api.teacher.getReportsSummary();
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const handleExportSummaryCSV = () => {
    if (!summary || !summary.students) return;
    const rows = summary.students.map((s: any) => ({
      Roll: s.roll_number,
      StudentID: s.student_id,
      StudentName: s.name,
      Class: `${s.class_name} - ${s.section}`,
      AttendancePercentage: `${s.attendancePercentage}%`,
      AverageMarks: `${s.academicAverage}%`,
      CompletedAssignments: s.completedAssignments,
      CompletedTests: s.completedTests,
    }));
    exportToCSV(`Class_Master_Report_${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handlePrintPDF = (s: any) => {
    generateStudentReportCardPDF({
      studentName: s.name,
      studentId: s.student_id,
      rollNumber: s.roll_number,
      className: s.class_name,
      section: s.section,
      parentName: s.parent_name,
      attendancePercentage: s.attendancePercentage,
      overallPercentage: s.academicAverage,
      marks: [
        { subject: 'Physics', exam: 'Midterm Examination', obtained: s.academicAverage, max: 100, grade: 'A' },
      ],
      teacherName: teacher?.name || 'Educator',
      institution: teacher?.academy_name || teacher?.institution || 'Academic Institute',
      institutionLogo: teacher?.academy_logo,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Academic Performance & Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic student progress analytics, attendance metrics, and printable PDF transcripts.
          </p>
        </div>

        <button
          id="export-master-report-csv-btn"
          type="button"
          onClick={handleExportSummaryCSV}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Roster Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Academic Avg</th>
                <th className="py-3 px-4">Completed Tasks</th>
                <th className="py-3 px-4 text-right">PDF Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Calculating class analytics...
                  </td>
                </tr>
              ) : !summary || !summary.students || summary.students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No student records found.
                  </td>
                </tr>
              ) : (
                summary.students.map((s: any, idx: number) => {
                  const studentKey = s.id || s.student_id || s.code || `student-rep-${idx}`;
                  const attPct = s.attendancePercentage ?? s.attendance_percentage ?? 0;
                  const avgMark = s.academicAverage ?? s.average_marks ?? 0;
                  const completedTasks = s.completedAssignments ?? s.assignments_completed ?? 0;
                  const completedTests = s.completedTests ?? s.tests_attempted ?? 0;

                  return (
                    <tr key={studentKey} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        #{s.roll_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{s.student_id || s.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{attPct}%</span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, attPct))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {avgMark}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {completedTasks} Tasks • {completedTests} Tests
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintPDF(s)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Card</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
