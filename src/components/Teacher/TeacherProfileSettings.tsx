import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Settings,
  Lock,
  User,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  Camera,
  Trash2,
  BookOpen,
  Save,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { COMMON_SUBJECTS } from '../../constants/academic';
import { readImageFileAsDataUrl } from '../../utils/imageUpload';

export const TeacherProfileSettings: React.FC = () => {
  const { user, teacher, changePassword, refreshAuth } = useAuth();

  // Profile Edit State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [institution, setInstitution] = useState('');
  const [academyLogo, setAcademyLogo] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (teacher || user) {
      setName(teacher?.name || user?.name || '');
      setSubject(teacher?.subject || 'All Subjects');
      setInstitution(teacher?.academy_name || teacher?.institution || 'Academiq Academy');
      setAcademyLogo(teacher?.academy_logo || '');
      setPhone(teacher?.phone || user?.phone || '');
      setBio(teacher?.bio || '');
      setProfilePhoto(teacher?.profile_photo || user?.profile_photo || '');
    }
  }, [teacher, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 512);
      setProfilePhoto(dataUrl);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to read profile photo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 512);
      setAcademyLogo(dataUrl);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to read school logo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhoto('');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsSavingProfile(true);

    try {
      const trimmedInstitution = institution.trim() || 'Academiq Academy';
      await api.teacher.updateProfile({
        name: name.trim(),
        subject: subject.trim() || 'All Subjects',
        institution: trimmedInstitution,
        academy_name: trimmedInstitution,
        academy_logo: academyLogo,
        phone: phone.trim(),
        bio: bio.trim(),
        profile_photo: profilePhoto,
      });

      await refreshAuth();
      setProfileSuccess('Profile & School Branding updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPassSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 4000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPass(false);
    }
  };

  const displayName = name || teacher?.name || user?.name || 'Teacher';

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>Faculty Profile & Account Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal educator information, subject specialization, and login password.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Edit Profile Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Personal & Academic Details</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize your name, subject, and optional profile picture.
              </p>
            </div>
            <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              ID: {teacher?.teacher_id || 'teacher001'}
            </span>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {/* Photo & Avatar Section */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="relative shrink-0">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="text-xs font-semibold text-slate-800">Profile Photo (Optional)</div>
              <p className="text-[11px] text-slate-500">
                Upload your picture or keep clean initials avatar.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5 border border-indigo-200">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {profilePhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 border border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="teacher-profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. John Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Subject / Specialization
                </label>
                <input
                  id="teacher-profile-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. All Subjects, Mathematics, Physics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Subject Chips */}
            <div>
              <span className="block text-[11px] text-slate-500 mb-1.5">
                Quick select subject:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUBJECTS.slice(0, 8).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      subject === sub
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* School Branding (Logo & Name) */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>School Name & Logo (Shown Everywhere)</span>
                </span>
                <span className="text-[10px] font-medium text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Teacher • Student • Admin
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <img
                  src={academyLogo || '/logo.png'}
                  alt={institution || 'School Logo'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-indigo-200 shadow-2xs shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Upload your school logo in any image format (PNG, JPG, SVG, WebP, GIF, BMP).
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{academyLogo ? 'Change School Logo' : 'Upload School Logo'}</span>
                      <input
                        id="teacher-profile-school-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleSchoolLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {academyLogo && (
                      <button
                        type="button"
                        onClick={() => setAcademyLogo('')}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 bg-white rounded-lg text-xs font-medium inline-flex items-center gap-1 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School / Institution Name (Shown at Top of All Pages)
                </label>
                <input
                  id="teacher-profile-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Academiq Academy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  id="teacher-profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                About / Faculty Bio
              </label>
              <textarea
                id="teacher-profile-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief introduction or teaching philosophy..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              id="save-teacher-profile-btn"
              type="submit"
              disabled={isSavingProfile}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Account Security & Credentials Overview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security & Password Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-600" />
              <span>Update Password</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ensure your faculty account has a strong private password.
            </p>

            {passError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs mb-4 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                id="submit-teacher-change-password-btn"
                type="submit"
                disabled={isChangingPass}
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Account Overview Info Box */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Institutional Privacy & Security</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Your educator account is completely isolated. Only students registered by you with their designated Student IDs and temporary passwords can access your classrooms, study notes, assignments, and test papers.
            </p>
            <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px] space-y-1">
              <div>
                <span className="font-semibold text-slate-700">Registered Email: </span>
                {user?.email}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Account Role: </span>
                <span className="text-emerald-700 font-bold">Verified Faculty Lead</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
