import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DashboardStats, Announcement } from '../../types';
import {
  Users,
  CalendarCheck,
  FileCheck2,
  HelpCircle,
  TrendingUp,
  BookOpen,
  PlusCircle,
  Megaphone,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigate: (view: string, detailId?: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { teacher } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashStats, annList] = await Promise.all([
          api.teacher.getDashboardStats(),
          api.teacher.getAnnouncements(),
        ]);
        setStats(dashStats);
        setAnnouncements(annList.slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading teacher analytics dashboard...
      </div>
    );
  }

  const presentPercentage =
    stats && stats.total_students > 0
      ? Math.round((stats.present_today / stats.total_students) * 100)
      : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl flex items-start gap-4">
          <img
            src={teacher?.academy_logo || '/logo.png'}
            alt={teacher?.academy_name || teacher?.institution || 'School Logo'}
            referrerPolicy="no-referrer"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain bg-white p-1 shadow-lg ring-2 ring-white/20 shrink-0"
          />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-medium mb-2.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="font-semibold truncate">
                {teacher?.academy_name || teacher?.institution || 'Academiq Campus'}
              </span>
              {teacher?.academy_code && (
                <span className="bg-amber-400 text-indigo-950 font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ml-1 shrink-0">
                  {teacher.academy_code}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {teacher?.academy_name || teacher?.institution || 'School Administrative Center'}
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Welcome {teacher?.name || 'Faculty'}. Manage student rosters, mark daily attendance, publish study notes, assignments, and CBT mock tests for your school.
            </p>
          </div>
        </div>

        {/* Quick stat pill on right */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 gap-6 text-center">
          <div>
            <span className="block text-2xl font-black text-white">{stats?.total_students || 0}</span>
            <span className="text-[11px] text-indigo-200">Active Students</span>
          </div>
          <div className="border-l border-white/10 pl-6">
            <span className="block text-2xl font-black text-emerald-300">{stats?.average_class_performance || 88}%</span>
            <span className="text-[11px] text-indigo-200">Class Average</span>
          </div>
        </div>
      </div>

      {/* Primary 8 Quick Action Buttons */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            id="qa-add-student"
            type="button"
            onClick={() => onNavigate('students')}
            className="p-3 bg-white hover:bg-indigo-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-600">
              Add Student
            </span>
          </button>

          <button
            id="qa-take-attendance"
            type="button"
            onClick={() => onNavigate('attendance')}
            className="p-3 bg-white hover:bg-emerald-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition-colors">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-emerald-600">
              Attendance
            </span>
          </button>

          <button
            id="qa-upload-notes"
            type="button"
            onClick={() => onNavigate('notes')}
            className="p-3 bg-white hover:bg-blue-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600">
              Upload Notes
            </span>
          </button>

          <button
            id="qa-create-assignment"
            type="button"
            onClick={() => onNavigate('assignments')}
            className="p-3 bg-white hover:bg-amber-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-600 group-hover:text-white text-amber-600 flex items-center justify-center transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-amber-600">
              Assignment
            </span>
          </button>

          <button
            id="qa-create-test"
            type="button"
            onClick={() => onNavigate('tests')}
            className="p-3 bg-white hover:bg-purple-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-600 group-hover:text-white text-purple-600 flex items-center justify-center transition-colors">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-purple-600">
              Create Test
            </span>
          </button>

          <button
            id="qa-add-announcement"
            type="button"
            onClick={() => onNavigate('announcements')}
            className="p-3 bg-white hover:bg-rose-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 group-hover:bg-rose-600 group-hover:text-white text-rose-600 flex items-center justify-center transition-colors">
              <Megaphone className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-rose-600">
              Announce
            </span>
          </button>

          <button
            id="qa-enter-marks"
            type="button"
            onClick={() => onNavigate('marks')}
            className="p-3 bg-white hover:bg-emerald-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-emerald-600">
              Enter Marks
            </span>
          </button>

          <button
            id="qa-faculty-hub"
            type="button"
            onClick={() => onNavigate('staff')}
            className="p-3 bg-white hover:bg-indigo-50/60 border border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-600">
              Faculty Hub
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats?.total_students || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across {stats?.total_classes || 1} active batches</p>
        </div>

        {/* Present Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Present Today</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats?.present_today || 0}
            </span>
            <span className="text-xs text-slate-400">/ {stats?.total_students || 0} ({presentPercentage}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${presentPercentage}%` }}
            />
          </div>
        </div>

        {/* Pending Homework */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Submissions</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {stats?.pending_assignments || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for teacher evaluation</p>
        </div>

        {/* Class Average Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Class Performance</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">
            {stats?.average_class_performance || 88}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Average assessment grade</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Submissions & Announcements */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Recent Submissions / Action Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Student Submissions</h3>
              <p className="text-xs text-slate-500">Homework and tasks submitted for grading</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assignments')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.recent_submissions && stats.recent_submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Submitted At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recent_submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {sub.student_name} <span className="text-slate-400 font-normal">(Roll #{sub.student_roll})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sub.status === 'graded'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('assignments', sub.assignment_id)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold cursor-pointer"
                        >
                          Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No recent submissions pending evaluation.
            </div>
          )}
        </div>

        {/* Right: Announcements Ticker & Active Resources */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-rose-500" />
                <span>Recent Announcements</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Post New
              </button>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-2.5">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 truncate">{ann.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          ann.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : ann.priority === 'important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {ann.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                      {ann.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No active announcements.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
