import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import { generateStudentReportCardPDF } from '../../utils/pdfExport';
import { useAuth } from '../../context/AuthContext';
import { ALL_CLASSES, STANDARD_SECTIONS } from '../../constants/academic';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Copy,
  Check,
  Eye,
  Lock,
  Download,
  AlertCircle,
  X,
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  UserX,
  FileText,
  Award,
  Trash2,
} from 'lucide-react';

interface StudentManagementProps {
  initialDetailStudentId?: string;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ initialDetailStudentId }) => {
  const { teacher } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);
  const [resetCredentials, setResetCredentials] = useState<any | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add student form state
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    class_name: 'Class 10',
    section: 'A',
    batch_name: 'Morning Batch',
    parent_name: '',
    parent_phone: '',
    email: '',
    dob: '2009-04-15',
    address: '',
    emergency_contact: '',
    medical_notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter && (s.class_name || '').trim().toLowerCase() !== classFilter.trim().toLowerCase()) {
        return false;
      }
      if (sectionFilter) {
        const sSec = (s.section || '').replace(/^section\s+/i, '').trim().toLowerCase();
        const fSec = sectionFilter.replace(/^section\s+/i, '').trim().toLowerCase();
        if (sSec !== fSec) return false;
      }
      if (statusFilter === 'active' && !s.is_active) return false;
      if (statusFilter === 'inactive' && s.is_active) return false;
      if (q) {
        const hay = `${s.name || ''} ${s.student_id || ''} ${s.roll_number || ''} ${s.email || ''} ${s.phone || ''} ${s.parent_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [students, search, classFilter, sectionFilter, statusFilter]);

  useEffect(() => {
    if (initialDetailStudentId) {
      handleViewDetail(initialDetailStudentId);
    }
  }, [initialDetailStudentId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.teacher.addStudent(formData);
      setCreatedCredentials(res.credentials);
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        roll_number: '',
        class_name: 'Class 10',
        section: 'A',
        batch_name: 'Morning Batch',
        parent_name: '',
        parent_phone: '',
        email: '',
        dob: '2009-04-15',
        address: '',
        emergency_contact: '',
        medical_notes: '',
      });
      loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (student: StudentProfile) => {
    if (!window.confirm(`Generate a new temporary password for ${student.name}?`)) return;
    try {
      const res = await api.teacher.resetStudentPassword(student.id);
      setResetCredentials(res);
    } catch (err: any) {
      alert(err.message || 'Password reset failed');
    }
  };

  const handleToggleStatus = async (student: StudentProfile) => {
    try {
      await api.teacher.toggleStudentStatus(student.id, !student.is_active);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update student status');
    }
  };

  const handleViewDetail = async (studentId: string) => {
    try {
      const detail = await api.teacher.getStudentDetail(studentId);
      setSelectedStudentDetail(detail);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch student details');
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await api.teacher.deleteStudent(studentToDelete.id);
      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      if (selectedStudentDetail?.student?.id === studentToDelete.id) {
        setSelectedStudentDetail(null);
      }
      setStudentToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove student');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCredentials = (creds: any) => {
    const text = `🎓 *Academiq Student Portal Credentials*\n\nStudent: ${creds.student_name}\nStudent ID: ${creds.student_id}\nTemporary Password: ${creds.temporary_password}\nLogin at: ${window.location.origin}\n\n*Note:* Please change your password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Student Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Student Management & Roster</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teacher-controlled student accounts, generate login credentials, and view performance.
          </p>
        </div>

        <button
          id="open-add-student-modal-btn"
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            setFormError('');
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <input
            id="student-search-filter"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or roll..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <select
          id="student-class-filter"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Classes (1st to 12th)</option>
          {ALL_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          id="student-section-filter"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sections</option>
          {STANDARD_SECTIONS.map((sec) => (
            <option key={sec} value={sec}>
              Section {sec}
            </option>
          ))}
        </select>

        <select
          id="student-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student Profile</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Class & Batch</th>
                <th className="py-3 px-4">Parent Info</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading student roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      #{student.roll_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {student.profile_photo ? (
                          <img
                            src={student.profile_photo}
                            alt={student.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-1 ring-slate-200">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{student.name}</span>
                          <span className="text-[11px] text-slate-400">{student.email || 'No email'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {student.student_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 block">
                        {student.class_name} - Sec {student.section}
                      </span>
                      <span className="text-[11px] text-slate-400">{student.batch_name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 block">{student.parent_name || 'N/A'}</span>
                      <span className="text-[11px] text-slate-500">{student.parent_phone || ''}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          student.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(student.id)}
                          title="View Profile & Academic Detail"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetPassword(student)}
                          title="Reset Student Password"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(student)}
                          title={student.is_active ? 'Deactivate Student' : 'Activate Student'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            student.is_active
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {student.is_active ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentToDelete(student)}
                          title="Permanently Remove Student"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div
          id="add-student-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            id="add-student-modal"
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95"
          >
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Add Student to Roster</h3>
                <p className="text-indigo-200 text-xs mt-0.5">
                  The system will automatically generate a secure Student ID & temporary password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-indigo-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    id="add-student-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Marcus Vance"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    id="add-student-roll"
                    type="text"
                    required
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    placeholder="e.g. 104"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Name *
                  </label>
                  <select
                    id="add-student-class"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section *
                  </label>
                  <select
                    id="add-student-section"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    {STANDARD_SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Name
                  </label>
                  <input
                    id="add-student-batch"
                    type="text"
                    value={formData.batch_name}
                    onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                    placeholder="e.g. Morning Batch"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    id="add-student-parent-name"
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Phone Number
                  </label>
                  <input
                    id="add-student-parent-phone"
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Email Address
                  </label>
                  <input
                    id="add-student-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="marcus@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="add-student-dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-student-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Generating Account...' : 'Add Student & Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CREATED / RESET CREDENTIALS CARD MODAL */}
      {(createdCredentials || resetCredentials) && (
        <div
          id="credentials-card-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
        >
          <div
            id="credentials-card-modal"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">
                {createdCredentials ? 'Student Account Created!' : 'Temporary Password Reset!'}
              </h3>
              <p className="text-emerald-100 text-xs mt-1">
                Provide these credentials to the student or parent.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Student Name
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {createdCredentials?.student_name || resetCredentials?.student_name}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assigned Student ID
                  </span>
                  <span className="font-mono text-sm font-bold text-indigo-700">
                    {createdCredentials?.student_id || resetCredentials?.student_id}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Temporary Password
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    {createdCredentials?.temporary_password || resetCredentials?.temporary_password}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                ℹ️ The student will be prompted to replace this temporary password with their permanent password when signing in for the first time.
              </div>

              <div className="flex gap-2">
                <button
                  id="copy-student-credentials-btn"
                  type="button"
                  onClick={() => handleCopyCredentials(createdCredentials || resetCredentials)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedCredentials(null);
                    setResetCredentials(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STUDENT DETAIL & ACADEMIC TRANSCRIPT DRAWER */}
      {selectedStudentDetail && (() => {
        const detailStudent = selectedStudentDetail.student || {};
        const detailSubmissions = selectedStudentDetail.submissions || [];
        const detailMarks = selectedStudentDetail.academicMarks || selectedStudentDetail.marks || [];
        const detailAttendancePct = selectedStudentDetail.attendancePercentage ?? selectedStudentDetail.attendance_stats?.percentage ?? 0;
        const detailOverallAcademicPct = selectedStudentDetail.overallAcademicPercentage ?? 0;

        return (
          <div
            id="student-detail-drawer-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          >
            <div
              id="student-detail-drawer"
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            >
              {/* Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {detailStudent.profile_photo ? (
                    <img
                      src={detailStudent.profile_photo}
                      alt={detailStudent.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-400"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold ring-2 ring-indigo-400">
                      {detailStudent.name ? detailStudent.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold">{detailStudent.name || 'Student'}</h3>
                    <p className="text-xs text-slate-400">
                      ID: {detailStudent.student_id || 'N/A'} • Roll #{detailStudent.roll_number || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      generateStudentReportCardPDF({
                        studentName: detailStudent.name || 'Student',
                        studentId: detailStudent.student_id || 'N/A',
                        rollNumber: detailStudent.roll_number || 'N/A',
                        className: detailStudent.class_name || 'N/A',
                        section: detailStudent.section || 'A',
                        parentName: detailStudent.parent_name,
                        attendancePercentage: detailAttendancePct,
                        overallPercentage: detailOverallAcademicPct,
                        marks: detailMarks.map((m: any) => ({
                          subject: m.subject,
                          exam: m.exam_name,
                          obtained: m.marks_obtained ?? m.obtained_marks ?? 0,
                          max: m.max_marks || 100,
                          grade: m.grade || '—',
                        })),
                        teacherName: teacher?.name || 'Educator',
                        institution: teacher?.academy_name || teacher?.institution || 'Academic Institute',
                        institutionLogo: teacher?.academy_logo,
                      })
                    }
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report Card PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentToDelete(detailStudent)}
                    title="Remove Student"
                    className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentDetail(null)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* Top summary cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-indigo-600 font-bold uppercase block">Attendance</span>
                    <span className="text-lg font-black text-indigo-900">
                      {detailAttendancePct}%
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Aggregate Mark</span>
                    <span className="text-lg font-black text-emerald-900">
                      {detailOverallAcademicPct}%
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-amber-600 font-bold uppercase block">Submissions</span>
                    <span className="text-lg font-black text-amber-900">
                      {detailSubmissions.length} Tasks
                    </span>
                  </div>
                </div>

                {/* Complete Student Profile (Faculty & Admin Only) */}
                <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      {detailStudent.profile_photo ? (
                        <img
                          src={detailStudent.profile_photo}
                          alt={detailStudent.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-xs bg-white"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold ring-2 ring-indigo-300">
                          {detailStudent.name ? detailStudent.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{detailStudent.name || 'Student'}</h4>
                        <p className="text-[11px] text-slate-500">
                          ID: <span className="font-mono font-semibold text-indigo-700">{detailStudent.student_id || 'N/A'}</span> • Roll #{detailStudent.roll_number || 'N/A'}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            detailStudent.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {detailStudent.is_active ? 'Active Account' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase">
                      <Lock className="w-3 h-3" />
                      <span>Faculty-Only Complete Profile View</span>
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Phone Number</span>
                      <p className="font-semibold text-slate-800">{detailStudent.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Email</span>
                      <p className="font-semibold text-slate-800 break-all">{detailStudent.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Date of Birth</span>
                      <p className="font-semibold text-slate-800">{detailStudent.dob || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group</span>
                      <p className="font-semibold text-slate-800">{detailStudent.blood_group || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Emergency Contact</span>
                      <p className="font-semibold text-slate-800">{detailStudent.emergency_contact || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Class, Section & Batch</span>
                      <p className="font-semibold text-slate-800">
                        {detailStudent.class_name} - Sec {detailStudent.section} ({detailStudent.batch_name || detailStudent.batch || 'General'})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent / Guardian Name</span>
                      <p className="font-semibold text-slate-800">{detailStudent.parent_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent Phone</span>
                      <p className="font-semibold text-slate-800">{detailStudent.parent_phone || 'Not provided'}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Residential Address</span>
                      <p className="font-semibold text-slate-800">{detailStudent.address || 'Not provided'}</p>
                    </div>
                    {detailStudent.bio && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Bio / About</span>
                        <p className="text-slate-700 leading-relaxed">{detailStudent.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Marks Record */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Academic Exam Marks
                  </h4>
                  {detailMarks.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <tr>
                            <th className="py-2 px-3">Subject</th>
                            <th className="py-2 px-3">Exam</th>
                            <th className="py-2 px-3">Score</th>
                            <th className="py-2 px-3">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailMarks.map((m: any) => (
                            <tr key={m.id}>
                              <td className="py-2 px-3 font-semibold">{m.subject}</td>
                              <td className="py-2 px-3 text-slate-600">{m.exam_name}</td>
                              <td className="py-2 px-3 font-mono font-bold">
                                {m.marks_obtained ?? m.obtained_marks ?? 0} / {m.max_marks} ({m.percentage}%)
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {m.grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-400 py-2">No exam marks entered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* 4. PERMANENT DELETE STUDENT CONFIRMATION MODAL */}
      {studentToDelete && (
        <div
          id="delete-student-modal-backdrop"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div
            id="delete-student-modal"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Remove Student Account?</h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="p-1 rounded text-red-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl space-y-1">
                <p className="text-xs font-bold text-red-900">
                  {studentToDelete.name} (Roll #{studentToDelete.roll_number})
                </p>
                <p className="text-[11px] text-red-700">
                  Student ID: <span className="font-mono font-semibold">{studentToDelete.student_id}</span> • {studentToDelete.class_name} ({studentToDelete.section})
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete this student record? This will remove their portal login, attendance history, assignment submissions, and test scores.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-student-btn"
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
