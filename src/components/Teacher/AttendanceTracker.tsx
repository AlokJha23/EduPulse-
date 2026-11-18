import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { exportToCSV } from '../../utils/pdfExport';
import { ALL_CLASSES, STANDARD_SECTIONS } from '../../constants/academic';
import {
  CalendarCheck,
  Search,
  Save,
  Download,
  Check,
} from 'lucide-react';

export const AttendanceTracker: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getAttendance(selectedDate, selectedClass, selectedSection);
      setRecords(data.records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedClass, selectedSection]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'leave') => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
    setSavedSuccess(false);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, remarks } : r))
    );
    setSavedSuccess(false);
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.teacher.saveAttendance(selectedDate, records);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.student_code && r.student_code.toLowerCase().includes(q)) ||
        (r.roll_number && String(r.roll_number).toLowerCase().includes(q)) ||
        (r.class_name && r.class_name.toLowerCase().includes(q))
    );
  }, [records, search]);

  const handleExportCSV = () => {
    const rows = filteredRecords.map((r) => ({
      Date: selectedDate,
      Roll: r.roll_number,
      StudentID: r.student_code,
      StudentName: r.student_name,
      Class: r.class_name || selectedClass,
      Section: r.section || selectedSection,
      Status: r.status.toUpperCase(),
      Remarks: r.remarks || '',
    }));
    exportToCSV(`Attendance_${selectedClass}_${selectedSection}_${selectedDate}`, rows);
  };

  const totalCount = filteredRecords.length;
  const presentCount = filteredRecords.filter((r) => r.status === 'present').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'absent').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const leaveCount = filteredRecords.filter((r) => r.status === 'leave').length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            <span>Daily Attendance Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record student roll call, manage leaves, and review daily attendance ratios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="save-attendance-btn"
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Control Filters & Date Picker */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Attendance Date
          </label>
          <div className="relative">
            <input
              id="attendance-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Select Class
          </label>
          <select
            id="attendance-class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Classes (Show All Students)</option>
            {ALL_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Select Section
          </label>
          <select
            id="attendance-section-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Sections</option>
            {STANDARD_SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Instant Search
          </label>
          <div className="relative">
            <input
              id="attendance-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find by name, roll, or ID..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Real-time Attendance Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Total</span>
            <span className="text-base font-extrabold text-slate-800">{totalCount}</span>
          </div>
          <div className="text-center border-l border-slate-100 pl-4">
            <span className="block text-[10px] font-bold uppercase text-emerald-600">Present</span>
            <span className="text-base font-extrabold text-emerald-600">{presentCount}</span>
          </div>
          <div className="text-center border-l border-slate-100 pl-4">
            <span className="block text-[10px] font-bold uppercase text-red-600">Absent</span>
            <span className="text-base font-extrabold text-red-600">{absentCount}</span>
          </div>
          <div className="text-center border-l border-slate-100 pl-4">
            <span className="block text-[10px] font-bold uppercase text-amber-600">Late</span>
            <span className="text-base font-extrabold text-amber-600">{lateCount}</span>
          </div>
          <div className="text-center border-l border-slate-100 pl-4">
            <span className="block text-[10px] font-bold uppercase text-blue-600">Leave</span>
            <span className="text-base font-extrabold text-blue-600">{leaveCount}</span>
          </div>
        </div>

        {/* Quick Batch Selectors */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkAll('present')}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('absent')}
            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Interactive Roll Call Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Status (Touch to Toggle)</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading attendance roster...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students found in this class/section.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      #{r.roll_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {r.profile_photo ? (
                          <img
                            src={r.profile_photo}
                            alt={r.student_name}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-1 ring-slate-200">
                            {r.student_name ? r.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{r.student_name}</span>
                          {r.class_name && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {r.class_name} {r.section ? `• Sec ${r.section}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-500">{r.student_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.student_id, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.student_id, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          Absent
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.student_id, 'late')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          Late
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.student_id, 'leave')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'leave'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.remarks || ''}
                        onChange={(e) => handleRemarksChange(r.student_id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
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
