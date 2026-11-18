import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StudyMaterial, Announcement } from '../../types';
import {
  BookOpen,
  FileCheck2,
  HelpCircle,
  CalendarCheck,
  Award,
  Megaphone,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  Bookmark,
  Eye,
  Building2,
} from 'lucide-react';
import { NotesViewerModal } from '../Common/NotesViewerModal';

interface StudentDashboardProps {
  onNavigate: (view: string, detailId?: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { student } = useAuth();
  const [dashData, setDashData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.student.getDashboard();
      setDashData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading student learning portal...
      </div>
    );
  }

  const attendancePercent = dashData?.attendance_percentage ?? dashData?.attendance?.percentage ?? 0;
  const pendingAssignmentsList = dashData?.pending_assignments || dashData?.pendingAssignments || [];
  const pendingTasksCount = pendingAssignmentsList.length;
  const upcomingTestsList = dashData?.upcoming_tests || dashData?.upcomingTests || [];
  const upcomingTestsCount = upcomingTestsList.length;
  const materialsList = dashData?.recent_materials || dashData?.recentMaterials || [];
  const materialsCount = materialsList.length;
  const announcementsList = dashData?.recent_announcements || dashData?.announcements || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl flex items-start gap-4">
          <img
            src={student?.academy_logo || '/logo.png'}
            alt={student?.academy_name || 'School Logo'}
            referrerPolicy="no-referrer"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain bg-white p-1 shadow-lg ring-2 ring-white/20 shrink-0"
          />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-2.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="font-semibold truncate">{student?.academy_name || 'Academiq Campus'}</span>
              {student?.academy_code && (
                <span className="bg-amber-400 text-emerald-950 font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ml-1 shrink-0">
                  {student.academy_code}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {student?.name || 'Student'}!
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
              {student?.academy_name ? `${student.academy_name} • ` : ''}
              {student?.class_name} • Section {student?.section} (Roll #{student?.roll_number}) • Student ID:{' '}
              <span className="font-mono font-bold text-amber-200">{student?.student_id}</span>
            </p>
          </div>
        </div>

        {/* Attendance pill on right */}
        <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 items-center gap-4">
          <div className="text-right">
            <span className="block text-2xl font-black text-emerald-300">{attendancePercent}%</span>
            <span className="text-[11px] text-emerald-100">Attendance Rate</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* 4 Primary Quick Action / Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Study Notes */}
        <div
          onClick={() => onNavigate('notes')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Study Notes</span>
            <BookOpen className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {materialsCount} Available
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span>Explore library</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Pending Homework */}
        <div
          onClick={() => onNavigate('assignments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Tasks</span>
            <FileCheck2 className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {pendingTasksCount} To Submit
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
            <span>Submit homework</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Online Tests */}
        <div
          onClick={() => onNavigate('tests')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Online Tests</span>
            <HelpCircle className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600">
            {upcomingTestsCount} Tests
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1 flex items-center gap-1">
            <span>Take assessment</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Attendance Summary */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {attendancePercent}%
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <span>View attendance log</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Homework & Announcements */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Pending Homework & Recent Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pending Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assigned Homework & Tasks</h3>
                <p className="text-xs text-slate-500">Tasks assigned by your teacher</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('assignments')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingAssignmentsList.length > 0 ? (
              <div className="space-y-2.5">
                {pendingAssignmentsList.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          {a.subject}
                        </span>
                        <span className="text-[11px] text-slate-500">Due: {new Date(a.due_date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{a.title}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('assignments', a.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Submit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                🎉 All caught up! No pending homework tasks.
              </div>
            )}
          </div>

          {/* Recent Notes Library Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Study Notes & Guides</h3>
                <p className="text-xs text-slate-500">Access reading materials and formulas</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {materialsList.length > 0 ? (
                materialsList.slice(0, 2).map((m: StudyMaterial) => (
                  <div
                    key={m.id}
                    onClick={() => setViewingMaterial(m)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                        {m.subject}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{m.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>
                    </div>
                    <div className="mt-3 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read notes</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-xs text-slate-400">
                  No notes available yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Announcements & Notice Board */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-rose-500" />
                <span>Notice Board</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                All Notices
              </button>
            </div>

            {announcementsList.length > 0 ? (
              <div className="space-y-3">
                {announcementsList.map((ann: Announcement) => (
                  <div
                    key={ann.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      ann.priority === 'urgent'
                        ? 'border-red-200 bg-red-50/30'
                        : ann.priority === 'important'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{ann.title}</span>
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
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3">
                      {ann.message}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-2">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No active notices.</p>
            )}
          </div>
        </div>
      </div>

      {/* Reader modal */}
      {viewingMaterial && (
        <NotesViewerModal
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
          isStudent
        />
      )}
    </div>
  );
};
