import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Users,
  UserPlus,
  Copy,
  Check,
  Share2,
  Shield,
  KeyRound,
  ArrowRightLeft,
  Mail,
  Trash2,
  LogOut,
  Send,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Clock,
  Briefcase,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { readImageFileAsDataUrl } from '../../utils/imageUpload';

export const FacultyCollaboration: React.FC = () => {
  const { teacher, refreshAuth } = useAuth();
  const [data, setData] = useState<{
    academy: {
      id: string;
      name: string;
      code: string;
      logo?: string;
      academy_logo?: string;
      is_owner?: boolean;
      role: string;
      role_in_academy?: string;
      active_workspace_mode: 'personal' | 'academy';
      faculty_count: number;
    };
    faculty: any[];
    invitations: any[];
    memos: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Invite modal / form state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'teacher'>('teacher');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Join Academy state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Edit Academy Name state
  const [editingName, setEditingName] = useState(false);
  const [academyNameInput, setAcademyNameInput] = useState('');

  // Memo state
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoPriority, setMemoPriority] = useState<'normal' | 'urgent' | 'high'>('normal');
  const [memoSubmitting, setMemoSubmitting] = useState(false);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getStaff();
      if (res && res.academy) {
        setData(res);
        setAcademyNameInput(res.academy.name || '');
      } else {
        const fallbackAcademyName = teacher?.academy_name || teacher?.institution || 'Academiq Academy';
        const fallbackAcademyCode = teacher?.academy_code || 'ACAD-2026';
        const fallbackAcademyLogo = teacher?.academy_logo || '';
        setData({
          academy: {
            id: teacher?.academy_id || teacher?.id || 'default',
            name: fallbackAcademyName,
            code: fallbackAcademyCode,
            logo: fallbackAcademyLogo,
            academy_logo: fallbackAcademyLogo,
            is_owner: teacher?.is_owner ?? true,
            role: teacher?.role_in_academy || 'HEAD_TEACHER',
            active_workspace_mode: teacher?.active_workspace_mode || 'academy',
            faculty_count: 1,
          },
          faculty: [
            {
              id: teacher?.id || 't1',
              name: teacher?.name || 'Educator',
              email: teacher?.email || '',
              subject: teacher?.subject || 'All Subjects',
              role_in_academy: teacher?.role_in_academy || 'HEAD_TEACHER',
              is_current_user: true,
              is_owner: true,
            },
          ],
          invitations: [],
          memos: [],
        });
        setAcademyNameInput(fallbackAcademyName);
      }
    } catch (err: any) {
      console.warn('Faculty info load warning, applying profile fallback:', err);
      const fallbackAcademyName = teacher?.academy_name || teacher?.institution || 'Academiq Academy';
      const fallbackAcademyCode = teacher?.academy_code || 'ACAD-2026';
      const fallbackAcademyLogo = teacher?.academy_logo || '';
      setData({
        academy: {
          id: teacher?.academy_id || teacher?.id || 'default',
          name: fallbackAcademyName,
          code: fallbackAcademyCode,
          logo: fallbackAcademyLogo,
          academy_logo: fallbackAcademyLogo,
          is_owner: teacher?.is_owner ?? true,
          role: teacher?.role_in_academy || 'HEAD_TEACHER',
          active_workspace_mode: teacher?.active_workspace_mode || 'academy',
          faculty_count: 1,
        },
        faculty: [
          {
            id: teacher?.id || 't1',
            name: teacher?.name || 'Educator',
            email: teacher?.email || '',
            subject: teacher?.subject || 'All Subjects',
            role_in_academy: teacher?.role_in_academy || 'HEAD_TEACHER',
            is_current_user: true,
            is_owner: true,
          },
        ],
        invitations: [],
        memos: [],
      });
      setAcademyNameInput(fallbackAcademyName);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, []);

  const handleCopyCode = () => {
    if (!data?.academy?.code) return;
    navigator.clipboard.writeText(data.academy.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleToggleWorkspaceMode = async () => {
    if (!data) return;
    const targetMode = data.academy.active_workspace_mode === 'academy' ? 'personal' : 'academy';
    try {
      setSwitching(true);
      await api.teacher.switchWorkspace(targetMode);
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Failed to switch workspace mode');
    } finally {
      setSwitching(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await api.teacher.inviteStaff({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role_in_academy: inviteRole,
      });
      setInviteSuccess(res.message || 'Invitation sent successfully.');
      setInviteEmail('');
      setInviteName('');
      await loadStaffData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite colleague');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      await api.teacher.joinAcademy({ academy_code: joinCodeInput.trim() });
      setShowJoinModal(false);
      setJoinCodeInput('');
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or non-existent academy code');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleSaveAcademyName = async () => {
    if (!academyNameInput.trim()) return;
    try {
      await api.teacher.updateAcademy({ academy_name: academyNameInput.trim() });
      setEditingName(false);
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Failed to update academy name');
    }
  };

  const handleAcademyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const logoDataUrl = await readImageFileAsDataUrl(file, 512);
      await api.teacher.updateAcademy({ academy_logo: logoDataUrl });
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Failed to update school logo');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveAcademyLogo = async () => {
    try {
      await api.teacher.updateAcademy({ academy_logo: '' });
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Failed to remove school logo');
    }
  };

  const handleRemoveFaculty = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this academy?`)) return;
    try {
      await api.teacher.removeStaff(id);
      await loadStaffData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove faculty member');
    }
  };

  const handleLeaveAcademy = async () => {
    if (
      !confirm(
        'Leave this academy? Your portal will revert to your private workspace, and you will not share students with other teachers unless you rejoin.'
      )
    )
      return;
    try {
      await api.teacher.leaveAcademy();
      await loadStaffData();
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Failed to leave academy');
    }
  };

  const handlePostMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim() || !memoContent.trim()) return;
    setMemoSubmitting(true);
    try {
      await api.teacher.postStaffMemo({
        title: memoTitle.trim(),
        content: memoContent.trim(),
        priority: memoPriority,
      });
      setMemoTitle('');
      setMemoContent('');
      await loadStaffData();
    } catch (err: any) {
      alert(err.message || 'Failed to post staff memo');
    } finally {
      setMemoSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs">Loading faculty workspace and collaboration hub...</p>
      </div>
    );
  }

  const isAcademyMode = data?.academy?.active_workspace_mode === 'academy';
  const isAdmin =
    Boolean(data?.academy?.is_owner) ||
    Boolean(teacher?.is_owner) ||
    data?.academy?.role === 'admin' ||
    data?.academy?.role === 'HEAD_TEACHER' ||
    data?.academy?.role_in_academy === 'HEAD_TEACHER' ||
    teacher?.role_in_academy === 'HEAD_TEACHER';
  const schoolLogoUrl =
    data?.academy?.logo || data?.academy?.academy_logo || teacher?.academy_logo || '/logo.png';
  const hasCustomSchoolLogo = Boolean(
    data?.academy?.logo || data?.academy?.academy_logo || teacher?.academy_logo
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Multi-Teacher & Admin Collaboration Hub</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <img
                  src={schoolLogoUrl}
                  alt={data?.academy?.name || 'School Logo'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain bg-white p-1 shadow-lg ring-2 ring-indigo-400/40"
                />
                {isAdmin && (
                  <label
                    className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    title="Upload or change school logo (any image format)"
                  >
                    <Camera className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAcademyLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {editingName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={academyNameInput}
                    onChange={(e) => setAcademyNameInput(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xl sm:text-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAcademyName}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {data?.academy?.name || 'Academiq Institute'}
                    </h1>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="text-xs text-indigo-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
                      >
                        Rename
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                      <label className="text-indigo-300 hover:text-white underline underline-offset-2 cursor-pointer inline-flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{hasCustomSchoolLogo ? 'Change School Logo' : 'Upload School Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAcademyLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {hasCustomSchoolLogo && (
                        <button
                          type="button"
                          onClick={handleRemoveAcademyLogo}
                          className="text-rose-300 hover:text-rose-200 underline underline-offset-2 cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Add multiple teachers to work collaboratively inside one shared institute portal. Teachers can share student rosters, take class attendance, publish study notes, and assign CBT tests together without starting with an empty screen!
            </p>
          </div>

          {/* Workspace Mode Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active View Mode
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isAcademyMode
                    ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500/40'
                    : 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isAcademyMode ? 'Academy Workspace (Shared)' : 'Personal Workspace (Private)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {isAcademyMode
                ? 'Showing all students, classes, notes, tests, and attendance across all teachers in this academy.'
                : 'Showing only your own personal students, batches, and private uploaded notes.'}
            </p>

            <button
              id="toggle-workspace-mode-btn"
              type="button"
              disabled={switching}
              onClick={handleToggleWorkspaceMode}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-indigo-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {switching
                  ? 'Switching...'
                  : isAcademyMode
                  ? 'Switch to Personal Mode'
                  : 'Switch to Academy Shared Mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick info strip */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Unique Academy Code:</span>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="font-mono font-bold text-amber-300 tracking-wider">
                  {data?.academy?.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-slate-400 hover:text-white p-0.5 transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                <strong className="text-white">{data?.faculty?.length || 1}</strong> Faculty Members
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="invite-faculty-open-btn"
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Teacher / Colleague</span>
            </button>
            <button
              id="join-other-academy-btn"
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Join Another Academy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Faculty List, Right is Staff Memos & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Faculty Members & Invitations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Faculty Members */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Enrolled Faculty & Teachers</h2>
                <p className="text-xs text-slate-500">
                  All educators who have access to this institute portal
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                {data?.faculty?.length || 1} Active
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.faculty?.map((member) => (
                <div
                  key={member.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {member.name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                        {member.role_in_academy === 'admin' || member.role_in_academy === 'HEAD_TEACHER' || member.is_owner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Shield className="w-3 h-3 text-amber-600" />
                            Principal / Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Briefcase className="w-3 h-3 text-indigo-600" />
                            Faculty Teacher
                          </span>
                        )}
                        {member.id === teacher?.id && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {member.email}
                        </span>
                        {member.subject && (
                          <span>
                            • Subject: <strong className="text-slate-700">{member.subject}</strong>
                          </span>
                        )}
                        {member.phone && <span>• Tel: {member.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {member.id === teacher?.id ? (
                      <button
                        type="button"
                        onClick={handleLeaveAcademy}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Leave this academy"
                      >
                        <LogOut className="w-3.5 h-3.5 inline mr-1" />
                        Leave
                      </button>
                    ) : isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveFaculty(member.id, member.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations */}
          {data?.invitations && data.invitations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Pending Colleague Invitations</h2>
                  <p className="text-xs text-slate-500">
                    When these teachers sign in or register with their invited email account, they will automatically join your academy
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                  {data.invitations.length} Pending
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {data.invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {inv.name || inv.email}
                        </div>
                        <div className="text-slate-500 text-[11px]">{inv.email}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60">
                      Invited as {inv.role_in_academy || 'teacher'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Guidance for Adding Teachers */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>How Teacher Collaboration Works (Zero-Empty-Portal Guarantee):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-indigo-600 block mb-1">1. Share Join Code</span>
                Give your Academy Code <strong className="font-mono text-slate-900 font-bold">"{data?.academy?.code}"</strong> to your fellow teacher.
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-indigo-600 block mb-1">2. Or Pre-Invite Email</span>
                Invite their email address above. When they sign in or sign up, they automatically join this academy!
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-indigo-600 block mb-1">3. Shared Data Instantly</span>
                Both teachers now see the exact same student roll numbers, classes, tests, and attendance without any blank screen.
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Internal Faculty Notice Board / Memos */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Staff Notice Board</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Faculty Only</span>
            </div>

            {/* Post Memo Form */}
            <form onSubmit={handlePostMemo} className="space-y-3">
              <input
                type="text"
                placeholder="Notice headline (e.g. Test Schedule update)"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <textarea
                rows={2}
                placeholder="Internal message or memo for all teachers..."
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
              <div className="flex items-center justify-between">
                <select
                  value={memoPriority}
                  onChange={(e: any) => setMemoPriority(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
                <button
                  type="submit"
                  disabled={memoSubmitting || !memoTitle.trim() || !memoContent.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Post Memo</span>
                </button>
              </div>
            </form>

            {/* Memo List */}
            <div className="space-y-3 pt-2">
              {data?.memos && data.memos.length > 0 ? (
                data.memos.map((memo) => (
                  <div
                    key={memo.id}
                    className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{memo.title}</span>
                      {memo.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{memo.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>By {memo.author_name}</span>
                      <span>{new Date(memo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No faculty memos posted yet. Use this board to coordinate curriculum pacing with other teachers.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Invite Colleague */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Invite Teacher / Colleague</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your colleague's email address. Once they log in or sign up with this email, they will automatically be linked to this academy with full collaborative access.
            </p>

            {inviteSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="teacher@school.edu or gmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sharma, Prof. Verma"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academy Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="teacher">Faculty Teacher (Can view/add students, marks, tests)</option>
                  <option value="admin">Co-Principal / Admin (Can manage staff & academy settings)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {inviteLoading ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Join Another Academy */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Join Existing Academy</h3>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              If another teacher or your institute head has created an academy, enter their 6-character Academy Code below to join their workspace immediately.
            </p>

            {joinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academy Code (6 Characters)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. ACD892"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono font-bold tracking-widest text-center uppercase border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinCodeInput.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {joinLoading ? 'Joining...' : 'Join Academy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
