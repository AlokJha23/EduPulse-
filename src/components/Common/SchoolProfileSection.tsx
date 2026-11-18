import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  UserCheck,
  Clock,
  Phone,
  Mail,
  Globe,
  MapPin,
  BookOpen,
  Calendar,
  Hash,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  Lock,
  Edit3,
  FileText,
  Award,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SchoolProfileDetails, StudentVisibleSchoolField } from '../../types';
import { readImageFileAsDataUrl } from '../../utils/imageUpload';

interface SchoolProfileSectionProps {
  mode: 'teacher' | 'student';
}

interface StudentSchoolViewData {
  academy_name: string;
  academy_logo?: string;
  principal_name?: string;
  vice_principal_name?: string;
  visible_extras: Array<{
    key: StudentVisibleSchoolField;
    label: string;
    value: string;
  }>;
}

const STUDENT_VISIBLE_OPTIONS: Array<{
  key: StudentVisibleSchoolField;
  label: string;
  hint: string;
}> = [
  { key: 'board', label: 'Board / Affiliation', hint: 'e.g. CBSE, ICSE, State Board' },
  { key: 'timings', label: 'Campus / Batch Timings', hint: 'Morning / Evening schedule' },
  { key: 'institute_type', label: 'Institution Type', hint: 'School, Tuition Center, Academy' },
  { key: 'tagline', label: 'Motto / Tagline', hint: 'Institutional vision statement' },
  { key: 'address', label: 'Campus Address', hint: 'Location and city/state' },
  { key: 'contact_phone', label: 'Helpline Phone', hint: 'Front-desk phone number' },
  { key: 'contact_email', label: 'Official Email', hint: 'Public institutional email' },
  { key: 'website', label: 'Official Website', hint: 'Institute portal URL' },
  { key: 'established_year', label: 'Established Year', hint: 'Founding year' },
  { key: 'about', label: 'About Institution', hint: 'Brief institution overview' },
];

const INSTITUTE_TYPES = [
  'School',
  'Tuition / Coaching Center',
  'Junior College',
  'Academy',
];

const EXTRA_FIELD_ICONS: Record<StudentVisibleSchoolField, React.ComponentType<{ className?: string }>> = {
  institute_type: Building2,
  board: Award,
  tagline: BookOpen,
  timings: Clock,
  contact_phone: Phone,
  contact_email: Mail,
  address: MapPin,
  website: Globe,
  established_year: Calendar,
  about: FileText,
};

const StudentSchoolCard: React.FC<{ data: StudentSchoolViewData; previewNotice?: boolean }> = ({
  data,
  previewNotice,
}) => {
  return (
    <div className="space-y-6">
      {previewNotice && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Live Student Portal View — Students only see School Name, Logo, Principal &amp; Vice Principal names, plus the extra items you enable.
          </span>
        </div>
      )}

      {/* Primary Identity Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
          <img
            src={data.academy_logo || '/logo.png'}
            alt={`${data.academy_name} Logo`}
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Institution Directory
            </p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 break-words">
              {data.academy_name || 'Academic Institute'}
            </h2>
          </div>
        </div>

        {/* Leadership Names */}
        <div className="grid sm:grid-cols-2 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Principal</span>
            </div>
            <p className="text-base font-bold text-slate-900 mt-1.5">
              {data.principal_name?.trim() || 'Not specified'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vice Principal</span>
            </div>
            <p className="text-base font-bold text-slate-900 mt-1.5">
              {data.vice_principal_name?.trim() || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Admin-selected Extra Information */}
        {data.visible_extras.length > 0 && (
          <div className="pt-6 mt-6 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Institution Highlights
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.visible_extras.map((item) => {
                const Icon = EXTRA_FIELD_ICONS[item.key] || Building2;
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-xl border border-slate-200 bg-white ${
                      item.key === 'about' || item.key === 'address' ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1 break-words whitespace-pre-line">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SchoolProfileSection: React.FC<SchoolProfileSectionProps> = ({ mode }) => {
  const { refreshAuth } = useAuth();

  // Shared loading / error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Teacher / Admin state
  const [activeTab, setActiveTab] = useState<'directory' | 'edit' | 'preview'>('directory');
  const [profile, setProfile] = useState<SchoolProfileDetails | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [stats, setStats] = useState({ total_faculty: 0, total_students: 0, total_classes: 0 });

  // Editable form state
  const [form, setForm] = useState<SchoolProfileDetails>({
    academy_name: '',
    academy_logo: '',
    institute_type: 'School',
    board: '',
    principal_name: '',
    vice_principal_name: '',
    tagline: '',
    affiliation_number: '',
    established_year: '',
    timings: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    address: '',
    city_state: '',
    about: '',
    student_visible_fields: ['board', 'timings'],
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Student-only state
  const [studentProfile, setStudentProfile] = useState<StudentSchoolViewData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'teacher') {
        const res = await api.teacher.getSchoolProfile();
        setProfile(res.school_profile);
        setCanEdit(res.can_edit);
        setStats(res.stats || { total_faculty: 0, total_students: 0, total_classes: 0 });
        setForm({
          academy_name: res.school_profile.academy_name || '',
          academy_logo: res.school_profile.academy_logo || '',
          institute_type: res.school_profile.institute_type || 'School',
          board: res.school_profile.board || '',
          principal_name: res.school_profile.principal_name || '',
          vice_principal_name: res.school_profile.vice_principal_name || '',
          tagline: res.school_profile.tagline || '',
          affiliation_number: res.school_profile.affiliation_number || '',
          established_year: res.school_profile.established_year || '',
          timings: res.school_profile.timings || '',
          contact_phone: res.school_profile.contact_phone || '',
          contact_email: res.school_profile.contact_email || '',
          website: res.school_profile.website || '',
          address: res.school_profile.address || '',
          city_state: res.school_profile.city_state || '',
          about: res.school_profile.about || '',
          student_visible_fields: Array.isArray(res.school_profile.student_visible_fields)
            ? res.school_profile.student_visible_fields
            : ['board', 'timings'],
        });
      } else {
        const res = await api.student.getSchoolProfile();
        setStudentProfile(res.school_profile);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load school profile.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveError('');
    setLogoUploading(true);
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 512);
      setForm((prev) => ({ ...prev, academy_logo: dataUrl }));
    } catch (err: any) {
      setSaveError(err.message || 'Failed to read school logo image.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const toggleStudentField = (key: StudentVisibleSchoolField) => {
    setSaveError('');
    setForm((prev) => {
      const current = prev.student_visible_fields || [];
      if (current.includes(key)) {
        return {
          ...prev,
          student_visible_fields: current.filter((item) => item !== key),
        };
      }
      if (current.length >= 3) {
        setSaveError('You can select up to 3 extra items to display on the Student School Profile.');
        return prev;
      }
      return {
        ...prev,
        student_visible_fields: [...current, key],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.academy_name.trim()) {
      setSaveError('School / Tuition Name cannot be empty.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const res = await api.teacher.updateSchoolProfile(form);
      setProfile(res.school_profile);
      setSaveMessage(res.message || 'School / Tuition Profile saved successfully.');
      await refreshAuth();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save School / Tuition Profile.');
    } finally {
      setSaving(false);
    }
  };

  const buildStudentPreview = (): StudentSchoolViewData => {
    const source = activeTab === 'edit' ? form : profile || form;
    const labelMap = Object.fromEntries(STUDENT_VISIBLE_OPTIONS.map((o) => [o.key, o.label]));
    const fullValues: Record<StudentVisibleSchoolField, string> = {
      institute_type: source.institute_type || '',
      board: source.board || '',
      tagline: source.tagline || '',
      timings: source.timings || '',
      contact_phone: source.contact_phone || '',
      contact_email: source.contact_email || '',
      address: [source.address, source.city_state].filter(Boolean).join(', '),
      website: source.website || '',
      established_year: source.established_year || '',
      about: source.about || '',
    };

    const allowed = source.student_visible_fields || [];
    const visible_extras = allowed
      .filter((key) => Boolean(fullValues[key]))
      .map((key) => ({
        key,
        label: labelMap[key] || key,
        value: fullValues[key],
      }));

    return {
      academy_name: source.academy_name || 'Academic Institute',
      academy_logo: source.academy_logo,
      principal_name: source.principal_name,
      vice_principal_name: source.vice_principal_name,
      visible_extras,
    };
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-slate-100 rounded" />
              <div className="h-3.5 w-64 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Unable to load School Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // STUDENT VIEW (Strictly isolated: Name, Logo, Principal, Vice Principal + Admin-chosen extras)
  if (mode === 'student') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>School / Tuition Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official institution name, leadership, and details shared by your school administration.
          </p>
        </div>

        {studentProfile && <StudentSchoolCard data={studentProfile} />}
      </div>
    );
  }

  // TEACHER / ADMIN VIEW
  const activeProfile = profile || form;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>School / Tuition Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete institution directory for faculty &amp; admins, with dedicated controls for what students see.
          </p>
        </div>

        {canEdit && activeTab !== 'edit' && (
          <button
            id="btn-open-school-profile-editor"
            type="button"
            onClick={() => setActiveTab('edit')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit School Profile</span>
          </button>
        )}
      </div>

      {/* Header Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={activeProfile.academy_logo || '/logo.png'}
              alt={`${activeProfile.academy_name} Logo`}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {activeProfile.academy_name || 'Academic Institute'}
              </h2>
              {activeProfile.tagline && (
                <p className="text-xs text-slate-600 mt-0.5 truncate">{activeProfile.tagline}</p>
              )}
              <p className="text-xs text-slate-500 mt-1 font-medium tabular-nums">
                {[
                  activeProfile.institute_type || 'School',
                  activeProfile.board,
                  activeProfile.academy_code ? `School Code: ${activeProfile.academy_code}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 shrink-0">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Faculty</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{stats.total_faculty}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Students</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{stats.total_students}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Classes</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{stats.total_classes}</div>
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            id="school-profile-tab-directory"
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Full School Directory</span>
          </button>

          <button
            id="school-profile-tab-edit"
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{canEdit ? 'Edit School & Student View' : 'Admin Controls (View Only)'}</span>
          </button>

          <button
            id="school-profile-tab-preview"
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Student View Preview</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FULL FACULTY / ADMIN DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Leadership Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              School / Tuition Leadership (Visible to Faculty &amp; Students)
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Principal Name</span>
                </div>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {activeProfile.principal_name || 'Not added yet'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Vice Principal Name</span>
                </div>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {activeProfile.vice_principal_name || 'Not added yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Institutional Identity & Administration (Faculty / Admin Full Details) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Institutional Identity &amp; Registration (Faculty &amp; Admin Only)
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Institution Type
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {activeProfile.institute_type || 'School'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Board / Affiliation
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {activeProfile.board || 'Not specified'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>Affiliation / Reg. No.</span>
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                  {activeProfile.affiliation_number || 'Not specified'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Established Year
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                  {activeProfile.established_year || 'Not specified'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Campus / Batch Timings
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {activeProfile.timings || 'Not specified'}
                </p>
              </div>
            </div>

            {activeProfile.about && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  About Institution
                </span>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                  {activeProfile.about}
                </p>
              </div>
            )}
          </div>

          {/* Contact & Campus Location */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Contact &amp; Campus Address
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Official Phone
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {activeProfile.contact_phone || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Official Email
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    {activeProfile.contact_email || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3">
                <Globe className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Website
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    {activeProfile.website || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Campus Address
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {[activeProfile.address, activeProfile.city_state].filter(Boolean).join(', ') ||
                      'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Student Visibility Summary */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                <strong>Shown to Students:</strong> School Name, Logo, Principal Name, Vice Principal Name
                {activeProfile.student_visible_fields && activeProfile.student_visible_fields.length > 0
                  ? ` · Extras: ${activeProfile.student_visible_fields
                      .map((k) => STUDENT_VISIBLE_OPTIONS.find((o) => o.key === k)?.label || k)
                      .join(', ')}`
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer self-start sm:self-auto"
              >
                Preview Student View →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN EDITOR & STUDENT VISIBILITY SETTINGS */}
      {activeTab === 'edit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {!canEdit ? (
            <div className="p-6 text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Admin Access Required</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Only the Principal / Head Educator (School Admin) can edit the institutional profile or adjust which fields appear on the Student School Profile.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {saveMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveMessage}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* School Logo Upload */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4">
                <img
                  src={form.academy_logo || '/logo.png'}
                  alt="School Logo"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">School / Tuition Logo</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Displayed in the top navigation bar and school profile for Admin, Faculty, and Students.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {logoUploading
                          ? 'Processing...'
                          : form.academy_logo
                          ? 'Change Logo'
                          : 'Upload Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {form.academy_logo && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, academy_logo: '' }))}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Leadership Fields First */}
              <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Leadership Names (Shown to Students &amp; Faculty)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enter your Principal and Vice Principal names for the institutional directory.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Principal Name
                    </label>
                    <input
                      id="school-profile-principal-input"
                      type="text"
                      value={form.principal_name || ''}
                      onChange={(e) => setForm({ ...form, principal_name: e.target.value })}
                      placeholder="e.g. Dr. Rajeshwar Sharma"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vice Principal Name
                    </label>
                    <input
                      id="school-profile-vice-principal-input"
                      type="text"
                      value={form.vice_principal_name || ''}
                      onChange={(e) => setForm({ ...form, vice_principal_name: e.target.value })}
                      placeholder="e.g. Prof. Meenakshi Verma"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Core Identity & Academic Details */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School / Tuition Name *
                  </label>
                  <input
                    id="school-profile-name-input"
                    type="text"
                    required
                    value={form.academy_name}
                    onChange={(e) => setForm({ ...form, academy_name: e.target.value })}
                    placeholder="e.g. St. Xavier High School"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Type
                  </label>
                  <select
                    value={form.institute_type || 'School'}
                    onChange={(e) => setForm({ ...form, institute_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {INSTITUTE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Board / Affiliation
                  </label>
                  <input
                    type="text"
                    value={form.board || ''}
                    onChange={(e) => setForm({ ...form, board: e.target.value })}
                    placeholder="e.g. CBSE / ICSE / State Board"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Affiliation / Registration No.
                  </label>
                  <input
                    type="text"
                    value={form.affiliation_number || ''}
                    onChange={(e) => setForm({ ...form, affiliation_number: e.target.value })}
                    placeholder="e.g. CBSE-2730194"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Established Year
                  </label>
                  <input
                    type="text"
                    value={form.established_year || ''}
                    onChange={(e) => setForm({ ...form, established_year: e.target.value })}
                    placeholder="e.g. 1998"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motto / Tagline
                  </label>
                  <input
                    type="text"
                    value={form.tagline || ''}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    placeholder="e.g. Knowledge, Character & Excellence"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus / Batch Timings
                  </label>
                  <input
                    type="text"
                    value={form.timings || ''}
                    onChange={(e) => setForm({ ...form, timings: e.target.value })}
                    placeholder="e.g. Mon – Sat, 8:00 AM – 2:30 PM (Evening Tuition: 4:00 PM – 7:00 PM)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Contact & Campus Location */}
              <div className="pt-4 border-t border-slate-100 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Phone
                  </label>
                  <input
                    type="tel"
                    value={form.contact_phone || ''}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={form.contact_email || ''}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="office@institution.edu"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={form.website || ''}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://yourschool.edu.in"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Street Address
                  </label>
                  <input
                    type="text"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Sector 12, Main Academic Road"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City &amp; State
                  </label>
                  <input
                    type="text"
                    value={form.city_state || ''}
                    onChange={(e) => setForm({ ...form, city_state: e.target.value })}
                    placeholder="New Delhi, Delhi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    About School / Tuition Center
                  </label>
                  <textarea
                    rows={3}
                    value={form.about || ''}
                    onChange={(e) => setForm({ ...form, about: e.target.value })}
                    placeholder="Write a brief overview of courses, streams, or campus facilities..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Dedicated Student Visibility Picker */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Student Visibility Selection (Pick 1–3 Extra Items)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Students always see <strong>School Name</strong>, <strong>School Logo</strong>,{' '}
                    <strong>Principal Name</strong>, and <strong>Vice Principal Name</strong>. Choose 1 or 2 additional items to display in the Student portal; everything else stays private to Faculty &amp; Admins.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {STUDENT_VISIBLE_OPTIONS.map((opt) => {
                    const checked = (form.student_visible_fields || []).includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-indigo-50/70 border-indigo-300 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudentField(opt.key)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{opt.label}</div>
                          <div className="text-[11px] text-slate-500">{opt.hint}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Student View</span>
                </button>
                <button
                  id="school-profile-save-btn"
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving Profile...' : 'Save School Profile'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT VIEW PREVIEW */}
      {activeTab === 'preview' && <StudentSchoolCard data={buildStudentPreview()} previewNotice />}
    </div>
  );
};
