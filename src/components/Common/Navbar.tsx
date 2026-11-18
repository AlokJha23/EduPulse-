import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Bell,
  Search,
  LogOut,
  User,
  Menu,
  X,
  Shield,
  BookOpen,
  Building2,
  ArrowRightLeft,
} from 'lucide-react';
import { CompactNetworkBadge } from './NetworkStatusIndicator';

interface NavbarProps {
  onOpenNotifications?: () => void;
  onOpenSearch: () => void;
  onOpenSchoolProfile?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  onOpenSearch,
  onOpenSchoolProfile,
  isSidebarOpen,
  onToggleSidebar,
  activeView,
}) => {
  const { user, teacher, student, role, logout, unreadNotifsCount, refreshAuth } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

  const displayName = teacher?.name || student?.name || user?.name || 'User';
  const isTeacher =
    role === 'TEACHER' ||
    user?.role === 'TEACHER' ||
    role?.toLowerCase() === 'teacher' ||
    user?.role?.toLowerCase() === 'teacher';

  const isAcademyMode = teacher?.active_workspace_mode === 'academy';

  const handleQuickWorkspaceToggle = async () => {
    try {
      setIsSwitchingWorkspace(true);
      const nextMode = isAcademyMode ? 'personal' : 'academy';
      await api.teacher.switchWorkspace(nextMode);
      await refreshAuth();
    } catch (err) {
      console.error('Failed to toggle workspace:', err);
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const roleLabel = isTeacher ? 'Teacher / Educator' : 'Enrolled Student';
  const schoolName = isTeacher
    ? teacher?.academy_name || teacher?.institution || 'Academiq Campus'
    : student?.academy_name || 'Academiq Campus';
  const schoolLogo = (isTeacher ? teacher?.academy_logo : student?.academy_logo) || '/logo.png';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
      {/* Left: Mobile hamburger & School Branding (Top Corner) */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
        <button
          id="toggle-sidebar-btn"
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <button
          id="navbar-school-profile-btn"
          type="button"
          onClick={onOpenSchoolProfile}
          title="Open School / Tuition Profile"
          className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer"
        >
          <img
            id="navbar-school-logo"
            src={schoolLogo}
            alt={`${schoolName} Logo`}
            referrerPolicy="no-referrer"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain p-0.5 shadow-sm shrink-0 bg-white ring-1 ring-slate-200"
          />
          <div className="min-w-0 max-w-[210px] sm:max-w-[300px] lg:max-w-[380px]">
            <span
              id="navbar-school-name"
              className="font-bold text-slate-900 text-sm sm:text-base leading-tight block truncate"
              title={schoolName}
            >
              {schoolName}
            </span>
            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
              {isTeacher
                ? teacher?.academy_code
                  ? `School Code: ${teacher.academy_code}`
                  : 'Faculty Portal'
                : student?.class_name
                ? `${student.class_name} • ${student.academy_code ? `Code: ${student.academy_code}` : 'Student Portal'}`
                : 'Student Learning Portal'}
            </span>
          </div>
        </button>
      </div>

      {/* Middle: Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          id="global-search-trigger-btn"
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search notes, students, assignments, tests...</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Notification Center & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Workspace Mode Indicator for Teachers */}
        {isTeacher && (
          <button
            id="navbar-workspace-toggle-btn"
            type="button"
            disabled={isSwitchingWorkspace}
            onClick={handleQuickWorkspaceToggle}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isAcademyMode
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-2xs'
            }`}
            title="Click to toggle between Personal and Academy Shared workspace"
          >
            {isAcademyMode ? (
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{isAcademyMode ? 'Academy Shared' : 'Personal Mode'}</span>
            <ArrowRightLeft className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        )}

        {/* Subtle Online/Offline Status Indicator */}
        <CompactNetworkBadge />

        {/* Mobile search icon */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            type="button"
            onClick={onOpenNotifications}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>

        {/* User Info & Dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                  isTeacher ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block">
              <span className="block text-xs font-semibold text-slate-900 leading-tight">
                {displayName}
              </span>
              <span className="block text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">
                {isTeacher
                  ? teacher?.subject || 'All Subjects'
                  : `${student?.class_name || 'Class'} (${student?.student_id || ''})`}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                id="user-menu-backdrop"
                onClick={() => setShowUserMenu(false)}
                className="fixed inset-0 z-40"
              />
              <div
                id="user-profile-dropdown"
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-xs text-slate-700 z-50 animate-in fade-in slide-in-from-top-1"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">{displayName}</p>
                  <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                    {isTeacher ? (
                      <Shield className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <BookOpen className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>{roleLabel}</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    id="navbar-logout-btn"
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
