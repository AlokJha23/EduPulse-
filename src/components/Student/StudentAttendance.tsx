import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CalendarCheck, CheckCircle2, XCircle, Clock, UserMinus, Calendar } from 'lucide-react';

export const StudentAttendance: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.student.getAttendance();
        setAttendanceData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading attendance history...
      </div>
    );
  }

  const stats = attendanceData?.summary || {
    total_days: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    percentage: 0,
  };
  const records = attendanceData?.records || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-600" />
          <span>My Attendance Record</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review your roll call records, attendance percentage, and teacher remarks.
        </p>
      </div>

      {/* Attendance Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Overall Rate
          </span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {stats.percentage ?? 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Present
          </span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {stats.present ?? stats.presentDays ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Absent
          </span>
          <span className="text-2xl font-black text-red-600 font-mono mt-1 block">
            {stats.absent ?? stats.absentDays ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Late
          </span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {stats.late ?? stats.lateDays ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Leave
          </span>
          <span className="text-2xl font-black text-blue-600 font-mono mt-1 block">
            {stats.leave ?? stats.leaveDays ?? 0}
          </span>
        </div>
      </div>

      {/* Daily Attendance History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Attendance Log History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No attendance records found yet.
                  </td>
                </tr>
              ) : (
                records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase inline-flex items-center gap-1 ${
                          r.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : r.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.class_name} - {r.section}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{r.remarks || '—'}</td>
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
