import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  BookOpen,
  UserCheck,
  Users,
  Lock,
  Unlock,
  Mail,
  Building,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  BookCheck,
  ClipboardList,
  Award,
  CalendarCheck,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { readImageFileAsDataUrl } from '../../utils/imageUpload';

type TabMode = 'teacher_login' | 'student_login' | 'teacher_signup' | 'student_signup';

export const LoginView: React.FC = () => {
  const {
    loginTeacher,
    signupTeacher,
    loginStudent,
    loginWithEmail,
    signupWithEmail,
  } = useAuth();

  const [tab, setTab] = useState<TabMode>('teacher_login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Faculty Security Passcode Gate state
  const [facultyPasscode, setFacultyPasscode] = useState('');
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);
  const [passcodeVerifying, setPasscodeVerifying] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  const [verifiedAcademyName, setVerifiedAcademyName] = useState<string | null>(null);
  const [verifiedAcademyLogo, setVerifiedAcademyLogo] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  const handleVerifyPasscode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!facultyPasscode.trim()) {
      setPasscodeError('Please enter the Faculty Authorization Passcode.');
      return;
    }
    setPasscodeError('');
    setPasscodeVerifying(true);
    try {
      const res = await api.verifyTeacherPasscode(facultyPasscode.trim());
      if (res.valid) {
        setIsPasscodeUnlocked(true);
        if (res.academy_name) {
          setVerifiedAcademyName(res.academy_name);
          setTeacherInstitution(res.academy_name);
        }
        if (res.academy_logo) {
          setVerifiedAcademyLogo(res.academy_logo);
        }
      } else {
        setPasscodeError(res.error || 'Invalid passcode. Access denied.');
      }
    } catch (err: any) {
      setPasscodeError(err.message || 'Passcode verification failed. Please try again.');
    } finally {
      setPasscodeVerifying(false);
    }
  };

  // Teacher signup fields
  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherInstitution, setTeacherInstitution] = useState('');
  const [academyLogo, setAcademyLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [schoolRegType, setSchoolRegType] = useState<'new_school' | 'join_school'>('new_school');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [schoolBoard, setSchoolBoard] = useState('CBSE');
  const [instituteType, setInstituteType] = useState('School');
  const [principalName, setPrincipalName] = useState('');
  const [vicePrincipalName, setVicePrincipalName] = useState('');
  const [schoolTagline, setSchoolTagline] = useState('');
  const [schoolTimings, setSchoolTimings] = useState('');
  const [schoolContactPhone, setSchoolContactPhone] = useState('');
  const [schoolContactEmail, setSchoolContactEmail] = useState('');
  const [schoolWebsite, setSchoolWebsite] = useState('');
  const [affiliationNumber, setAffiliationNumber] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [campusAddress, setCampusAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [aboutSchool, setAboutSchool] = useState('');
  const [showExtraSchoolDetails, setShowExtraSchoolDetails] = useState(false);

  const handleSchoolLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLogoUploading(true);
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 512);
      setAcademyLogo(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to load school logo image.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'teacher_login') {
        await loginTeacher(identifier, password);
      } else if (tab === 'student_login') {
        await loginStudent(identifier, password);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasscodeUnlocked || !facultyPasscode.trim()) {
      setError('Security Verification Required: Please enter and verify the Faculty Authorization Passcode.');
      return;
    }

    if (schoolRegType === 'new_school' && !teacherInstitution.trim()) {
      setError('Please enter the School / Institution Name.');
      return;
    }

    if (schoolRegType === 'join_school' && !schoolCodeInput.trim()) {
      setError('Please enter the School Join Code provided by your Principal.');
      return;
    }

    if (teacherPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (teacherPassword !== teacherConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signupTeacher({
        name: teacherName,
        teacher_id: teacherId,
        email: teacherEmail,
        phone: teacherPhone,
        password: teacherPassword,
        confirm_password: teacherConfirmPassword,
        subject: teacherSubject || 'General Academics',
        institution: teacherInstitution || verifiedAcademyName || 'Academic Institute',
        academy_logo: schoolRegType === 'new_school' ? academyLogo : verifiedAcademyLogo || '',
        registration_type: schoolRegType,
        school_code: schoolCodeInput,
        board: schoolBoard,
        institute_type: instituteType,
        principal_name: principalName,
        vice_principal_name: vicePrincipalName,
        tagline: schoolTagline,
        timings: schoolTimings,
        contact_phone: schoolContactPhone || teacherPhone,
        contact_email: schoolContactEmail || teacherEmail,
        website: schoolWebsite,
        affiliation_number: affiliationNumber,
        established_year: establishedYear,
        address: campusAddress,
        city_state: cityState,
        about: aboutSchool,
        faculty_passcode: facultyPasscode.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Academiq Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-indigo-500/30 bg-white"
          />
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Academiq</span>
            <span className="block text-xs font-medium text-slate-400">Education Suite</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Role-Based Secure Portal</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Platform Features Overview */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Management & Learning Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Academic Excellence, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              Seamlessly Synchronized.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
            A comprehensive institutional platform designed for educators to organize classes, manage student rosters, publish study materials, record attendance, and evaluate examinations.
          </p>

          {/* Key Platform Modules */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <BookOpen className="w-5 h-5 text-indigo-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-200">Study Notes Library</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Organized by subject, chapter & topic</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <CalendarCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-200">Daily Attendance</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Quick roll call & monthly reports</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <ClipboardList className="w-5 h-5 text-amber-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-200">Assignments & Quizzes</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Timed tests with automated grading</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Award className="w-5 h-5 text-rose-400 mb-2" />
              <h3 className="text-xs font-bold text-slate-200">Marks & Report Cards</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Academic tracking with PDF exports</p>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Authentication Card */}
        <div className="lg:col-span-6">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Role / Auth Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 p-1 border-b border-slate-200 text-xs font-semibold text-center">
              <button
                id="tab-teacher-login"
                type="button"
                onClick={() => {
                  setTab('teacher_login');
                  setError('');
                }}
                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'teacher_login'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Teacher Login</span>
              </button>

              <button
                id="tab-student-login"
                type="button"
                onClick={() => {
                  setTab('student_login');
                  setError('');
                }}
                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'student_login'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Student Login</span>
              </button>

              <button
                id="tab-teacher-signup"
                type="button"
                onClick={() => {
                  setTab('teacher_signup');
                  setError('');
                }}
                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'teacher_signup'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Teacher Sign Up</span>
                {!isPasscodeUnlocked ? (
                  <span title="Protected by Faculty Security Passcode">
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  </span>
                ) : (
                  <span title="Faculty Passcode Verified">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  </span>
                )}
              </button>

              <button
                id="tab-student-signup"
                type="button"
                onClick={() => {
                  setTab('student_signup');
                  setError('');
                }}
                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'student_signup'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookCheck className="w-3.5 h-3.5" />
                <span>Student Sign Up</span>
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {error && (
                <div id="auth-error-banner" className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. TEACHER LOGIN FORM */}
              {tab === 'teacher_login' && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <h2 className="text-xl font-bold text-slate-900">Teacher Portal Sign In</h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Sign in with your Teacher ID or registered institutional email address.
                    </p>
                  </div>

                  <form id="teacher-login-form" onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Teacher ID or Email Address
                      </label>
                      <div className="relative">
                        <input
                          id="teacher-login-id"
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter Teacher ID or email"
                          className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Password
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          id="teacher-login-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-800">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Multi-Tenant Data Isolation:</strong> Every educator account receives a distinct, isolated PostgreSQL database workspace.</span>
                    </div>

                    <button
                      id="teacher-login-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Authenticating...' : 'Sign In as Teacher'}
                    </button>
                  </form>
                </div>
              )}

              {/* 2. STUDENT LOGIN FORM */}
              {tab === 'student_login' && (
                <form id="student-login-form" onSubmit={handleLogin} className="space-y-4">
                  <div className="mb-2">
                    <h2 className="text-xl font-bold text-slate-900">Student Portal Sign In</h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Log in with the Student ID and password provided by your teacher.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Student ID or Registered Email
                    </label>
                    <div className="relative">
                      <input
                        id="student-login-id"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter Student ID (e.g. STU-2026-00001)"
                        className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                      <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="student-login-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800">
                    💡 <strong>First time signing in?</strong> Enter the temporary password issued by your teacher. You will be prompted to set your personal permanent password.
                  </div>

                  <button
                    id="student-login-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Authenticating...' : 'Sign In as Student'}
                  </button>
                </form>
              )}

              {/* 3. TEACHER SIGN UP (PASSCODE PROTECTED GATE) */}
              {tab === 'teacher_signup' && !isPasscodeUnlocked && (
                <div id="faculty-passcode-gate" className="space-y-4 py-2">
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-50/50 border border-indigo-200/80 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 mx-auto mb-3.5">
                      <KeyRound className="w-6 h-6" />
                    </div>

                    <div className="text-center max-w-md mx-auto">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-[11px] mb-2 border border-indigo-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Faculty Security Verification</span>
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Institution Passcode Required
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        To prevent unauthorized student access, teacher registration is strictly restricted. Please enter the authorized faculty security passcode to proceed.
                      </p>
                    </div>

                    {/* Passcode Verification Form */}
                    <form onSubmit={handleVerifyPasscode} className="mt-5 space-y-3">
                      {passcodeError && (
                        <div id="passcode-error-message" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{passcodeError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 text-left">
                          Enter Faculty Security Passcode
                        </label>
                        <div className="relative">
                          <input
                            id="faculty-security-passcode-input"
                            type={showPasscode ? 'text' : 'password'}
                            value={facultyPasscode}
                            onChange={(e) => {
                              setFacultyPasscode(e.target.value);
                              if (passcodeError) setPasscodeError('');
                            }}
                            placeholder="Enter authorization passcode"
                            required
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasscode(!showPasscode)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        id="btn-verify-faculty-passcode"
                        type="submit"
                        disabled={passcodeVerifying}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {passcodeVerifying ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying Passcode...</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Verify Passcode & Unlock Teacher Sign Up</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* 3. TEACHER SIGN UP FORM (UNLOCKED) */}
              {tab === 'teacher_signup' && isPasscodeUnlocked && (
                <div className="space-y-4">
                  {/* Verified Ribbon */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Faculty Access Authorized</span>
                        <span className="text-emerald-700 text-[11px] ml-1.5">
                          (Verified Educator{verifiedAcademyName && ` • ${verifiedAcademyName}`})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasscodeUnlocked(false);
                        setFacultyPasscode('');
                      }}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      Re-lock
                    </button>
                  </div>

                  <div className="mb-2">
                    <h2 className="text-xl font-bold text-slate-900">Create Educator Account</h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Fill in your institutional credentials to register your educator account.
                    </p>
                  </div>

                  <form id="teacher-signup-form" onSubmit={handleTeacherSignup} className="space-y-3.5">
                    {/* School Registration Type Selector */}
                    <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSchoolRegType('new_school')}
                        className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          schoolRegType === 'new_school'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>Register New School</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchoolRegType('join_school')}
                        className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          schoolRegType === 'join_school'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Join School Faculty</span>
                      </button>
                    </div>

                    {schoolRegType === 'new_school' ? (
                      <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2.5">
                        <div className="grid sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              School / Institution Name *
                            </label>
                            <input
                              id="teacher-signup-institution"
                              type="text"
                              required
                              value={teacherInstitution}
                              onChange={(e) => setTeacherInstitution(e.target.value)}
                              placeholder="e.g. Delhi Public School, R.K. Puram"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Board / Affiliation
                            </label>
                            <select
                              value={schoolBoard}
                              onChange={(e) => setSchoolBoard(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                            >
                              <option value="CBSE">CBSE Board</option>
                              <option value="ICSE">ICSE / ISC</option>
                              <option value="State Board">State Board</option>
                              <option value="IB">IB World</option>
                              <option value="Cambridge">Cambridge IGCSE</option>
                              <option value="Coaching Institute">Coaching Institute</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Institute Type
                            </label>
                            <select
                              id="teacher-signup-institute-type"
                              value={instituteType}
                              onChange={(e) => setInstituteType(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                            >
                              <option value="School">School</option>
                              <option value="Tuition / Coaching Center">Tuition / Coaching Center</option>
                              <option value="Junior College">Junior College</option>
                              <option value="Academy">Academy</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Principal Name
                            </label>
                            <input
                              id="teacher-signup-principal-name"
                              type="text"
                              value={principalName}
                              onChange={(e) => setPrincipalName(e.target.value)}
                              placeholder="e.g. Dr. R.K. Sharma"
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Vice Principal Name
                            </label>
                            <input
                              id="teacher-signup-vice-principal-name"
                              type="text"
                              value={vicePrincipalName}
                              onChange={(e) => setVicePrincipalName(e.target.value)}
                              placeholder="e.g. Prof. Meenakshi"
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                            />
                          </div>
                        </div>

                        {/* School Logo Photo Upload (Any Image Format) */}
                        <div className="p-2.5 bg-white rounded-lg border border-indigo-200/80 flex items-center gap-3">
                          {academyLogo ? (
                            <img
                              src={academyLogo}
                              alt="School Logo Preview"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-dashed border-indigo-300 flex items-center justify-center text-indigo-500 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800">
                              School Logo Photo (Any Format)
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug">
                              Upload PNG, JPG, SVG, WebP, GIF, BMP, etc. Shown in the top corner for Teachers, Students &amp; Admins.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors">
                                <Upload className="w-3 h-3" />
                                <span>
                                  {logoUploading
                                    ? 'Processing...'
                                    : academyLogo
                                    ? 'Change Logo'
                                    : 'Upload School Logo'}
                                </span>
                                <input
                                  id="teacher-signup-school-logo"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSchoolLogoSelect}
                                  className="hidden"
                                />
                              </label>
                              {academyLogo && (
                                <button
                                  type="button"
                                  onClick={() => setAcademyLogo('')}
                                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Additional School / Tuition Profile Details */}
                        <div className="border-t border-indigo-200/60 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowExtraSchoolDetails((v) => !v)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-indigo-700 hover:text-indigo-900 py-1 cursor-pointer"
                          >
                            <span>Add Timings, Contact &amp; Campus Address</span>
                            {showExtraSchoolDetails ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {showExtraSchoolDetails && (
                            <div className="mt-2 space-y-2.5 pt-2 border-t border-indigo-100">
                              <div className="grid sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Motto / Tagline
                                  </label>
                                  <input
                                    type="text"
                                    value={schoolTagline}
                                    onChange={(e) => setSchoolTagline(e.target.value)}
                                    placeholder="e.g. Knowledge & Excellence"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Campus / Batch Timings
                                  </label>
                                  <input
                                    type="text"
                                    value={schoolTimings}
                                    onChange={(e) => setSchoolTimings(e.target.value)}
                                    placeholder="e.g. 8:00 AM – 2:30 PM"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Official Phone
                                  </label>
                                  <input
                                    type="tel"
                                    value={schoolContactPhone}
                                    onChange={(e) => setSchoolContactPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Official Email
                                  </label>
                                  <input
                                    type="email"
                                    value={schoolContactEmail}
                                    onChange={(e) => setSchoolContactEmail(e.target.value)}
                                    placeholder="office@school.edu"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Affiliation / Registration No.
                                  </label>
                                  <input
                                    type="text"
                                    value={affiliationNumber}
                                    onChange={(e) => setAffiliationNumber(e.target.value)}
                                    placeholder="e.g. CBSE-2730194"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Established Year
                                  </label>
                                  <input
                                    type="text"
                                    value={establishedYear}
                                    onChange={(e) => setEstablishedYear(e.target.value)}
                                    placeholder="e.g. 2005"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Website
                                  </label>
                                  <input
                                    type="text"
                                    value={schoolWebsite}
                                    onChange={(e) => setSchoolWebsite(e.target.value)}
                                    placeholder="https://yourschool.edu"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    City &amp; State
                                  </label>
                                  <input
                                    type="text"
                                    value={cityState}
                                    onChange={(e) => setCityState(e.target.value)}
                                    placeholder="e.g. Lucknow, UP"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Campus Street Address
                                </label>
                                <input
                                  type="text"
                                  value={campusAddress}
                                  onChange={(e) => setCampusAddress(e.target.value)}
                                  placeholder="e.g. Plot 14, Sector 8"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  About Institution
                                </label>
                                <textarea
                                  rows={2}
                                  value={aboutSchool}
                                  onChange={(e) => setAboutSchool(e.target.value)}
                                  placeholder="Brief summary of courses, facilities, or classes..."
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-indigo-900 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Creates an independent, 100% data-isolated campus portal with auto-provisioned classes.</span>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          School Join Code *
                        </label>
                        <input
                          id="teacher-signup-school-code"
                          type="text"
                          required
                          value={schoolCodeInput}
                          onChange={(e) => setSchoolCodeInput(e.target.value.toUpperCase())}
                          placeholder="Enter School Code (e.g. SCH-4921 or DPS-1234)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase"
                        />
                        <p className="text-[11px] text-slate-600">
                          Ask your school Principal for the School Join Code to automatically link into your school's faculty portal.
                        </p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Principal / Faculty Name *</label>
                        <input
                          id="teacher-signup-name"
                          type="text"
                          required
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          placeholder="e.g. Dr. John Doe"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Desired Teacher ID *</label>
                        <input
                          id="teacher-signup-id"
                          type="text"
                          required
                          value={teacherId}
                          onChange={(e) => setTeacherId(e.target.value)}
                          placeholder="e.g. teacher002"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                        <input
                          id="teacher-signup-email"
                          type="email"
                          required
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          placeholder="teacher@school.edu"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                        <input
                          id="teacher-signup-phone"
                          type="tel"
                          value={teacherPhone}
                          onChange={(e) => setTeacherPhone(e.target.value)}
                          placeholder="+91 (555) 000-0000"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Primary Subject
                      </label>
                      <input
                        id="teacher-signup-subject"
                        type="text"
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        placeholder="e.g. All Subjects (or specific subject)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                      <input
                        id="teacher-signup-password"
                        type="password"
                        required
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password</label>
                      <input
                        id="teacher-signup-confirm-password"
                        type="password"
                        required
                        value={teacherConfirmPassword}
                        onChange={(e) => setTeacherConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    id="teacher-signup-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Complete Teacher Registration'}
                  </button>
                </form>
                </div>
              )}

              {/* 4. STUDENT SIGN UP RESTRICTION POLICY */}
              {tab === 'student_signup' && (
                <div id="student-signup-policy" className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Student Account Issuance</h2>
                    <p className="text-slate-600 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                      To preserve institutional academic security, student accounts are issued and managed directly by teachers. Contact your instructor to receive your <strong>Student ID</strong> and password.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left text-slate-700 space-y-2">
                    <p className="font-semibold text-slate-900">Steps to sign in:</p>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                      <span>Ask your teacher to add your name to their classroom student roster.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                      <span>Receive your system-generated Student ID (e.g. <code>STU-2026-00001</code>) and temporary password.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                      <span>Switch to <strong>Student Login</strong> and sign in to access your notes, assignments, tests, and marks.</span>
                    </div>
                  </div>

                  <button
                    id="switch-to-student-login-btn"
                    type="button"
                    onClick={() => setTab('student_login')}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Go to Student Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400 space-y-2 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-300">
            Build by <strong className="text-indigo-400 font-bold">"Alok"</strong>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400">
            "For More Details" -{' '}
            <a
              href="mailto:alokkumar02012@gmail.com"
              className="text-emerald-400 hover:text-emerald-300 font-mono underline underline-offset-2 transition-colors font-medium"
            >
              "alokkumar02012@gmail.com"
            </a>
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Academiq Education Platform • Secure Multi-Role Architecture
        </p>
      </footer>
    </div>
  );
};
