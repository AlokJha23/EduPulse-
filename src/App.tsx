import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/Auth/LoginView';
import { ForcePasswordChangeModal } from './components/Auth/ForcePasswordChangeModal';
import { Navbar } from './components/Common/Navbar';
import { Sidebar } from './components/Common/Sidebar';
import { MobileBottomNav } from './components/Common/MobileBottomNav';
import { NotificationDrawer } from './components/Common/NotificationDrawer';
import { GlobalSearchModal } from './components/Common/GlobalSearchModal';
import { NetworkStatusIndicator } from './components/Common/NetworkStatusIndicator';
import { SchoolProfileSection } from './components/Common/SchoolProfileSection';
import { isViewAllowedForRole } from './utils/rbac';

// Teacher Views
import { TeacherDashboard } from './components/Teacher/TeacherDashboard';
import { StudentManagement } from './components/Teacher/StudentManagement';
import { ClassManagement } from './components/Teacher/ClassManagement';
import { AttendanceTracker } from './components/Teacher/AttendanceTracker';
import { NotesManager } from './components/Teacher/NotesManager';
import { TeacherDoubts } from './components/Teacher/TeacherDoubts';
import { AssignmentManager } from './components/Teacher/AssignmentManager';
import { TestManager } from './components/Teacher/TestManager';
import { MarksManager } from './components/Teacher/MarksManager';
import { AnnouncementManager } from './components/Teacher/AnnouncementManager';
import { ReportsManager } from './components/Teacher/ReportsManager';
import { TeacherProfileSettings } from './components/Teacher/TeacherProfileSettings';
import { FacultyCollaboration } from './components/Teacher/FacultyCollaboration';

// Student Views
import { StudentDashboard } from './components/Student/StudentDashboard';
import { StudentNotesLibrary } from './components/Student/StudentNotesLibrary';
import { StudentDoubts } from './components/Student/StudentDoubts';
import { StudentAssignments } from './components/Student/StudentAssignments';
import { StudentTests } from './components/Student/StudentTests';
import { StudentAttendance } from './components/Student/StudentAttendance';
import { StudentMarks } from './components/Student/StudentMarks';
import { StudentAnnouncements } from './components/Student/StudentAnnouncements';
import { StudentProfile } from './components/Student/StudentProfile';

const AppContent: React.FC = () => {
  const { user, teacher, student, role, isLoading, mustChangePassword, setMustChangePassword } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [initialDetailId, setInitialDetailId] = useState<string | undefined>(undefined);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = (view: string, detailId?: string) => {
    // RBAC Security Check: Ensure view is authorized for the current user's role
    const effectiveRole = role || user?.role;
    if (!isViewAllowedForRole(effectiveRole, view)) {
      console.warn(`[RBAC] Access denied: Role "${effectiveRole}" cannot access view "${view}". Falling back to dashboard.`);
      setCurrentView('dashboard');
      setInitialDetailId(undefined);
      return;
    }
    setCurrentView(view);
    setInitialDetailId(detailId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep view in sync with role changes
  useEffect(() => {
    if (user) {
      const effectiveRole = role || user.role;
      if (!isViewAllowedForRole(effectiveRole, currentView)) {
        setCurrentView('dashboard');
      }
    }
  }, [user, role, currentView]);

  // Dynamically reflect the institution/school name in browser tab title
  useEffect(() => {
    const schoolName = teacher?.academy_name || teacher?.institution || student?.academy_name;
    document.title = schoolName ? `${schoolName} • Academiq` : 'Academiq Education Suite';
  }, [teacher?.academy_name, teacher?.institution, student?.academy_name]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-between p-6 text-white selection:bg-indigo-500 selection:text-white">
        <div className="w-full" />

        {/* Center: Logo & User Requested Identity Banner */}
        <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Academiq Logo"
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-2xl object-cover shadow-2xl shadow-indigo-500/40 ring-4 ring-white/10 bg-white animate-pulse"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Academiq
            </h1>
            <p className="text-xs font-medium text-slate-400">
              Academic & Online Mock Test Excellence Suite
            </p>
          </div>

          <div className="w-full max-w-xs py-1">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 rounded-full animate-pulse w-3/4 mx-auto" />
            </div>
          </div>

          {/* User Requested Requirement: Build by "Alok" & "For More Details" - "alokkumar02012@gmail.com" */}
          <div className="pt-4 border-t border-slate-800/80 w-full space-y-2">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-200">
              <span>Build by <strong className="text-indigo-400 font-bold">"Alok"</strong></span>
            </div>
            <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5">
              <span className="text-slate-400">"For More Details" -</span>
              <a
                href="mailto:alokkumar02012@gmail.com"
                className="text-emerald-400 hover:text-emerald-300 font-mono font-medium underline underline-offset-2 transition-colors"
              >
                "alokkumar02012@gmail.com"
              </a>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 font-medium pb-2">
          Academiq Workspace • Offline Capable Architecture
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const isTeacher =
    role === 'TEACHER' ||
    user.role === 'TEACHER' ||
    role?.toLowerCase() === 'teacher' ||
    user.role?.toLowerCase() === 'teacher';

  const isStudent =
    role === 'STUDENT' ||
    user.role === 'STUDENT' ||
    role?.toLowerCase() === 'student' ||
    user.role?.toLowerCase() === 'student';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Optional Forced Password Change Modal */}
      {mustChangePassword && (
        <ForcePasswordChangeModal onClose={() => setMustChangePassword(false)} />
      )}

      {/* Top Global Navbar */}
      <Navbar
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSchoolProfile={() => handleNavigate('school-profile')}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        activeView={currentView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Mobile Slide-over Sidebar */}
        <Sidebar
          currentView={currentView}
          activeView={currentView}
          onNavigate={handleNavigate}
          onSelectView={handleNavigate}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {isTeacher && (
            <>
              {currentView === 'dashboard' && <TeacherDashboard onNavigate={handleNavigate} />}
              {currentView === 'students' && (
                <StudentManagement initialDetailStudentId={initialDetailId} />
              )}
              {currentView === 'classes' && <ClassManagement />}
              {currentView === 'attendance' && <AttendanceTracker />}
              {currentView === 'notes' && (
                <NotesManager initialDetailMaterialId={initialDetailId} />
              )}
              {currentView === 'doubts' && <TeacherDoubts />}
              {currentView === 'assignments' && (
                <AssignmentManager initialDetailAssignmentId={initialDetailId} />
              )}
              {currentView === 'tests' && <TestManager />}
              {currentView === 'marks' && <MarksManager />}
              {currentView === 'announcements' && (
                <AnnouncementManager initialDetailAnnouncementId={initialDetailId} />
              )}
              {currentView === 'reports' && <ReportsManager />}
              {currentView === 'school-profile' && <SchoolProfileSection mode="teacher" />}
              {currentView === 'staff' && <FacultyCollaboration />}
              {currentView === 'profile' && <TeacherProfileSettings />}
            </>
          )}

          {isStudent && (
            <>
              {currentView === 'dashboard' && <StudentDashboard onNavigate={handleNavigate} />}
              {currentView === 'notes' && (
                <StudentNotesLibrary initialDetailMaterialId={initialDetailId} />
              )}
              {currentView === 'doubts' && <StudentDoubts />}
              {currentView === 'assignments' && (
                <StudentAssignments initialDetailAssignmentId={initialDetailId} />
              )}
              {currentView === 'tests' && (
                <StudentTests initialDetailTestId={initialDetailId} />
              )}
              {currentView === 'attendance' && <StudentAttendance />}
              {currentView === 'marks' && <StudentMarks />}
              {currentView === 'announcements' && (
                <StudentAnnouncements initialDetailAnnouncementId={initialDetailId} />
              )}
              {currentView === 'school-profile' && <SchoolProfileSection mode="student" />}
              {currentView === 'profile' && <StudentProfile />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Bar for touch-friendly navigation */}
      <MobileBottomNav
        currentView={currentView}
        activeView={currentView}
        onNavigate={handleNavigate}
        onSelectView={handleNavigate}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Global Search Dialog Modal */}
      {isSearchOpen && (
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={handleNavigate}
        />
      )}

      {/* Notification Drawer Modal */}
      {isNotificationsOpen && (
        <NotificationDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
      {/* Subtle Online/Offline Status Indicator */}
      <NetworkStatusIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
