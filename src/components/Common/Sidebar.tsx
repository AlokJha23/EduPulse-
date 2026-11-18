import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  BookOpen,
  FileCheck2,
  HelpCircle,
  Award,
  Megaphone,
  FileText,
  User,
  Settings,
  ShieldCheck,
  MessageSquare,
  Building2,
  Landmark,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentView?: string;
  activeView?: string;
  onNavigate?: (view: string) => void;
  onSelectView?: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeView,
  onNavigate,
  onSelectView,
  isOpen,
  onClose,
}) => {
  const { user, teacher, student, role } = useAuth();
  const current = currentView || activeView || 'dashboard';

  const handleSelect = (viewId: string) => {
    if (onNavigate) onNavigate(viewId);
    if (onSelectView) onSelectView(viewId);
    onClose();
  };

  const isTeacher =
    role === 'TEACHER' ||
    user?.role === 'TEACHER' ||
    role?.toLowerCase() === 'teacher' ||
    user?.role?.toLowerCase() === 'teacher';

  const teacherNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students Roster', icon: Users, badge: 'Manage' },
    { id: 'classes', label: 'Classes & Batches', icon: Layers },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
    { id: 'notes', label: 'Notes & Multi-Media', icon: BookOpen },
    { id: 'doubts', label: 'Doubt Resolution', icon: MessageSquare, badge: 'Rich' },
    { id: 'assignments', label: 'Assignments', icon: FileCheck2 },
    { id: 'tests', label: 'CBT Mock Tests', icon: HelpCircle, badge: 'PW/Allen' },
    { id: 'marks', label: 'Marks & Results', icon: Award },
    { id: 'announcements', label: 'Notices & Video Broadcast', icon: Megaphone },
    { id: 'reports', label: 'Master Reports', icon: FileText },
    { id: 'school-profile', label: 'School / Tuition Profile', icon: Landmark },
    { id: 'staff', label: 'Faculty & Academy Hub', icon: Building2, badge: 'Collab' },
    { id: 'profile', label: 'Faculty Profile', icon: Settings },
  ];

  const studentNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notes', label: 'Study Library & Handouts', icon: BookOpen },
    { id: 'doubts', label: 'Ask Doubts (Photo/PDF)', icon: MessageSquare, badge: '24/7' },
    { id: 'tests', label: 'Online CBT Tests', icon: HelpCircle, badge: 'PW/Allen' },
    { id: 'assignments', label: 'Homework & Tasks', icon: FileCheck2 },
    { id: 'attendance', label: 'My Attendance', icon: CalendarCheck },
    { id: 'marks', label: 'Marks & Scorecard', icon: Award },
    { id: 'announcements', label: 'Notices & Video Lectures', icon: Megaphone },
    { id: 'school-profile', label: 'School / Tuition Info', icon: Landmark },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 lg:top-16 bottom-0 left-0 z-50 lg:z-20 w-72 lg:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: School Logo & Name + Mobile Close Button */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={(isTeacher ? teacher?.academy_logo : student?.academy_logo) || '/logo.png'}
              alt={
                isTeacher
                  ? teacher?.academy_name || teacher?.institution || 'School Logo'
                  : student?.academy_name || 'School Logo'
              }
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0 ring-1 ring-slate-700 shadow-xs"
            />
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-white truncate">
                {isTeacher
                  ? teacher?.academy_name || teacher?.institution || 'Academiq Campus'
                  : student?.academy_name || 'Academiq Campus'}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {isTeacher
                  ? `Teacher: ${teacher?.teacher_id || 'teacher001'}`
                  : `${student?.class_name || 'Student'} • ID: ${student?.student_id || 'STU-001'}`}
              </span>
            </div>
          </div>

          <button
            id="close-sidebar-mobile-btn"
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middle: Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isTeacher ? 'Faculty Suite (Offline Ready)' : 'Student Learning Suite'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? isTeacher
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Credits & Contact requested by user */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Build by <strong className="text-indigo-400">"Alok"</strong></span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono">Offline-Ready</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            "For More Details" - <a href="mailto:alokkumar02012@gmail.com" className="text-emerald-400 hover:underline">alokkumar02012@gmail.com</a>
          </div>
        </div>
      </aside>
    </>
  );
};
