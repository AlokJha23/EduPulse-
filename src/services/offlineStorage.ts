import {
  User,
  TeacherProfile,
  StudentProfile,
  ClassGroup,
  AttendanceRecord,
  StudyMaterial,
  Assignment,
  AssignmentSubmission,
  Test,
  TestResult,
  AcademicMarkEntry,
  Announcement,
  NotificationItem,
  Doubt,
  DoubtReply,
  DashboardStats,
} from '../types';

const STORAGE_KEY = 'edupulse_db_clean_v5';

export interface LocalDatabase {
  users: User[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  classes: ClassGroup[];
  materials: StudyMaterial[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  tests: Test[];
  test_results: TestResult[];
  marks: AcademicMarkEntry[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  doubts: Doubt[];
  bookmarks: { id: string; student_id: string; material_id: string }[];
  attendance: AttendanceRecord[];
}

export const DEFAULT_DB: LocalDatabase = {
  users: [],
  teachers: [],
  students: [],
  classes: [],
  materials: [],
  assignments: [],
  submissions: [],
  tests: [],
  test_results: [],
  marks: [],
  announcements: [],
  notifications: [],
  doubts: [],
  bookmarks: [],
  attendance: [],
};

// Clean legacy sample storage keys once
(function cleanupLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    const legacyKeys = [
      'edupulse_local_db',
      'edupulse_local_db_v2',
      'edupulse_db_v1',
      'edupulse_db_v2',
      'edupulse_db_v3',
      'edupulse_db_clean_v4',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
})();

function getStorageDB(): LocalDatabase {
  if (typeof window === 'undefined') return DEFAULT_DB;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
      return DEFAULT_DB;
    }
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
      students: Array.isArray(parsed.students) ? parsed.students : [],
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      tests: Array.isArray(parsed.tests) ? parsed.tests : [],
      test_results: Array.isArray(parsed.test_results) ? parsed.test_results : [],
      marks: Array.isArray(parsed.marks) ? parsed.marks : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      doubts: Array.isArray(parsed.doubts) ? parsed.doubts : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
    };
  } catch {
    return DEFAULT_DB;
  }
}

function saveStorageDB(db: LocalDatabase) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save local database:', e);
  }
}

function normStr(val?: string | null): string {
  return typeof val === 'string' ? val.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function normSec(val?: string | null): string {
  return normStr(val).replace(/^section\s+/i, '');
}

function isAllVal(val?: string | null): boolean {
  const n = normStr(val);
  return n === '' || n === 'all' || n === 'all classes' || n === 'all sections' || n === 'all_classes';
}

export const OfflineStorageEngine = {
  getDB(): LocalDatabase {
    return getStorageDB();
  },

  saveDB(db: LocalDatabase) {
    saveStorageDB(db);
  },

  // Auth Operations
  login(identifier: string, password?: string) {
    const db = getStorageDB();
    const idClean = identifier.trim().toLowerCase();

    // Check teacher
    const teacher = db.teachers.find(
      (t) =>
        t.teacher_id.toLowerCase() === idClean ||
        t.email.toLowerCase() === idClean
    );

    if (teacher) {
      const user = db.users.find((u) => u.id === teacher.user_id);
      if (user) {
        if (password && user.password_hash && user.password_hash !== password) {
          throw new Error('Incorrect password. Please try again.');
        }
        const { password_hash, ...safeUser } = user;
        const authData = {
          token: `token-tch-${Date.now()}`,
          user: safeUser,
          teacher,
          must_change_password: !!user.must_change_password,
          message: 'Teacher authenticated successfully',
        };
        localStorage.setItem('edupulse_token', authData.token);
        localStorage.setItem('edupulse_auth_state', JSON.stringify(authData));
        return authData;
      }
    }

    // Check student
    const student = db.students.find(
      (s) =>
        s.student_id.toLowerCase() === idClean ||
        s.email.toLowerCase() === idClean ||
        (s.phone && s.phone.toLowerCase() === idClean)
    );

    if (student) {
      const user = db.users.find((u) => u.id === student.user_id);
      if (user) {
        if (password && user.password_hash && user.password_hash !== password) {
          throw new Error('Incorrect password. Please try again.');
        }
        const { password_hash, ...safeUser } = user;
        const authData = {
          token: `token-stu-${Date.now()}`,
          user: safeUser,
          student,
          must_change_password: !!user.must_change_password,
          message: 'Student authenticated successfully',
        };
        localStorage.setItem('edupulse_token', authData.token);
        localStorage.setItem('edupulse_auth_state', JSON.stringify(authData));
        return authData;
      }
    }

    throw new Error('Account not found. Please verify your credentials or register a new teacher account.');
  },

  teacherSignup(payload: any) {
    const validCodes = ['TEACHER2026', 'FACULTY@ACADEMIQ', 'ACAD2026', 'ADMIN@FACULTY2026'];
    const cleanPasscode = (payload.faculty_passcode || '').trim().toUpperCase();
    if (!validCodes.includes(cleanPasscode) && !cleanPasscode.startsWith('ACAD-')) {
      throw new Error('Access Denied: Valid Faculty Security Passcode is required to register a Teacher account.');
    }

    const db = getStorageDB();
    const now = new Date().toISOString();
    const userId = `usr-tch-${Date.now()}`;
    const teacherId = `prof-tch-${Date.now()}`;

    if (db.teachers.some((t) => t.email.toLowerCase() === payload.email.toLowerCase() || t.teacher_id.toLowerCase() === payload.teacher_id.toLowerCase())) {
      throw new Error('A teacher account with this Email or Teacher ID already exists.');
    }

    const newUser: User = {
      id: userId,
      role: 'TEACHER',
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      password_hash: payload.password,
      profile_photo: '',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const schoolName = payload.institution || 'Academic Institute';
    const schoolCode = `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const schoolLogo = payload.academy_logo || payload.school_logo || payload.logo || '';
    const newTeacher: TeacherProfile = {
      id: teacherId,
      user_id: userId,
      teacher_id: payload.teacher_id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      subject: payload.subject || 'General Academics',
      institution: schoolName,
      academy_id: teacherId,
      academy_name: schoolName,
      academy_code: schoolCode,
      academy_logo: schoolLogo,
      school_profile: {
        academy_id: teacherId,
        academy_name: schoolName,
        academy_code: schoolCode,
        academy_logo: schoolLogo,
        institute_type: payload.institute_type || 'School',
        board: payload.board || '',
        principal_name: payload.principal_name || '',
        vice_principal_name: payload.vice_principal_name || '',
        tagline: payload.tagline || '',
        affiliation_number: payload.affiliation_number || '',
        established_year: payload.established_year || '',
        timings: payload.timings || '',
        contact_phone: payload.contact_phone || payload.phone || '',
        contact_email: payload.contact_email || payload.email || '',
        website: payload.website || '',
        address: payload.address || '',
        city_state: payload.city_state || '',
        about: payload.about || '',
        student_visible_fields: Array.isArray(payload.student_visible_fields)
          ? payload.student_visible_fields.slice(0, 3)
          : ['board', 'timings'],
        updated_at: now,
      },
      role_in_academy: 'HEAD_TEACHER',
      active_workspace_mode: 'academy',
      is_owner: true,
      classes_taught: payload.classes_taught || [],
      bio: payload.bio || 'Educator & Faculty Member',
      profile_photo: '',
    };

    db.users.push(newUser);
    db.teachers.push(newTeacher);
    saveStorageDB(db);

    const { password_hash, ...safeUser } = newUser;
    const authData = {
      token: `token-tch-${Date.now()}`,
      user: safeUser,
      teacher: newTeacher,
      must_change_password: false,
      message: 'Teacher account created successfully',
    };
    localStorage.setItem('edupulse_token', authData.token);
    localStorage.setItem('edupulse_auth_state', JSON.stringify(authData));
    return authData;
  },

  changePassword(payload: { current_password?: string; new_password: string }) {
    const me = this.getMe();
    if (!me?.user) throw new Error('Not authenticated');
    const db = getStorageDB();
    const user = db.users.find((u) => u.id === me.user.id);
    if (!user) throw new Error('User not found');

    if (payload.current_password && user.password_hash && user.password_hash !== payload.current_password) {
      throw new Error('Current password is incorrect');
    }

    user.password_hash = payload.new_password;
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();
    saveStorageDB(db);

    const storedAuth = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
    storedAuth.must_change_password = false;
    localStorage.setItem('edupulse_auth_state', JSON.stringify(storedAuth));

    return { success: true, message: 'Password updated successfully' };
  },

  getMe() {
    try {
      const stored = localStorage.getItem('edupulse_auth_state');
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return {
      user: null,
      teacher: null,
      student: null,
    };
  },

  // Classes
  getClasses(): ClassGroup[] {
    const db = getStorageDB();
    return db.classes;
  },

  createClass(payload: Partial<ClassGroup>): ClassGroup {
    const db = getStorageDB();
    const me = this.getMe();
    const teacherId = me?.teacher?.id || 'prof-tch-main';

    const newClass: ClassGroup = {
      id: `cls-${Date.now()}`,
      teacher_id: teacherId,
      name: payload.name || 'New Class',
      section: payload.section || 'A',
      subject: payload.subject || 'All Subjects',
      batch: payload.batch || 'Regular Batch',
      academic_year: payload.academic_year || '2026-2027',
      description: payload.description || '',
      student_count: 0,
    };

    db.classes.push(newClass);
    saveStorageDB(db);
    return newClass;
  },

  updateClass(id: string, payload: Partial<ClassGroup>): ClassGroup {
    const db = getStorageDB();
    const idx = db.classes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Class not found');

    db.classes[idx] = { ...db.classes[idx], ...payload };
    saveStorageDB(db);
    return db.classes[idx];
  },

  deleteClass(id: string) {
    const db = getStorageDB();
    db.classes = db.classes.filter((c) => c.id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Class deleted successfully' };
  },

  // Students
  getStudents(params?: { search?: string; class_name?: string; section?: string; status?: string }): StudentProfile[] {
    const db = getStorageDB();
    let list = db.students.map((s) => {
      const u = db.users.find((user) => user.id === s.user_id);
      return {
        ...s,
        phone: s.phone || u?.phone || '',
        profile_photo: s.profile_photo || u?.profile_photo || '',
      };
    });

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.student_id.toLowerCase().includes(q) ||
          s.roll_number.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (params?.class_name && !isAllVal(params.class_name)) {
      list = list.filter((s) => normStr(s.class_name) === normStr(params.class_name));
    }
    if (params?.section && !isAllVal(params.section)) {
      list = list.filter((s) => normSec(s.section) === normSec(params.section));
    }
    if (params?.status) {
      const isActive = params.status === 'active';
      list = list.filter((s) => s.is_active === isActive);
    }

    return list;
  },

  addStudent(payload: any) {
    const db = getStorageDB();
    const me = this.getMe();
    const now = new Date().toISOString();
    const userId = `usr-stu-${Date.now()}`;
    const studentProfId = `stu-${Date.now()}`;
    const studentIdCode = payload.student_id || `STU-2026-${String(db.students.length + 101).padStart(5, '0')}`;
    const tempPassword = payload.password || `Pass@${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: User = {
      id: userId,
      role: 'STUDENT',
      name: payload.name,
      email: payload.email || `${studentIdCode.toLowerCase()}@school.edu`,
      phone: payload.phone || '',
      password_hash: tempPassword,
      profile_photo: payload.profile_photo || '',
      must_change_password: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const newStudent: StudentProfile = {
      id: studentProfId,
      user_id: userId,
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      student_id: studentIdCode,
      roll_number: payload.roll_number || `${db.students.length + 1}`,
      name: payload.name,
      email: payload.email || `${studentIdCode.toLowerCase()}@school.edu`,
      phone: payload.phone || '',
      class_name: payload.class_name || 'Class 1',
      section: payload.section || 'A',
      parent_name: payload.parent_name || '',
      parent_phone: payload.parent_phone || '',
      dob: payload.dob || '',
      profile_photo: payload.profile_photo || '',
      academy_name: me?.teacher?.academy_name || me?.teacher?.institution || 'Academiq Campus',
      academy_code: me?.teacher?.academy_code || '',
      academy_logo: me?.teacher?.academy_logo || '',
      is_active: true,
      created_at: now,
    };

    db.users.push(newUser);
    db.students.push(newStudent);

    // Update class student count
    const cls = db.classes.find((c) => c.name === newStudent.class_name && c.section === newStudent.section);
    if (cls) {
      cls.student_count = (cls.student_count || 0) + 1;
    }

    saveStorageDB(db);

    return {
      student: newStudent,
      credentials: {
        student_id: studentIdCode,
        name: newStudent.name,
        temporary_password: tempPassword,
      },
      message: 'Student enrolled successfully',
    };
  },

  updateStudent(id: string, payload: any) {
    const db = getStorageDB();
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Student not found');

    db.students[idx] = { ...db.students[idx], ...payload };
    const user = db.users.find((u) => u.id === db.students[idx].user_id);
    if (user) {
      if (payload.name) user.name = payload.name;
      if (payload.email) user.email = payload.email;
      if (payload.phone) user.phone = payload.phone;
    }
    saveStorageDB(db);
    return { success: true, student: db.students[idx] };
  },

  resetStudentPassword(id: string) {
    const db = getStorageDB();
    const student = db.students.find((s) => s.id === id);
    if (!student) throw new Error('Student not found');

    const user = db.users.find((u) => u.id === student.user_id);
    const tempPassword = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;

    if (user) {
      user.password_hash = tempPassword;
      user.must_change_password = true;
    }
    saveStorageDB(db);

    return {
      student_id: student.student_id,
      student_name: student.name,
      temporary_password: tempPassword,
    };
  },

  toggleStudentStatus(id: string, is_active: boolean) {
    const db = getStorageDB();
    const student = db.students.find((s) => s.id === id);
    if (!student) throw new Error('Student not found');

    student.is_active = is_active;
    const user = db.users.find((u) => u.id === student.user_id);
    if (user) {
      user.is_active = is_active;
    }
    saveStorageDB(db);
    return { success: true, is_active };
  },

  deleteStudent(id: string) {
    const db = getStorageDB();
    const student = db.students.find((s) => s.id === id);
    if (student) {
      db.users = db.users.filter((u) => u.id !== student.user_id);
      db.students = db.students.filter((s) => s.id !== id);
      saveStorageDB(db);
    }
    return { success: true, message: 'Student removed successfully' };
  },

  getStudentDetail(id: string) {
    const db = getStorageDB();
    const rawStudent = db.students.find((s) => s.id === id);
    if (!rawStudent) throw new Error('Student profile not found');

    const user = db.users.find((u) => u.id === rawStudent.user_id);
    const student = {
      ...rawStudent,
      phone: rawStudent.phone || user?.phone || '',
      email: rawStudent.email || user?.email || '',
      profile_photo: rawStudent.profile_photo || user?.profile_photo || '',
    };

    const attendanceRecords = db.attendance.filter((a) => a.student_id === student.id);
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

    const studentMarks = db.marks.filter((m) => m.student_id === student.id);
    const testResults = db.test_results.filter((r) => r.student_id === student.id);
    const submissions = db.submissions.filter((s) => s.student_id === student.id);

    return {
      student,
      attendance: attendanceRecords,
      attendance_stats: {
        total_days: totalAttendance,
        present_days: presentCount,
        percentage: attendancePercentage,
      },
      attendancePercentage,
      marks: studentMarks,
      academicMarks: studentMarks,
      test_results: testResults,
      submissions,
    };
  },

  // Attendance
  getAttendance(date: string, className?: string, section?: string) {
    const db = getStorageDB();
    let activeStudents = db.students.filter((s) => s.is_active);
    if (className && !isAllVal(className)) {
      activeStudents = activeStudents.filter((s) => normStr(s.class_name) === normStr(className));
    }
    if (section && !isAllVal(section)) {
      activeStudents = activeStudents.filter((s) => normSec(s.section) === normSec(section));
    }

    const existingAttendance = db.attendance.filter((a) => a.date === date);

    const records = activeStudents.map((s) => {
      const existing = existingAttendance.find((a) => a.student_id === s.id);
      const user = db.users.find((u) => u.id === s.user_id);
      return {
        student_id: s.id,
        student_code: s.student_id,
        student_name: s.name,
        roll_number: s.roll_number,
        class_name: s.class_name,
        section: s.section,
        profile_photo: s.profile_photo || user?.profile_photo || '',
        date,
        status: existing ? existing.status : 'present',
        remarks: existing ? existing.remarks : '',
        attendance_id: existing ? existing.id : undefined,
      };
    });

    return { date, records };
  },

  saveAttendance(date: string, records: any[]) {
    const db = getStorageDB();
    const me = this.getMe();
    const teacherId = me?.teacher?.id || 'prof-tch-main';
    const now = new Date().toISOString();

    const studentIds = new Set(records.map((r) => r.student_id));
    db.attendance = db.attendance.filter((a) => !(a.date === date && studentIds.has(a.student_id)));

    records.forEach((r) => {
      const student = db.students.find((s) => s.id === r.student_id);
      db.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        student_id: r.student_id,
        student_name: student?.name || r.student_name || 'Student',
        roll_number: student?.roll_number || r.roll_number || '',
        teacher_id: teacherId,
        class_name: student?.class_name || r.class_name || 'Class 1',
        section: student?.section || r.section || 'A',
        date,
        status: r.status || 'present',
        remarks: r.remarks || r.notes || '',
        created_at: now,
      });
    });

    saveStorageDB(db);
    return { success: true, message: 'Attendance recorded successfully' };
  },

  getStudentAttendance() {
    const me = this.getMe();
    const db = getStorageDB();
    const studentId = me?.student?.id;
    const records = studentId ? db.attendance.filter((a) => a.student_id === studentId) : [];

    const total = records.length;
    const present = records.filter((a) => a.status === 'present').length;
    const absent = records.filter((a) => a.status === 'absent').length;
    const late = records.filter((a) => a.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      percentage,
      present_days: present,
      absent_days: absent,
      late_days: late,
      total_days: total,
      records,
    };
  },

  // Study Materials
  getMaterials(params?: { subject?: string; class_name?: string; chapter?: string; search?: string; bookmarked?: string; bookmarked_only?: string }): StudyMaterial[] {
    const db = getStorageDB();
    let list = [...db.materials];
    const me = this.getMe();

    if (me?.student) {
      list = list.filter(
        (m) =>
          m.visibility === 'all' ||
          isAllVal(m.class_name) ||
          normStr(m.class_name) === normStr(me.student.class_name)
      );
    }

    if (params?.subject && !isAllVal(params.subject) && normStr(params.subject) !== 'all subjects') {
      list = list.filter((m) => normStr(m.subject) === normStr(params.subject));
    }
    if (params?.class_name && !isAllVal(params.class_name)) {
      list = list.filter((m) => isAllVal(m.class_name) || normStr(m.class_name) === normStr(params.class_name));
    }
    if (params?.chapter) {
      list = list.filter((m) => normStr(m.chapter) === normStr(params.chapter));
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.chapter && m.chapter.toLowerCase().includes(q)) ||
          (m.topic && m.topic.toLowerCase().includes(q)) ||
          (m.subject && m.subject.toLowerCase().includes(q))
      );
    }

    if (me?.student?.id) {
      const bookmarkedIds = new Set(
        db.bookmarks.filter((b) => b.student_id === me.student.id).map((b) => b.material_id)
      );
      list = list.map((m) => ({
        ...m,
        is_bookmarked: bookmarkedIds.has(m.id),
      }));
      if (params?.bookmarked === 'true' || params?.bookmarked_only === 'true') {
        list = list.filter((m) => m.is_bookmarked);
      }
    }

    return list;
  },

  createMaterial(payload: any): StudyMaterial {
    const db = getStorageDB();
    const me = this.getMe();

    const newMaterial: StudyMaterial = {
      id: `mat-${Date.now()}`,
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      teacher_name: me?.teacher?.name || me?.user?.name || 'Faculty',
      title: payload.title || 'Untitled Material',
      subject: payload.subject || 'All Subjects',
      class_name: payload.class_name || 'All Classes',
      chapter: payload.chapter || 'General',
      topic: payload.topic || 'General',
      material_type: payload.material_type || 'notes',
      description: payload.description || '',
      content_text: payload.content_text || '',
      file_name: payload.file_name || undefined,
      file_url: payload.file_url || payload.external_url || undefined,
      file_size: payload.file_size || '1.5 MB',
      external_url: payload.external_url || payload.file_url || undefined,
      preview_images: Array.isArray(payload.preview_images) ? payload.preview_images : [],
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      allow_download: payload.allow_download !== false,
      bookmarks_count: 0,
      created_at: new Date().toISOString(),
    };

    db.materials.unshift(newMaterial);
    saveStorageDB(db);
    return newMaterial;
  },

  deleteMaterial(id: string) {
    const db = getStorageDB();
    db.materials = db.materials.filter((m) => m.id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Study material deleted' };
  },

  toggleBookmark(materialId: string) {
    const db = getStorageDB();
    const me = this.getMe();
    const studentId = me?.student?.id || 'stu-clean';

    const existingIdx = db.bookmarks.findIndex(
      (b) => b.student_id === studentId && b.material_id === materialId
    );

    let is_bookmarked = false;
    if (existingIdx >= 0) {
      db.bookmarks.splice(existingIdx, 1);
      is_bookmarked = false;
    } else {
      db.bookmarks.push({
        id: `bmk-${Date.now()}`,
        student_id: studentId,
        material_id: materialId,
      });
      is_bookmarked = true;
    }

    saveStorageDB(db);
    return { is_bookmarked };
  },

  // Assignments
  getAssignments(): Assignment[] {
    const db = getStorageDB();
    const me = this.getMe();
    if (me?.student?.id) {
      return db.assignments.map((a) => {
        const sub = db.submissions.find((s) => s.assignment_id === a.id && s.student_id === me.student.id) || null;
        return {
          ...a,
          submission: sub,
          my_submission: sub,
        } as any;
      });
    }
    return db.assignments;
  },

  createAssignment(payload: any): Assignment {
    const db = getStorageDB();
    const me = this.getMe();

    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      teacher_name: me?.teacher?.name || me?.user?.name || 'Faculty',
      title: payload.title || 'Untitled Assignment',
      subject: payload.subject || 'All Subjects',
      class_name: payload.class_name || 'Class 1',
      section: payload.section || 'A',
      description: payload.description || '',
      due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      max_marks: Number(payload.max_marks) || 100,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      created_at: new Date().toISOString(),
      submissions_count: 0,
    };

    db.assignments.unshift(newAssignment);
    saveStorageDB(db);
    return newAssignment;
  },

  deleteAssignment(id: string) {
    const db = getStorageDB();
    db.assignments = db.assignments.filter((a) => a.id !== id);
    db.submissions = db.submissions.filter((s) => s.assignment_id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Assignment deleted' };
  },

  getAssignmentSubmissions(id: string) {
    const db = getStorageDB();
    const assignment = db.assignments.find((a) => a.id === id);
    if (!assignment) throw new Error('Assignment not found');

    const submissions = db.submissions.filter((s) => s.assignment_id === id);
    return { assignment, submissions };
  },

  submitAssignment(id: string, payload: { content_text?: string; file_url?: string; file_name?: string }) {
    const db = getStorageDB();
    const me = this.getMe();
    const student = me?.student;

    const assignment = db.assignments.find((a) => a.id === id);
    if (!assignment) throw new Error('Assignment not found');

    const existingIdx = db.submissions.findIndex(
      (s) => s.assignment_id === id && s.student_id === student?.id
    );

    const submissionData: AssignmentSubmission = {
      id: existingIdx >= 0 ? db.submissions[existingIdx].id : `sub-${Date.now()}`,
      assignment_id: id,
      student_id: student?.id || 'stu-clean',
      student_name: student?.name || me?.user?.name || 'Student',
      student_roll: student?.roll_number || '01',
      teacher_id: assignment.teacher_id,
      content_text: payload.content_text || '',
      file_url: payload.file_url || '',
      file_name: payload.file_name || '',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.submissions[existingIdx] = submissionData;
    } else {
      db.submissions.push(submissionData);
      assignment.submissions_count = (assignment.submissions_count || 0) + 1;
    }

    saveStorageDB(db);
    return { success: true, submission: submissionData, message: 'Assignment submitted successfully' };
  },

  gradeSubmission(assignmentId: string, payload: { submission_id: string; marks: number; feedback: string }) {
    const db = getStorageDB();
    const submission = db.submissions.find((s) => s.id === payload.submission_id);
    if (!submission) throw new Error('Submission not found');

    submission.marks_obtained = Number(payload.marks);
    submission.marks = Number(payload.marks);
    submission.feedback = payload.feedback;
    submission.status = 'graded';
    submission.graded_at = new Date().toISOString();

    saveStorageDB(db);
    return { success: true, message: 'Submission graded successfully' };
  },

  // Tests
  getTests(): Test[] {
    const db = getStorageDB();
    return db.tests;
  },

  createTest(payload: any): Test {
    const db = getStorageDB();
    const me = this.getMe();

    const newTest: Test = {
      id: `tst-${Date.now()}`,
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      title: payload.title || 'Untitled CBT Test',
      subject: payload.subject || 'All Subjects',
      class_name: payload.class_name || 'Class 1',
      section: payload.section || 'A',
      instructions: payload.instructions || 'Standard Computer Based Test pattern.',
      duration_minutes: Number(payload.duration_minutes) || 60,
      total_marks: Number(payload.total_marks) || 100,
      max_marks: Number(payload.total_marks) || 100,
      is_published: payload.is_published !== false,
      questions: Array.isArray(payload.questions) ? payload.questions : [],
      created_at: new Date().toISOString(),
    };

    db.tests.unshift(newTest);
    saveStorageDB(db);
    return newTest;
  },

  deleteTest(id: string) {
    const db = getStorageDB();
    db.tests = db.tests.filter((t) => t.id !== id);
    db.test_results = db.test_results.filter((r) => r.test_id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Test deleted' };
  },

  getTestToTake(id: string) {
    const db = getStorageDB();
    const me = this.getMe();
    const test = db.tests.find((t) => t.id === id);
    if (!test) throw new Error('Test not found');

    const existingResult = me?.student?.id
      ? db.test_results.find((r) => r.test_id === id && r.student_id === me.student.id)
      : null;

    return {
      test,
      questions: test.questions || [],
      existing_result: existingResult || null,
    };
  },

  submitTest(id: string, answers: any) {
    const db = getStorageDB();
    const me = this.getMe();
    const student = me?.student;
    const test = db.tests.find((t) => t.id === id);
    if (!test) throw new Error('Test not found');

    const answerMap: Record<string, string> = {};
    if (Array.isArray(answers)) {
      answers.forEach((a: any) => {
        if (a.question_id) answerMap[a.question_id] = a.selected_option;
      });
    } else if (typeof answers === 'object' && answers !== null) {
      Object.assign(answerMap, answers);
    }

    let marks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    (test.questions || []).forEach((q: any) => {
      const studentAns = answerMap[q.id];
      const correctAns = q.correct_option;

      if (!studentAns) {
        unattemptedCount++;
      } else if (studentAns.toUpperCase() === (correctAns || '').toUpperCase()) {
        correctCount++;
        marks += Number(q.marks || q.positive_marks || 4);
      } else {
        incorrectCount++;
        marks -= Number(q.negative_marks || 1);
      }
    });

    const totalQuestions = test.questions?.length || 0;
    const maxMarks = Number(test.total_marks || test.max_marks) || totalQuestions * 4;
    const percentage = maxMarks > 0 ? Math.max(0, Math.round((marks / maxMarks) * 100)) : 0;
    const isPassed = percentage >= 40;

    const result: TestResult = {
      id: `res-${Date.now()}`,
      test_id: id,
      test_title: test.title,
      student_id: student?.id || 'stu-clean',
      student_name: student?.name || me?.user?.name || 'Student',
      student_roll: student?.roll_number || '01',
      teacher_id: test.teacher_id,
      total_marks: maxMarks,
      marks_obtained: Math.max(0, marks),
      score_obtained: Math.max(0, marks),
      max_marks: maxMarks,
      percentage,
      passed: isPassed,
      total_attempted: totalQuestions - unattemptedCount,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      unattempted_count: unattemptedCount,
      accuracy: totalQuestions - unattemptedCount > 0 ? Math.round((correctCount / (totalQuestions - unattemptedCount)) * 100) : 0,
      rank: 1,
      percentile: 95,
      completed_at: new Date().toISOString(),
      student_answers: answerMap,
    };

    db.test_results.push(result);
    saveStorageDB(db);

    return { result, message: 'Test submitted and scorecard generated successfully' };
  },

  getTestResults(id: string) {
    const db = getStorageDB();
    const test = db.tests.find((t) => t.id === id);
    if (!test) throw new Error('Test not found');

    const results = db.test_results.filter((r) => r.test_id === id);
    return { test, questions: test.questions || [], results };
  },

  // Marks
  getMarks(params?: { class_name?: string; subject?: string; student_id?: string }): AcademicMarkEntry[] {
    const db = getStorageDB();
    let list = [...db.marks];

    if (params?.class_name) {
      list = list.filter((m) => m.class_name === params.class_name);
    }
    if (params?.subject) {
      list = list.filter((m) => m.subject.toLowerCase() === params.subject?.toLowerCase());
    }
    if (params?.student_id) {
      list = list.filter((m) => m.student_id === params.student_id);
    }

    return list;
  },

  addMark(payload: any): AcademicMarkEntry {
    const db = getStorageDB();
    const me = this.getMe();
    const student = db.students.find((s) => s.id === payload.student_id);

    const maxMarks = Number(payload.max_marks) || 100;
    const marksObtained = Number(payload.marks_obtained || payload.obtained_marks) || 0;
    const percentage = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 100) : 0;

    let grade = 'A';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    else grade = 'F';

    const newMark: AcademicMarkEntry = {
      id: `mrk-${Date.now()}`,
      student_id: payload.student_id,
      student_name: student?.name || payload.student_name || 'Student',
      student_roll: student?.roll_number || payload.roll_number || '',
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      class_name: payload.class_name || student?.class_name || 'Class 1',
      subject: payload.subject || 'All Subjects',
      exam_name: payload.exam_name || 'Term Exam',
      max_marks: maxMarks,
      marks_obtained: marksObtained,
      obtained_marks: marksObtained,
      percentage,
      grade,
      remarks: payload.remarks || '',
      exam_date: payload.exam_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    db.marks.push(newMark);
    saveStorageDB(db);
    return newMark;
  },

  deleteMark(id: string) {
    const db = getStorageDB();
    db.marks = db.marks.filter((m) => m.id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Mark entry deleted' };
  },

  // Announcements
  getAnnouncements(): Announcement[] {
    const db = getStorageDB();
    return db.announcements;
  },

  createAnnouncement(payload: any): Announcement {
    const db = getStorageDB();
    const me = this.getMe();

    const newAnnouncement: Announcement = {
      id: `anc-${Date.now()}`,
      teacher_id: me?.teacher?.id || 'prof-tch-main',
      teacher_name: me?.teacher?.name || me?.user?.name || 'Faculty Notice Desk',
      title: payload.title || 'Announcement',
      message: payload.message || payload.content || '',
      priority: payload.priority || 'normal',
      target_type: payload.target_type || 'all',
      target_value: payload.target_value || undefined,
      video_url: payload.video_url || undefined,
      video_title: payload.video_title || undefined,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      created_at: new Date().toISOString(),
    };

    db.announcements.unshift(newAnnouncement);
    saveStorageDB(db);
    return newAnnouncement;
  },

  deleteAnnouncement(id: string) {
    const db = getStorageDB();
    db.announcements = db.announcements.filter((a) => a.id !== id);
    saveStorageDB(db);
    return { success: true, message: 'Announcement deleted' };
  },

  // Doubts Hub
  getDoubts(params?: { subject?: string; status?: string; student_id?: string }): Doubt[] {
    const db = getStorageDB();
    let list = [...db.doubts];

    if (params?.subject) {
      list = list.filter((d) => d.subject.toLowerCase() === params.subject?.toLowerCase());
    }
    if (params?.status) {
      list = list.filter((d) => d.status === params.status);
    }
    if (params?.student_id) {
      list = list.filter((d) => d.student_id === params.student_id);
    }

    return list;
  },

  createDoubt(payload: Partial<Doubt>): Doubt {
    const db = getStorageDB();
    const me = this.getMe();
    const student = me?.student;

    const newDoubt: Doubt = {
      id: `dbt-${Date.now()}`,
      student_id: student?.id || 'stu-clean',
      student_name: student?.name || me?.user?.name || 'Student',
      student_roll: student?.roll_number || '',
      student_class: student?.class_name || 'Class 1',
      student_section: student?.section || 'A',
      subject: payload.subject || 'All Subjects',
      chapter: payload.chapter || '',
      topic: payload.topic || '',
      title: payload.title || 'Doubt Question',
      description: payload.description || '',
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      status: 'open',
      upvotes: 0,
      upvoted_by: [],
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.doubts.unshift(newDoubt);
    saveStorageDB(db);
    return newDoubt;
  },

  replyDoubt(
    doubtId: string,
    payload: { content: string; attachments?: any[]; is_solution?: boolean },
    authorInfo?: { id: string; name: string; role: string; photo?: string }
  ): DoubtReply {
    const db = getStorageDB();
    const doubt = db.doubts.find((d) => d.id === doubtId);
    if (!doubt) throw new Error('Doubt not found');

    const me = this.getMe();
    const role = authorInfo?.role || me?.user?.role || 'TEACHER';
    const authorName = authorInfo?.name || me?.teacher?.name || me?.student?.name || me?.user?.name || 'Educator';
    const authorId = authorInfo?.id || me?.user?.id || 'usr-main';

    const newReply: DoubtReply = {
      id: `rpl-${Date.now()}`,
      doubt_id: doubtId,
      author_id: authorId,
      author_name: role === 'TEACHER' ? `${authorName} (Faculty)` : authorName,
      author_role: role as 'TEACHER' | 'STUDENT',
      author_photo: authorInfo?.photo || '',
      content: payload.content,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      is_solution: !!payload.is_solution,
      created_at: new Date().toISOString(),
    };

    if (!doubt.replies) doubt.replies = [];
    doubt.replies.push(newReply);
    if (payload.is_solution) {
      doubt.status = 'resolved';
    } else if (doubt.status === 'open') {
      doubt.status = 'in_progress';
    }
    doubt.updated_at = new Date().toISOString();

    saveStorageDB(db);
    return newReply;
  },

  toggleDoubtUpvote(doubtId: string, userId: string) {
    const db = getStorageDB();
    const doubt = db.doubts.find((d) => d.id === doubtId);
    if (!doubt) throw new Error('Doubt not found');

    if (!doubt.upvoted_by) doubt.upvoted_by = [];
    const idx = doubt.upvoted_by.indexOf(userId);
    let hasUpvoted = false;

    if (idx >= 0) {
      doubt.upvoted_by.splice(idx, 1);
      doubt.upvotes = Math.max(0, (doubt.upvotes || 1) - 1);
      hasUpvoted = false;
    } else {
      doubt.upvoted_by.push(userId);
      doubt.upvotes = (doubt.upvotes || 0) + 1;
      hasUpvoted = true;
    }

    saveStorageDB(db);
    return { upvotes: doubt.upvotes, hasUpvoted };
  },

  updateDoubtStatus(doubtId: string, status: 'open' | 'in_progress' | 'resolved'): Doubt {
    const db = getStorageDB();
    const doubt = db.doubts.find((d) => d.id === doubtId);
    if (!doubt) throw new Error('Doubt not found');

    doubt.status = status;
    doubt.updated_at = new Date().toISOString();
    saveStorageDB(db);
    return doubt;
  },

  // Notifications
  getNotifications(): NotificationItem[] {
    const db = getStorageDB();
    return db.notifications;
  },

  markNotificationRead(id: string) {
    const db = getStorageDB();
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) notif.is_read = true;
    saveStorageDB(db);
    return { success: true };
  },

  markAllNotificationsRead() {
    const db = getStorageDB();
    db.notifications.forEach((n) => (n.is_read = true));
    saveStorageDB(db);
    return { success: true };
  },

  // Universal Search (tenant & role isolated)
  search(query: string) {
    const db = getStorageDB();
    const q = query.trim().toLowerCase();
    if (!q) return { results: [] };

    const me = this.getMe();
    const isStudent = !!me?.student && me?.user?.role !== 'TEACHER';
    const studentClass = me?.student?.class_name;

    const results: Array<{ id: string; title: string; subtitle: string; type: string }> = [];

    // Only faculty/admin can search student roster
    if (!isStudent) {
      db.students.forEach((s) => {
        if (
          s.name.toLowerCase().includes(q) ||
          s.student_id.toLowerCase().includes(q) ||
          (s.roll_number && String(s.roll_number).toLowerCase().includes(q)) ||
          (s.class_name && s.class_name.toLowerCase().includes(q))
        ) {
          results.push({
            id: s.id,
            title: s.name,
            subtitle: `Student • ${s.student_id} (${s.class_name}-${s.section})`,
            type: 'student',
          });
        }
      });
    }

    db.materials.forEach((m) => {
      if (isStudent && !(m.visibility === 'all' || isAllVal(m.class_name) || normStr(m.class_name) === normStr(studentClass))) {
        return;
      }
      if (
        m.title.toLowerCase().includes(q) ||
        (m.chapter && m.chapter.toLowerCase().includes(q)) ||
        (m.topic && m.topic.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q))
      ) {
        results.push({
          id: m.id,
          title: m.title,
          subtitle: `Study Material • ${m.subject} (${m.chapter || 'General'})`,
          type: 'material',
        });
      }
    });

    db.tests.forEach((t) => {
      if (isStudent && !(isAllVal(t.class_name) || normStr(t.class_name) === normStr(studentClass))) {
        return;
      }
      if (t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: `CBT Test • ${t.subject} (${t.duration_minutes}m)`,
          type: 'test',
        });
      }
    });

    db.assignments.forEach((a) => {
      if (isStudent && !(isAllVal(a.class_name) || normStr(a.class_name) === normStr(studentClass))) {
        return;
      }
      if (a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q)) {
        results.push({
          id: a.id,
          title: a.title,
          subtitle: `Assignment • ${a.subject} (${a.class_name})`,
          type: 'assignment',
        });
      }
    });

    db.announcements.forEach((ann) => {
      if (
        ann.title.toLowerCase().includes(q) ||
        (ann.message && ann.message.toLowerCase().includes(q))
      ) {
        results.push({
          id: ann.id,
          title: ann.title,
          subtitle: `Announcement • ${ann.target_class || 'All'}`,
          type: 'announcement',
        });
      }
    });

    return { results };
  },

  // Reports
  getReportsSummary() {
    const db = getStorageDB();
    const totalStudents = db.students.length;
    const totalAttendance = db.attendance.length;
    const presentAttendance = db.attendance.filter((a) => a.status === 'present').length;
    const avgAttendance = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    const totalTests = db.tests.length;
    const totalMaterials = db.materials.length;
    const totalAssignments = db.assignments.length;

    return {
      total_students: totalStudents,
      avg_attendance: avgAttendance,
      total_tests: totalTests,
      total_materials: totalMaterials,
      total_assignments: totalAssignments,
    };
  },

  getTeacherDashboardStats(): DashboardStats {
    const db = getStorageDB();
    const totalStudents = db.students.length;
    const totalClasses = db.classes.length;
    const totalMaterials = db.materials.length;
    const totalTests = db.tests.length;

    const today = new Date().toISOString().split('T')[0];
    const todayAtt = db.attendance.filter((a) => a.date === today);
    const presentToday = todayAtt.filter((a) => a.status === 'present').length;
    const absentToday = todayAtt.filter((a) => a.status === 'absent').length;
    const lateToday = todayAtt.filter((a) => a.status === 'late').length;

    const pendingAssignments = db.assignments.length;
    const upcomingTests = db.tests.length;
    const recentSubmissions = db.submissions.length;

    const allMarks = db.marks;
    const avgPerf =
      allMarks.length > 0
        ? Math.round(allMarks.reduce((acc, m) => acc + (m.percentage || 0), 0) / allMarks.length)
        : 0;

    return {
      total_students: totalStudents,
      present_today: presentToday,
      absent_today: absentToday,
      late_today: lateToday,
      pending_assignments: pendingAssignments,
      upcoming_tests: upcomingTests,
      recent_submissions: recentSubmissions,
      average_class_performance: avgPerf,
      total_materials: totalMaterials,
      total_classes: totalClasses,
    };
  },

  updateTeacherProfile(payload: any) {
    const db = getStorageDB();
    const me = this.getMe();
    if (me?.teacher) {
      const idx = db.teachers.findIndex((t) => t.id === me.teacher.id);
      if (idx >= 0) {
        const nextSchoolName = payload.academy_name || payload.institution;
        const nextSchoolLogo = payload.academy_logo !== undefined ? payload.academy_logo : undefined;
        db.teachers[idx] = {
          ...db.teachers[idx],
          ...payload,
          ...(nextSchoolName ? { institution: nextSchoolName, academy_name: nextSchoolName } : {}),
          ...(nextSchoolLogo !== undefined ? { academy_logo: nextSchoolLogo } : {}),
        };
        if (nextSchoolName || nextSchoolLogo !== undefined) {
          db.students.forEach((s) => {
            if (nextSchoolName) s.academy_name = nextSchoolName;
            if (nextSchoolLogo !== undefined) s.academy_logo = nextSchoolLogo;
          });
        }
        if (me.user) {
          const uIdx = db.users.findIndex((u) => u.id === me.user.id);
          if (uIdx >= 0) {
            if (payload.name) db.users[uIdx].name = payload.name;
            if (payload.phone !== undefined) db.users[uIdx].phone = payload.phone;
            if (payload.profile_photo !== undefined) db.users[uIdx].profile_photo = payload.profile_photo;
          }
        }
        saveStorageDB(db);
        const stored = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
        stored.teacher = db.teachers[idx];
        localStorage.setItem('edupulse_auth_state', JSON.stringify(stored));
      }
    }
    return { success: true, message: 'Profile updated successfully' };
  },

  updateStudentProfile(payload: any) {
    const db = getStorageDB();
    const me = this.getMe();
    if (me?.student) {
      const idx = db.students.findIndex((s) => s.id === me.student.id);
      if (idx >= 0) {
        db.students[idx] = { ...db.students[idx], ...payload };
        if (me.user) {
          const uIdx = db.users.findIndex((u) => u.id === me.user.id);
          if (uIdx >= 0) {
            if (payload.phone !== undefined) db.users[uIdx].phone = payload.phone;
            if (payload.profile_photo !== undefined) db.users[uIdx].profile_photo = payload.profile_photo;
          }
        }
        saveStorageDB(db);
        const stored = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
        stored.student = db.students[idx];
        localStorage.setItem('edupulse_auth_state', JSON.stringify(stored));
      }
    }
    return { success: true, message: 'Profile updated successfully' };
  },

  getStaff() {
    const db = getStorageDB();
    const me = this.getMe();
    const teacher = me?.teacher || db.teachers[0];
    const academyName = teacher?.academy_name || teacher?.institution || 'Academiq Academy';
    const academyCode = teacher?.academy_code || 'ACAD-2026';
    const academyId = teacher?.academy_id || teacher?.id || 'academy-default';

    const facultyList = db.teachers.length > 0 ? db.teachers : teacher ? [teacher] : [];

    return {
      academy: {
        id: academyId,
        name: academyName,
        code: academyCode,
        logo: teacher?.academy_logo || '',
        academy_logo: teacher?.academy_logo || '',
        role: teacher?.role_in_academy || 'HEAD_TEACHER',
        active_workspace_mode: ((teacher?.active_workspace_mode as any) || 'academy') as 'personal' | 'academy',
        faculty_count: facultyList.length || 1,
        total_faculty: facultyList.length || 1,
        total_students: db.students.length || 0,
        total_classes: db.classes.length || 12,
        is_owner: teacher?.is_owner ?? true,
      },
      faculty: facultyList.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        teacher_id: t.teacher_id,
        name: t.name,
        email: t.email,
        phone: t.phone || '',
        subject: t.subject || 'General Academics',
        classes_taught: t.classes_taught || [],
        role_in_academy: t.role_in_academy || 'FACULTY',
        is_owner: t.is_owner ?? false,
        profile_photo: t.profile_photo || '',
        joined_at: (t as any).created_at || new Date().toISOString(),
        materials_count: db.materials.filter((m) => m.teacher_id === t.id).length,
        tests_count: db.tests.filter((test) => test.teacher_id === t.id).length,
        is_current_user: t.id === teacher?.id,
      })),
      invitations: [],
      memos: ((db as any).faculty_memos || []) as any[],
      available_workspaces: [
        {
          id: academyId,
          name: academyName,
          code: academyCode,
          mode: 'academy',
          label: `${academyName} (Shared Academy)`,
          role: teacher?.role_in_academy || 'HEAD_TEACHER',
          is_current: true,
          is_owner: true,
        },
      ],
    };
  },

  inviteStaff(payload: any) {
    return { success: true, message: `Invitation sent to ${payload.email}` };
  },

  joinAcademy(payload: any) {
    return { success: true, message: `Joined academy with code ${payload.academy_code}` };
  },

  switchWorkspace(mode: 'personal' | 'academy') {
    const db = getStorageDB();
    const me = this.getMe();
    if (me?.teacher) {
      const idx = db.teachers.findIndex((t) => t.id === me.teacher.id);
      if (idx >= 0) {
        db.teachers[idx].active_workspace_mode = mode;
        saveStorageDB(db);
        const stored = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
        stored.teacher = db.teachers[idx];
        localStorage.setItem('edupulse_auth_state', JSON.stringify(stored));
      }
    }
    return { success: true, mode };
  },

  leaveAcademy() {
    return { success: true, message: 'Left academy' };
  },

  updateAcademyName(name: string) {
    return this.updateAcademyBranding({ academy_name: name });
  },

  updateAcademyBranding(payload: { academy_name?: string; academy_logo?: string }) {
    const db = getStorageDB();
    const me = this.getMe();
    if (me?.teacher) {
      const idx = db.teachers.findIndex((t) => t.id === me.teacher.id);
      if (idx >= 0) {
        if (payload.academy_name && payload.academy_name.trim()) {
          db.teachers[idx].academy_name = payload.academy_name.trim();
          db.teachers[idx].institution = payload.academy_name.trim();
        }
        if (payload.academy_logo !== undefined) {
          db.teachers[idx].academy_logo = payload.academy_logo;
        }
        db.students.forEach((s) => {
          if (payload.academy_name && payload.academy_name.trim()) {
            s.academy_name = payload.academy_name.trim();
          }
          if (payload.academy_logo !== undefined) {
            s.academy_logo = payload.academy_logo;
          }
        });
        saveStorageDB(db);
        const stored = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
        stored.teacher = db.teachers[idx];
        localStorage.setItem('edupulse_auth_state', JSON.stringify(stored));
      }
    }
    return { success: true, message: 'Academy branding updated successfully' };
  },

  postStaffMemo(payload: any) {
    const db = getStorageDB();
    const me = this.getMe();
    if (!(db as any).faculty_memos) (db as any).faculty_memos = [];
    const newMemo = {
      id: `memo-${Date.now()}`,
      academy_id: me?.teacher?.academy_id || 'default',
      author_teacher_id: me?.teacher?.id || 't1',
      author_name: me?.teacher?.name || 'Educator',
      author_role: me?.teacher?.role_in_academy || 'FACULTY',
      title: payload.title,
      content: payload.content,
      priority: payload.priority || 'normal',
      created_at: new Date().toISOString(),
    };
    (db as any).faculty_memos.push(newMemo);
    saveStorageDB(db);
    return { success: true, memo: newMemo };
  },

  deleteStaffMemo(id: string) {
    const db = getStorageDB();
    if ((db as any).faculty_memos) {
      (db as any).faculty_memos = (db as any).faculty_memos.filter((m: any) => m.id !== id);
      saveStorageDB(db);
    }
    return { success: true };
  },

  getTeacherSchoolProfile() {
    const db = getStorageDB();
    const me = this.getMe();
    const teacher = me?.teacher;
    if (!teacher) throw new Error('Teacher profile not found.');

    const academyId = teacher.academy_id || teacher.id;
    const peers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
    const owner = peers.find((t) => t.id === academyId) || peers.find((t) => t.role_in_academy === 'HEAD_TEACHER') || teacher;
    const existing = owner.school_profile || teacher.school_profile;
    const isOwner = academyId === teacher.id || teacher.role_in_academy === 'HEAD_TEACHER';

    const school_profile = {
      academy_id: academyId,
      academy_name: owner.academy_name || owner.institution || teacher.academy_name || 'Academiq Campus',
      academy_code: owner.academy_code || teacher.academy_code || 'ACAD-0000',
      academy_logo: owner.academy_logo || teacher.academy_logo || '',
      institute_type: existing?.institute_type || 'School',
      board: existing?.board || '',
      principal_name: existing?.principal_name || '',
      vice_principal_name: existing?.vice_principal_name || '',
      tagline: existing?.tagline || '',
      affiliation_number: existing?.affiliation_number || '',
      established_year: existing?.established_year || '',
      timings: existing?.timings || '',
      contact_phone: existing?.contact_phone || owner.phone || '',
      contact_email: existing?.contact_email || owner.email || '',
      website: existing?.website || '',
      address: existing?.address || '',
      city_state: existing?.city_state || '',
      about: existing?.about || '',
      student_visible_fields: Array.isArray(existing?.student_visible_fields)
        ? existing.student_visible_fields
        : (['board', 'timings'] as any),
      updated_at: existing?.updated_at || new Date().toISOString(),
    };

    const allowedIds = new Set([academyId, ...peers.map((p) => p.id)]);
    return {
      school_profile,
      can_edit: isOwner,
      stats: {
        total_faculty: peers.length,
        total_students: db.students.filter((s) => allowedIds.has(s.teacher_id) && s.is_active).length,
        total_classes: db.classes.filter((c) => allowedIds.has(c.teacher_id)).length,
      },
    };
  },

  updateTeacherSchoolProfile(payload: any) {
    const db = getStorageDB();
    const me = this.getMe();
    const teacher = me?.teacher;
    if (!teacher) throw new Error('Teacher profile not found.');

    const academyId = teacher.academy_id || teacher.id;
    const isOwner = academyId === teacher.id || teacher.role_in_academy === 'HEAD_TEACHER';
    if (!isOwner) {
      throw new Error('Only the Principal / Admin (Head Educator) can update the School / Tuition Profile.');
    }

    const current = this.getTeacherSchoolProfile().school_profile;
    const nextName =
      payload.academy_name !== undefined && String(payload.academy_name).trim()
        ? String(payload.academy_name).trim()
        : current.academy_name;
    const nextLogo = payload.academy_logo !== undefined ? String(payload.academy_logo).trim() : current.academy_logo;

    const updatedProfile = {
      ...current,
      ...payload,
      academy_name: nextName,
      academy_logo: nextLogo,
      student_visible_fields: Array.isArray(payload.student_visible_fields)
        ? payload.student_visible_fields.slice(0, 3)
        : current.student_visible_fields,
      updated_at: new Date().toISOString(),
    };

    db.teachers.forEach((t) => {
      if ((t.academy_id || t.id) === academyId) {
        t.academy_name = nextName;
        t.institution = nextName;
        t.academy_logo = nextLogo;
        t.school_profile = updatedProfile;
      }
    });

    db.students.forEach((s) => {
      s.academy_name = nextName;
      s.academy_logo = nextLogo;
    });

    saveStorageDB(db);
    const stored = JSON.parse(localStorage.getItem('edupulse_auth_state') || '{}');
    const updatedMe = db.teachers.find((t) => t.id === teacher.id);
    if (updatedMe) {
      stored.teacher = updatedMe;
      localStorage.setItem('edupulse_auth_state', JSON.stringify(stored));
    }

    return {
      success: true,
      school_profile: updatedProfile,
      message: 'School / Tuition Profile updated and synced across faculty and student views.',
    };
  },

  getStudentSchoolProfile() {
    const db = getStorageDB();
    const me = this.getMe();
    const student = me?.student;
    if (!student) throw new Error('Student profile not found.');

    const directTeacher = db.teachers.find(
      (t) => t.id === student.teacher_id || t.academy_id === student.teacher_id
    );
    const academyId = directTeacher?.academy_id || directTeacher?.id || student.teacher_id;
    const peers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
    const owner = peers.find((t) => t.id === academyId) || peers.find((t) => t.role_in_academy === 'HEAD_TEACHER') || directTeacher;
    const sp = owner?.school_profile || peers.find((t) => !!t.school_profile)?.school_profile;

    const labels: Record<string, string> = {
      institute_type: 'Institution Type',
      board: 'Board / Affiliation',
      tagline: 'Motto / Tagline',
      timings: 'Campus / Batch Timings',
      contact_phone: 'Helpline Phone',
      contact_email: 'Official Email',
      address: 'Campus Address',
      website: 'Official Website',
      established_year: 'Established Year',
      about: 'About Institution',
    };

    const allowedKeys: string[] = Array.isArray(sp?.student_visible_fields)
      ? sp.student_visible_fields
      : ['board', 'timings'];

    const fullValues: Record<string, string> = {
      institute_type: sp?.institute_type || '',
      board: sp?.board || '',
      tagline: sp?.tagline || '',
      timings: sp?.timings || '',
      contact_phone: sp?.contact_phone || '',
      contact_email: sp?.contact_email || '',
      address: [sp?.address, sp?.city_state].filter(Boolean).join(', '),
      website: sp?.website || '',
      established_year: sp?.established_year || '',
      about: sp?.about || '',
    };

    const visible_extras = allowedKeys
      .filter((key) => Boolean(labels[key]) && Boolean(fullValues[key]))
      .map((key) => ({
        key: key as any,
        label: labels[key],
        value: fullValues[key],
      }));

    return {
      school_profile: {
        academy_name: owner?.academy_name || owner?.institution || student.academy_name || 'Academiq Campus',
        academy_logo: owner?.academy_logo || student.academy_logo || '',
        principal_name: sp?.principal_name || '',
        vice_principal_name: sp?.vice_principal_name || '',
        visible_extras,
      },
    };
  },
};
