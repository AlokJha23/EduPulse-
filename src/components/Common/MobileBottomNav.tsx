import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  HelpCircle,
  CalendarCheck,
  Users,
  Award,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView?: string;
  activeView?: string;
  onNavigate?: (view: string) => void;
  onSelectView?: (view: string) => void;
  onOpenSidebar?: () => void;
  onToggleSidebar?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  activeView,
  onNavigate,
  onSelectView,
  onOpenSidebar,
  onToggleSidebar,
}) => {
  const { user, role } = useAuth();
  const active = currentView || activeView || 'dashboard';

  const handleSelect = (viewId: string) => {
    if (onNavigate) onNavigate(viewId);
    if (onSelectView) onSelectView(viewId);
  };

  const handleOpenMenu = () => {
    if (onOpenSidebar) onOpenSidebar();
    if (onToggleSidebar) onToggleSidebar();
  };

  const isTeacher =
    role === 'TEACHER' ||
    user?.role === 'TEACHER' ||
    role?.toLowerCase() === 'teacher' ||
    user?.role?.toLowerCase() === 'teacher';

  if (isTeacher) {
    return (
      <nav
        id="teacher-mobile-bottom-nav"
        aria-label="Teacher Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg select-none"
      >
        <button
          id="btn-mobile-overview"
          type="button"
          onClick={() => handleSelect('dashboard')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
            active === 'dashboard'
              ? 'text-indigo-600 font-bold bg-indigo-50/70 scale-105'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          id="btn-mobile-students"
          type="button"
          onClick={() => handleSelect('students')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
            active === 'students'
              ? 'text-indigo-600 font-bold bg-indigo-50/70 scale-105'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Students</span>
        </button>

        <button
          id="btn-mobile-attendance"
          type="button"
          onClick={() => handleSelect('attendance')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
            active === 'attendance'
              ? 'text-indigo-600 font-bold bg-indigo-50/70 scale-105'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <CalendarCheck className="w-5 h-5 mb-0.5" />
          <span>Attendance</span>
        </button>

        <button
          id="btn-mobile-notes"
          type="button"
          onClick={() => handleSelect('notes')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
            active === 'notes'
              ? 'text-indigo-600 font-bold bg-indigo-50/70 scale-105'
              : 'text-slate-500 hover:text-slate-900 active:scale-95'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Notes</span>
        </button>

        <button
          id="btn-mobile-all-tools"
          type="button"
          onClick={handleOpenMenu}
          className="flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium text-slate-600 hover:text-indigo-600 active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5 text-indigo-500" />
          <span className="font-semibold text-slate-800">All Tools</span>
        </button>
      </nav>
    );
  }

  // Student mobile bottom nav
  return (
    <nav
      id="student-mobile-bottom-nav"
      aria-label="Student Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg select-none"
    >
      <button
        id="btn-student-mobile-home"
        type="button"
        onClick={() => handleSelect('dashboard')}
        className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
          active === 'dashboard'
            ? 'text-emerald-600 font-bold bg-emerald-50/70 scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </button>

      <button
        id="btn-student-mobile-notes"
        type="button"
        onClick={() => handleSelect('notes')}
        className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
          active === 'notes'
            ? 'text-emerald-600 font-bold bg-emerald-50/70 scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95'
        }`}
      >
        <BookOpen className="w-5 h-5 mb-0.5" />
        <span>Notes</span>
      </button>

      <button
        id="btn-student-mobile-assignments"
        type="button"
        onClick={() => handleSelect('assignments')}
        className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
          active === 'assignments'
            ? 'text-emerald-600 font-bold bg-emerald-50/70 scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95'
        }`}
      >
        <FileCheck2 className="w-5 h-5 mb-0.5" />
        <span>Homework</span>
      </button>

      <button
        id="btn-student-mobile-tests"
        type="button"
        onClick={() => handleSelect('tests')}
        className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer ${
          active === 'tests'
            ? 'text-emerald-600 font-bold bg-emerald-50/70 scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95'
        }`}
      >
        <HelpCircle className="w-5 h-5 mb-0.5" />
        <span>Tests</span>
      </button>

      <button
        id="btn-student-mobile-all-tools"
        type="button"
        onClick={handleOpenMenu}
        className="flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium text-slate-600 hover:text-emerald-600 active:scale-95 transition-all cursor-pointer"
      >
        <Menu className="w-5 h-5 mb-0.5 text-emerald-500" />
        <span className="font-semibold text-slate-800">All Tools</span>
      </button>
    </nav>
  );
};
