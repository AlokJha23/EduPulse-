import { Router, Response } from 'express';
import { getDB, saveDB } from '../db';
import { authenticateToken, requireTeacher, AuthenticatedRequest, hashPassword } from '../auth';
import {
  TeacherProfile,
  StudentProfile,
  User,
  ClassGroup,
  AttendanceRecord,
  StudyMaterial,
  Assignment,
  Test,
  TestQuestion,
  AcademicMarkEntry,
  Announcement,
  NotificationItem,
  FacultyMemo,
  SchoolProfileDetails,
  StudentVisibleSchoolField,
} from '../../src/types';
import { sendAdminDataUpdate } from '../services/adminSyncService';

export const teacherRouter = Router();

// Apply auth & teacher role check to all teacher routes
teacherRouter.use(authenticateToken);
teacherRouter.use(requireTeacher);

// Query & normalization helpers
function cleanParam(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
}

function normalizeStr(val: unknown): string {
  return typeof val === 'string' ? val.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function normalizeSection(val: unknown): string {
  return normalizeStr(val).replace(/^section\s+/i, '');
}

function isAllClasses(val: unknown): boolean {
  const n = normalizeStr(val);
  return n === '' || n === 'all' || n === 'all classes' || n === 'all_classes';
}

function isAllSections(val: unknown): boolean {
  const n = normalizeSection(val);
  return n === '' || n === 'all' || n === 'all sections' || n === 'all_sections';
}

function isClassMatch(a: unknown, b: unknown): boolean {
  if (isAllClasses(a)) return true;
  return normalizeStr(a) === normalizeStr(b);
}

// Helper to get teacher profile and ensure academy metadata
function getTeacherProfile(req: AuthenticatedRequest, res?: Response): TeacherProfile | null {
  const db = getDB();
  let teacher = db.teachers.find((t) => t.user_id === req.user?.userId || t.id === req.user?.teacherId);
  
  // If not found, attempt recovery from user record
  if (!teacher && req.user?.userId) {
    const user = db.users.find((u) => u.id === req.user?.userId);
    if (user && (user.role === 'TEACHER' || user.role?.toUpperCase() === 'TEACHER')) {
      const teacherDocId = req.user.teacherId || `teacher-prof-${Date.now()}`;
      teacher = {
        id: teacherDocId,
        user_id: user.id,
        teacher_id: `TCH-${user.id.slice(-4).toUpperCase()}`,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        subject: 'General Academics',
        institution: 'Academiq Academy',
        academy_id: teacherDocId,
        academy_name: 'Academiq Academy',
        academy_code: `ACAD-${Math.floor(1000 + Math.random() * 9000)}`,
        role_in_academy: 'HEAD_TEACHER',
        active_workspace_mode: 'academy',
        is_owner: true,
        classes_taught: Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`),
        bio: 'Faculty member and educator.',
        profile_photo: user.profile_photo || '',
      };
      db.teachers.push(teacher);
      saveDB();
    }
  }

  if (!teacher) {
    if (res && !res.headersSent) {
      res.status(404).json({ error: 'Teacher profile not found for authenticated user.' });
    }
    return null;
  }

  let updated = false;
  if (!teacher.academy_id) {
    teacher.academy_id = teacher.id;
    updated = true;
  }
  if (!teacher.academy_name) {
    teacher.academy_name = teacher.institution || 'Academiq Academy';
    updated = true;
  }
  if (!teacher.academy_code) {
    const rawName = (teacher.academy_name || teacher.name || 'ACD').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const prefix = rawName.length >= 3 ? rawName : 'ACAD';
    const rand = Math.floor(1000 + Math.random() * 9000);
    teacher.academy_code = `${prefix}-${rand}`;
    updated = true;
  }
  if (!teacher.role_in_academy) {
    teacher.role_in_academy = teacher.academy_id === teacher.id ? 'HEAD_TEACHER' : 'CO_TEACHER';
    updated = true;
  }
  if (!teacher.active_workspace_mode) {
    teacher.active_workspace_mode = 'academy';
    updated = true;
  }
  if (updated) {
    saveDB();
  }
  return teacher;
}

// Workspace access helper: returns effective workspace ID, matching predicate, and allowed IDs
function getTeacherWorkspace(teacher: TeacherProfile) {
  const db = getDB();
  const isPersonal = teacher.active_workspace_mode === 'personal';
  const academyId = teacher.academy_id || teacher.id;
  const effectiveTeacherId = isPersonal ? teacher.id : academyId;
  const isOwner = academyId === teacher.id || teacher.role_in_academy === 'HEAD_TEACHER';

  // Find all teachers associated with this academy
  const academyTeachers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
  const academyOwner =
    academyTeachers.find((t) => t.id === academyId) ||
    academyTeachers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    teacher;

  const allowedTeacherIds = new Set<string>([
    teacher.id,
    effectiveTeacherId,
    ...(isPersonal ? [] : academyTeachers.map((t) => t.id)),
  ]);

  const matchesWorkspace = (itemTeacherId: string | undefined | null) => {
    if (!itemTeacherId) return false;
    if (isPersonal) {
      return itemTeacherId === teacher.id;
    }
    return allowedTeacherIds.has(itemTeacherId);
  };

  const academyName =
    academyOwner.academy_name ||
    academyOwner.institution ||
    teacher.academy_name ||
    teacher.institution ||
    'Academiq Academy';
  const academyCode = academyOwner.academy_code || teacher.academy_code || 'ACAD-0000';
  const academyLogo =
    academyOwner.academy_logo ||
    academyTeachers.find((t) => !!t.academy_logo)?.academy_logo ||
    teacher.academy_logo ||
    '';

  return {
    effectiveTeacherId,
    allowedTeacherIds,
    isOwner,
    isPersonal,
    academyId,
    academyCode,
    academyName,
    academyLogo,
    matchesWorkspace,
  };
}

// 1. Dashboard Stats
teacherRouter.get('/dashboard-stats', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);

  if (!teacher) {
    res.status(404).json({ error: 'Teacher profile not found.' });
    return;
  }

  const ws = getTeacherWorkspace(teacher);
  const today = new Date().toISOString().split('T')[0];
  const teacherStudents = db.students.filter((s) => ws.matchesWorkspace(s.teacher_id) && s.is_active);

  // Today's attendance
  const todayAttendance = db.attendance.filter(
    (a) => ws.matchesWorkspace(a.teacher_id) && a.date === today
  );
  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;
  const lateToday = todayAttendance.filter((a) => a.status === 'late').length;

  // Assignments & Submissions
  const assignments = db.assignments.filter((a) => ws.matchesWorkspace(a.teacher_id));
  const submissions = db.assignment_submissions.filter((s) => ws.matchesWorkspace(s.teacher_id));
  const pendingAssignments = submissions.filter((s) => s.status === 'submitted').length;

  // Upcoming Tests
  const upcomingTests = db.tests.filter(
    (t) => ws.matchesWorkspace(t.teacher_id) && t.is_published
  ).length;

  // Average Class Performance from marks
  const teacherMarks = db.marks.filter((m) => ws.matchesWorkspace(m.teacher_id));
  const avgPerformance =
    teacherMarks.length > 0
      ? Math.round(
          teacherMarks.reduce((acc, curr) => acc + curr.percentage, 0) / teacherMarks.length
        )
      : 86;

  const totalMaterials = db.materials.filter((m) => ws.matchesWorkspace(m.teacher_id)).length;
  const totalClasses = db.classes.filter((c) => ws.matchesWorkspace(c.teacher_id)).length;
  const totalFaculty = db.teachers.filter((t) => t.academy_id === ws.academyId).length;

  res.json({
    total_students: teacherStudents.length,
    present_today: presentToday,
    absent_today: absentToday,
    late_today: lateToday,
    pending_assignments: pendingAssignments,
    upcoming_tests: upcomingTests,
    recent_submissions: submissions.slice(-5).reverse(),
    average_class_performance: avgPerformance,
    total_materials: totalMaterials,
    total_classes: totalClasses,
    total_faculty: totalFaculty,
    academy_name: ws.academyName,
    academy_code: ws.academyCode,
    academy_logo: ws.academyLogo,
    is_owner: ws.isOwner,
    role_in_academy: teacher.role_in_academy,
    active_workspace_mode: teacher.active_workspace_mode,
  });
});

// 2. Class / Batch Management
teacherRouter.get('/classes', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const classes = db.classes.filter((c) => ws.matchesWorkspace(c.teacher_id));
  // Calculate dynamic student count
  const enriched = classes.map((cls) => {
    const count = db.students.filter(
      (s) =>
        ws.matchesWorkspace(s.teacher_id) &&
        normalizeStr(s.class_name) === normalizeStr(cls.name) &&
        normalizeSection(s.section) === normalizeSection(cls.section) &&
        s.is_active
    ).length;
    return { ...cls, student_count: count };
  });

  res.json(enriched);
});

teacherRouter.post('/classes', (req: AuthenticatedRequest, res: Response) => {
  const { name, section, subject, batch, academic_year, description } = req.body;
  if (!name || !section || !subject) {
    res.status(400).json({ error: 'Class name, section, and subject are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const newClass: ClassGroup = {
    id: `cls-${Date.now()}`,
    teacher_id: ws.effectiveTeacherId,
    name: name.trim(),
    section: section.trim(),
    subject: subject.trim(),
    batch: batch ? batch.trim() : undefined,
    academic_year: academic_year || '2026-2027',
    description: description || '',
    student_count: 0,
  };

  db.classes.push(newClass);
  saveDB();

  res.status(201).json(newClass);
});

teacherRouter.put('/classes/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, section, subject, batch, academic_year, description } = req.body;

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const cls = db.classes.find((c) => c.id === id && ws.matchesWorkspace(c.teacher_id));
  if (!cls) {
    res.status(404).json({ error: 'Class not found.' });
    return;
  }

  if (name) cls.name = name.trim();
  if (section) cls.section = section.trim();
  if (subject) cls.subject = subject.trim();
  if (batch !== undefined) cls.batch = batch ? batch.trim() : undefined;
  if (academic_year) cls.academic_year = academic_year;
  if (description !== undefined) cls.description = description;

  saveDB();
  res.json(cls);
});

teacherRouter.delete('/classes/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const index = db.classes.findIndex((c) => c.id === id && ws.matchesWorkspace(c.teacher_id));
  if (index === -1) {
    res.status(404).json({ error: 'Class not found.' });
    return;
  }

  db.classes.splice(index, 1);
  saveDB();
  res.json({ success: true, message: 'Class deleted.' });
});

// 3. Student Management (Add Student with Auto-generated ID and Temporary Password)
teacherRouter.get('/students', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const search = cleanParam(req.query.search);
  const className = cleanParam(req.query.class_name);
  const section = cleanParam(req.query.section);
  const status = cleanParam(req.query.status);

  let list = db.students
    .filter((s) => ws.matchesWorkspace(s.teacher_id))
    .map((s) => {
      const u = db.users.find((user) => user.id === s.user_id);
      return {
        ...s,
        phone: s.phone || u?.phone || '',
        profile_photo: s.profile_photo || u?.profile_photo || '',
      };
    });

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.parent_phone && s.parent_phone.toLowerCase().includes(q))
    );
  }

  if (className && !isAllClasses(className)) {
    list = list.filter((s) => normalizeStr(s.class_name) === normalizeStr(className));
  }

  if (section && !isAllSections(section)) {
    const targetSec = normalizeSection(section);
    list = list.filter((s) => normalizeSection(s.section) === targetSec);
  }

  if (status) {
    if (status === 'active') list = list.filter((s) => s.is_active);
    if (status === 'inactive') list = list.filter((s) => !s.is_active);
  }

  res.json(list);
});

// Add Student Handler
teacherRouter.post('/students', (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    roll_number,
    class_name,
    section,
    batch,
    batch_name,
    email,
    phone,
    parent_name,
    parent_phone,
    dob,
    address,
    profile_photo,
    emergency_contact,
    blood_group,
    bio,
  } = req.body;

  if (!name || !roll_number || !class_name || !section || !parent_name || !parent_phone) {
    res.status(400).json({
      error: 'Student name, roll number, class, section, parent name, and parent phone are required.',
    });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  // Generate unique Student ID: e.g. STU-2026-00105
  const year = new Date().getFullYear();
  const nextNumber = db.students.length + 101;
  const autoStudentId = `STU-${year}-${String(nextNumber).padStart(5, '0')}`;

  // Generate temporary 6-character alphanumeric password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tempPassword = '';
  for (let i = 0; i < 6; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const studentEmail =
    email && email.trim() !== ''
      ? email.trim().toLowerCase()
      : `${autoStudentId.toLowerCase()}@student.academiq.edu`;

  // Check duplicate email
  const existingUser = db.users.find((u) => u.email.toLowerCase() === studentEmail.toLowerCase());
  if (existingUser) {
    res.status(400).json({ error: `A user with email ${studentEmail} already exists.` });
    return;
  }

  const userId = `user-stu-${Date.now()}`;
  const studentDocId = `stu-prof-${Date.now()}`;
  const now = new Date().toISOString();
  const resolvedBatch = (batch_name || batch || '').trim() || undefined;
  const cleanSec = String(section).trim().replace(/^Section\s+/i, '');

  const newUser: User = {
    id: userId,
    role: 'STUDENT',
    name: name.trim(),
    email: studentEmail,
    phone: phone ? String(phone).trim() : '',
    password_hash: hashPassword(tempPassword),
    profile_photo: profile_photo ? profile_photo.trim() : '',
    must_change_password: true, // Forces change on first login as per spec
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const newStudent: StudentProfile = {
    id: studentDocId,
    user_id: userId,
    teacher_id: ws.effectiveTeacherId,
    student_id: autoStudentId,
    roll_number: roll_number.trim(),
    name: name.trim(),
    email: studentEmail,
    phone: phone ? String(phone).trim() : '',
    class_name: class_name.trim(),
    section: cleanSec,
    batch: resolvedBatch,
    batch_name: resolvedBatch,
    parent_name: parent_name.trim(),
    parent_phone: parent_phone.trim(),
    dob: dob || undefined,
    address: address || undefined,
    emergency_contact: emergency_contact || undefined,
    blood_group: blood_group || undefined,
    bio: bio || undefined,
    profile_photo: newUser.profile_photo,
    academy_name: ws.academyName,
    academy_code: ws.academyCode,
    academy_logo: ws.academyLogo,
    is_active: true,
    created_at: now,
  };

  db.users.push(newUser);
  db.students.push(newStudent);
  saveDB();

  // Background Admin notification
  sendAdminDataUpdate('STUDENT_ENROLLED', `New Student: ${newStudent.name} (${newStudent.class_name} - ${newStudent.section})`, {
    student_id: newStudent.student_id,
    roll_number: newStudent.roll_number,
    name: newStudent.name,
    class_name: newStudent.class_name,
    section: newStudent.section,
    parent_name: newStudent.parent_name,
    parent_phone: newStudent.parent_phone,
    email: newStudent.email,
  }).catch(() => {});

  // Return credentials for teacher to copy and share with student
  res.status(201).json({
    student: newStudent,
    credentials: {
      student_id: autoStudentId,
      temporary_password: tempPassword,
      name: newStudent.name,
      roll_number: newStudent.roll_number,
      class_name: newStudent.class_name,
      section: newStudent.section,
      email: studentEmail,
    },
    message: 'Student account provisioned successfully.',
  });
});

// Edit Student
teacherRouter.put('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    roll_number,
    class_name,
    section,
    batch,
    batch_name,
    email,
    phone,
    parent_name,
    parent_phone,
    dob,
    address,
    emergency_contact,
    blood_group,
    bio,
    profile_photo,
  } = req.body;

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const student = db.students.find((s) => s.id === id && ws.matchesWorkspace(s.teacher_id));
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);

  if (name) {
    student.name = name.trim();
    if (user) user.name = name.trim();
  }
  if (roll_number) student.roll_number = roll_number.trim();
  if (class_name) student.class_name = class_name.trim();
  if (section) student.section = String(section).trim().replace(/^Section\s+/i, '');
  if (batch !== undefined || batch_name !== undefined) {
    const resolvedBatch = (batch_name ?? batch ?? '').trim() || undefined;
    student.batch = resolvedBatch;
    student.batch_name = resolvedBatch;
  }
  if (email && email !== student.email) {
    student.email = email.trim().toLowerCase();
    if (user) user.email = student.email;
  }
  if (phone !== undefined) {
    student.phone = String(phone).trim();
    if (user) user.phone = student.phone;
  }
  if (parent_name) student.parent_name = parent_name.trim();
  if (parent_phone) student.parent_phone = parent_phone.trim();
  if (dob !== undefined) student.dob = dob;
  if (address !== undefined) student.address = address;
  if (emergency_contact !== undefined) student.emergency_contact = emergency_contact;
  if (blood_group !== undefined) student.blood_group = blood_group;
  if (bio !== undefined) student.bio = bio;
  if (profile_photo !== undefined) {
    student.profile_photo = String(profile_photo).trim();
    if (user) user.profile_photo = student.profile_photo;
  }

  saveDB();
  res.json({ student, message: 'Student profile updated.' });
});

// Reset Student Password (Generates new temp password)
teacherRouter.post('/students/:id/reset-password', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const student = db.students.find((s) => s.id === id && ws.matchesWorkspace(s.teacher_id));
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);
  if (!user) {
    res.status(404).json({ error: 'User record not found.' });
    return;
  }

  // Generate new 6-char temp password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tempPassword = '';
  for (let i = 0; i < 6; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  user.password_hash = hashPassword(tempPassword);
  user.must_change_password = true;
  user.updated_at = new Date().toISOString();
  saveDB();

  res.json({
    success: true,
    student_id: student.student_id,
    student_name: student.name,
    temporary_password: tempPassword,
    message: 'Temporary password reset successfully.',
  });
});

// Toggle Student Active / Deactivate (Soft delete preserving historical records)
teacherRouter.patch('/students/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const student = db.students.find((s) => s.id === id && ws.matchesWorkspace(s.teacher_id));
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);
  student.is_active = !!is_active;
  if (user) {
    user.is_active = !!is_active;
  }

  saveDB();
  res.json({
    success: true,
    is_active: student.is_active,
    message: `Student account ${student.is_active ? 'activated' : 'deactivated'}.`,
  });
});

// Delete / Remove Student Completely
teacherRouter.delete('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const studentIndex = db.students.findIndex((s) => s.id === id && ws.matchesWorkspace(s.teacher_id));
  if (studentIndex === -1) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const student = db.students[studentIndex];
  const userId = student.user_id;
  const studentDbId = student.id;

  // Remove student and corresponding user account
  db.students.splice(studentIndex, 1);
  if (userId) {
    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      db.users.splice(userIndex, 1);
    }
  }

  // Cascade delete or clean student-specific records
  db.attendance = db.attendance.filter((a) => a.student_id !== studentDbId);
  db.assignment_submissions = db.assignment_submissions.filter((sub) => sub.student_id !== studentDbId);
  db.test_results = db.test_results.filter((tr) => tr.student_id !== studentDbId);
  db.marks = db.marks.filter((m) => m.student_id !== studentDbId);
  db.bookmarks = db.bookmarks.filter((b) => b.student_id !== studentDbId);
  db.notifications = db.notifications.filter((n) => n.user_id !== userId);

  saveDB();

  sendAdminDataUpdate('STUDENT_REMOVED', `Deleted Student: ${student.name} (#${student.roll_number}) from ${student.class_name}`, {
    student_id: student.student_id,
    roll_number: student.roll_number,
    name: student.name,
    class_name: student.class_name,
    section: student.section,
    deleted_at: new Date().toISOString(),
  }).catch(() => {});

  res.json({
    success: true,
    message: `Student ${student.name} (#${student.roll_number}) has been permanently removed.`,
  });
});

// Get Student Complete Academic Profile (Faculty / Admin Only)
teacherRouter.get('/students/:id/detail', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const student = db.students.find((s) => s.id === id && ws.matchesWorkspace(s.teacher_id));
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);
  const enrichedStudent = {
    ...student,
    phone: student.phone || user?.phone || '',
    email: student.email || user?.email || '',
    profile_photo: student.profile_photo || user?.profile_photo || '',
    academy_name: student.academy_name || ws.academyName,
    academy_code: student.academy_code || ws.academyCode,
    academy_logo: student.academy_logo || ws.academyLogo,
  };

  const attendance = db.attendance.filter((a) => a.student_id === student.id);
  const submissions = db.assignment_submissions.filter((s) => s.student_id === student.id);
  const testResults = db.test_results.filter((r) => r.student_id === student.id);
  const marks = db.marks.filter((m) => m.student_id === student.id);

  // Attendance stats
  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => a.status === 'present').length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalMarksObtained = marks.reduce((acc, m) => acc + (m.marks_obtained ?? m.obtained_marks ?? 0), 0);
  const totalMaxMarks = marks.reduce((acc, m) => acc + (m.max_marks || 0), 0);
  const overallAcademicPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

  res.json({
    student: enrichedStudent,
    attendance: attendance || [],
    attendance_stats: {
      total_days: totalDays,
      present_days: presentDays,
      percentage: attendancePercentage,
    },
    attendancePercentage,
    overallAcademicPercentage,
    submissions: submissions || [],
    test_results: testResults || [],
    testResults: testResults || [],
    marks: marks || [],
    academicMarks: marks || [],
  });
});

// 4. Attendance System
teacherRouter.get('/attendance', (req: AuthenticatedRequest, res: Response) => {
  const dateParam = cleanParam(req.query.date);
  const classNameParam = cleanParam(req.query.class_name);
  const sectionParam = cleanParam(req.query.section);

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const targetDate = dateParam || new Date().toISOString().split('T')[0];

  // Students belonging to this academy workspace (supports 'All Classes' / 'All Sections')
  let students = db.students.filter((s) => ws.matchesWorkspace(s.teacher_id) && s.is_active);
  if (classNameParam && !isAllClasses(classNameParam)) {
    const targetClass = normalizeStr(classNameParam);
    students = students.filter((s) => normalizeStr(s.class_name) === targetClass);
  }
  if (sectionParam && !isAllSections(sectionParam)) {
    const targetSec = normalizeSection(sectionParam);
    students = students.filter((s) => normalizeSection(s.section) === targetSec);
  }

  const existingAttendance = db.attendance.filter(
    (a) => ws.matchesWorkspace(a.teacher_id) && a.date === targetDate
  );

  // Combine with student list for easy UI grid marking
  const records = students.map((s) => {
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
      date: targetDate,
      status: existing ? existing.status : 'present', // Default to present for quick roll call
      remarks: existing ? existing.remarks : '',
      attendance_id: existing ? existing.id : undefined,
    };
  });

  res.json({
    date: targetDate,
    records,
  });
});

// Bulk Save Daily Attendance
teacherRouter.post('/attendance', (req: AuthenticatedRequest, res: Response) => {
  const { date, records } = req.body;
  // records: [{ student_id, status: 'present'|'absent'|'late'|'leave', remarks? }]

  if (!date || !Array.isArray(records)) {
    res.status(400).json({ error: 'Date and records array are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const now = new Date().toISOString();

  records.forEach((rec) => {
    const student = db.students.find((s) => s.id === rec.student_id && ws.matchesWorkspace(s.teacher_id));
    if (!student) return;

    const existingIndex = db.attendance.findIndex(
      (a) => a.student_id === rec.student_id && a.date === date
    );

    if (existingIndex >= 0) {
      db.attendance[existingIndex].status = rec.status;
      db.attendance[existingIndex].remarks = rec.remarks || '';
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        student_id: student.id,
        student_name: student.name,
        roll_number: student.roll_number,
        teacher_id: ws.effectiveTeacherId,
        class_name: student.class_name,
        section: student.section,
        date,
        status: rec.status,
        remarks: rec.remarks || '',
        created_at: now,
      };
      db.attendance.push(newRec);
    }
  });

  saveDB();

  sendAdminDataUpdate('ATTENDANCE_RECORDED', `Daily Attendance marked for Date: ${date} (${records.length} students)`, {
    date,
    total_marked: records.length,
    present_count: records.filter((r) => r.status === 'present').length,
    absent_count: records.filter((r) => r.status === 'absent').length,
    late_count: records.filter((r) => r.status === 'late').length,
    leave_count: records.filter((r) => r.status === 'leave').length,
  }).catch(() => {});

  res.json({ success: true, message: `Attendance for ${date} successfully recorded.` });
});

// 5. Notes & Study Materials Management
teacherRouter.get('/materials', (req: AuthenticatedRequest, res: Response) => {
  const search = cleanParam(req.query.search);
  const className = cleanParam(req.query.class_name);
  const subject = cleanParam(req.query.subject);
  const materialType = cleanParam(req.query.material_type);

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  let materials = db.materials.filter((m) => ws.matchesWorkspace(m.teacher_id));

  if (search) {
    const q = search.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.chapter && m.chapter.toLowerCase().includes(q)) ||
        (m.topic && m.topic.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }

  if (className && !isAllClasses(className)) {
    const targetCls = normalizeStr(className);
    materials = materials.filter(
      (m) => isAllClasses(m.class_name) || normalizeStr(m.class_name) === targetCls
    );
  }

  if (subject && normalizeStr(subject) !== 'all' && normalizeStr(subject) !== 'all subjects') {
    const targetSub = normalizeStr(subject);
    materials = materials.filter((m) => normalizeStr(m.subject) === targetSub);
  }

  if (materialType) {
    materials = materials.filter((m) => m.material_type === materialType);
  }

  res.json(materials.reverse());
});

teacherRouter.post('/materials', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    subject,
    class_name,
    chapter,
    topic,
    material_type,
    file_url,
    file_name,
    file_size,
    external_url,
    preview_images,
    attachments,
    content_text,
    visibility,
    target_batch,
    target_student_ids,
    allow_download,
  } = req.body;

  if (!title || !subject || !class_name) {
    res.status(400).json({ error: 'Title, subject, and class are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const resolvedUrl = file_url || external_url || undefined;
  const cleanClassName = class_name.trim();
  const resolvedVisibility = isAllClasses(cleanClassName)
    ? 'all'
    : (visibility || 'class');

  const newMaterial: StudyMaterial = {
    id: `mat-${Date.now()}`,
    teacher_id: ws.effectiveTeacherId,
    teacher_name: teacher.name,
    author_teacher_id: teacher.id,
    title: title.trim(),
    description: description || '',
    subject: subject.trim(),
    class_name: cleanClassName,
    chapter: chapter ? chapter.trim() : 'General',
    topic: topic ? topic.trim() : 'General',
    material_type: material_type || 'notes',
    file_url: resolvedUrl,
    file_name: file_name || (title ? `${title.replace(/\s+/g, '_')}.pdf` : undefined),
    file_size: file_size || '1.5 MB',
    external_url: external_url || resolvedUrl,
    preview_images: Array.isArray(preview_images) ? preview_images : [],
    attachments: Array.isArray(attachments) ? attachments : [],
    content_text: content_text || undefined,
    visibility: resolvedVisibility,
    target_batch: target_batch || undefined,
    target_student_ids: target_student_ids || undefined,
    allow_download: allow_download !== undefined ? !!allow_download : true,
    bookmarks_count: 0,
    created_at: new Date().toISOString(),
  };

  db.materials.push(newMaterial);

  sendAdminDataUpdate('MATERIAL_UPLOADED', `New Note/Study Material: "${newMaterial.title}" for ${newMaterial.class_name}`, {
    material_id: newMaterial.id,
    title: newMaterial.title,
    subject: newMaterial.subject,
    class_name: newMaterial.class_name,
    chapter: newMaterial.chapter,
    type: newMaterial.material_type,
  }).catch(() => {});

  // Notify relevant students (handles 'All Classes' and case-insensitive match)
  const targetStudents = db.students.filter(
    (s) =>
      ws.matchesWorkspace(s.teacher_id) &&
      s.is_active &&
      (resolvedVisibility === 'all' || isClassMatch(newMaterial.class_name, s.class_name))
  );
  targetStudents.forEach((st) => {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: st.user_id,
      title: 'New Study Resource Uploaded',
      message: `${teacher.name} posted "${newMaterial.title}" in ${newMaterial.subject}.`,
      type: 'material',
      reference_id: newMaterial.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  });

  saveDB();
  res.status(201).json(newMaterial);
});

teacherRouter.delete('/materials/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const index = db.materials.findIndex((m) => m.id === id && ws.matchesWorkspace(m.teacher_id));
  if (index === -1) {
    res.status(404).json({ error: 'Material not found.' });
    return;
  }

  db.materials.splice(index, 1);
  saveDB();
  res.json({ success: true, message: 'Resource removed.' });
});

// 6. Assignments Management
teacherRouter.get('/assignments', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const assignments = db.assignments.filter((a) => ws.matchesWorkspace(a.teacher_id));

  // Attach submission counts
  const enriched = assignments.map((asg) => {
    const totalClassStudents = db.students.filter(
      (s) =>
        ws.matchesWorkspace(s.teacher_id) &&
        isClassMatch(asg.class_name, s.class_name) &&
        s.is_active
    ).length;
    const subs = db.assignment_submissions.filter((s) => s.assignment_id === asg.id);
    return {
      ...asg,
      submissions_count: subs.length,
      total_students: totalClassStudents,
    };
  });

  res.json(enriched.reverse());
});

teacherRouter.post('/assignments', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    instructions,
    subject,
    chapter,
    class_name,
    batch,
    due_date,
    max_marks,
    attachments,
  } = req.body;

  if (!title || !subject || !class_name || !due_date || !max_marks) {
    res.status(400).json({ error: 'Title, subject, class, due date, and maximum marks are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const newAssignment: Assignment = {
    id: `asg-${Date.now()}`,
    teacher_id: ws.effectiveTeacherId,
    teacher_name: teacher.name,
    title: title.trim(),
    description: description || '',
    instructions: instructions || '',
    subject: subject.trim(),
    chapter: chapter ? chapter.trim() : undefined,
    class_name: class_name.trim(),
    batch: batch ? batch.trim() : undefined,
    due_date: new Date(due_date).toISOString(),
    max_marks: Number(max_marks),
    attachments: attachments || [],
    created_at: new Date().toISOString(),
  };

  db.assignments.push(newAssignment);

  sendAdminDataUpdate('ASSIGNMENT_CREATED', `New Assignment: "${newAssignment.title}" for ${newAssignment.class_name}`, {
    assignment_id: newAssignment.id,
    title: newAssignment.title,
    subject: newAssignment.subject,
    class_name: newAssignment.class_name,
    due_date: newAssignment.due_date,
    max_marks: newAssignment.max_marks,
  }).catch(() => {});

  // Notify students
  const targetStudents = db.students.filter(
    (s) =>
      ws.matchesWorkspace(s.teacher_id) &&
      isClassMatch(newAssignment.class_name, s.class_name) &&
      s.is_active
  );
  targetStudents.forEach((st) => {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: st.user_id,
      title: 'New Homework Assigned',
      message: `Assignment "${newAssignment.title}" due on ${new Date(newAssignment.due_date).toLocaleDateString()}.`,
      type: 'assignment',
      reference_id: newAssignment.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  });

  saveDB();
  res.status(201).json(newAssignment);
});

teacherRouter.get('/assignments/:id/submissions', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const assignment = db.assignments.find((a) => a.id === id && ws.matchesWorkspace(a.teacher_id));
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found.' });
    return;
  }

  // Get all class students to show submitted vs missing
  const classStudents = db.students.filter(
    (s) =>
      ws.matchesWorkspace(s.teacher_id) &&
      isClassMatch(assignment.class_name, s.class_name) &&
      s.is_active
  );

  const submissions = db.assignment_submissions.filter((s) => s.assignment_id === id);

  const studentSubmissions = classStudents.map((st) => {
    const sub = submissions.find((s) => s.student_id === st.id);
    return {
      id: sub?.id || `missing-${st.id}`,
      submission_id: sub?.id || null,
      student_id: st.id,
      student_name: st.name,
      student_roll: st.roll_number,
      roll_number: st.roll_number,
      submitted_at: sub?.submitted_at || null,
      content_text: sub?.content_text || '',
      file_name: sub?.file_name || null,
      file_url: sub?.file_url || null,
      status: sub?.status || 'not_submitted',
      marks_obtained: sub?.marks_obtained ?? sub?.marks ?? null,
      feedback: sub?.feedback || '',
      submission: sub || null,
      has_submitted: !!sub,
    };
  });

  res.json({
    assignment,
    submissions: studentSubmissions,
  });
});

// Grade Submission
teacherRouter.post('/assignments/:id/grade', (req: AuthenticatedRequest, res: Response) => {
  const { submission_id, marks, feedback } = req.body;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const submission = db.assignment_submissions.find(
    (s) => s.id === submission_id && ws.matchesWorkspace(s.teacher_id)
  );
  if (!submission) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  submission.marks = Number(marks);
  submission.feedback = feedback || '';
  submission.status = 'graded';
  submission.graded_at = new Date().toISOString();

  // Notify student
  const student = db.students.find((s) => s.id === submission.student_id);
  if (student) {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: student.user_id,
      title: 'Assignment Graded',
      message: `Your assignment was graded (${submission.marks} marks). Feedback: ${submission.feedback}`,
      type: 'assignment',
      reference_id: submission.assignment_id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  saveDB();
  res.json({ success: true, submission, message: 'Grade and feedback recorded.' });
});

// 7. Tests & Quizzes Management
teacherRouter.get('/tests', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const tests = db.tests.filter((t) => ws.matchesWorkspace(t.teacher_id));
  const enriched = tests.map((t) => {
    const questions = db.test_questions.filter((q) => q.test_id === t.id);
    const results = db.test_results.filter((r) => r.test_id === t.id);
    const classStudents = db.students.filter(
      (s) =>
        ws.matchesWorkspace(s.teacher_id) &&
        isClassMatch(t.class_name, s.class_name) &&
        s.is_active
    ).length;

    return {
      ...t,
      questions,
      submissions_count: results.length,
      total_students: classStudents,
    };
  });

  res.json(enriched.reverse());
});

teacherRouter.post('/tests', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    subject,
    test_type,
    class_name,
    batch,
    duration_minutes,
    max_marks,
    instructions,
    questions,
  } = req.body;

  if (!title || !subject || !class_name || !duration_minutes) {
    res.status(400).json({ error: 'Title, subject, class, and duration are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const testId = `test-${Date.now()}`;
  const newTest: Test = {
    id: testId,
    teacher_id: ws.effectiveTeacherId,
    title: title.trim(),
    subject: subject.trim(),
    test_type: test_type || 'mcq',
    class_name: class_name.trim(),
    batch: batch ? batch.trim() : undefined,
    duration_minutes: Number(duration_minutes),
    max_marks: Number(max_marks) || 20,
    instructions: instructions || 'Read all questions carefully before answering.',
    is_published: true,
    created_at: new Date().toISOString(),
  };

  db.tests.push(newTest);

  // Save questions
  if (Array.isArray(questions)) {
    questions.forEach((q, idx) => {
      const qDoc: TestQuestion = {
        id: `q-${Date.now()}-${idx}`,
        test_id: testId,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq',
        section: q.section || undefined,
        image_url: q.image_url || q.diagram_url || undefined,
        diagram_url: q.diagram_url || q.image_url || undefined,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        marks: Number(q.marks || q.positive_marks) || 4,
        positive_marks: Number(q.positive_marks || q.marks) || 4,
        negative_marks: Number(q.negative_marks) || 0,
        explanation: q.explanation,
      };
      db.test_questions.push(qDoc);
    });
  }

  // Notify students
  const targetStudents = db.students.filter(
    (s) =>
      ws.matchesWorkspace(s.teacher_id) &&
      isClassMatch(newTest.class_name, s.class_name) &&
      s.is_active
  );
  targetStudents.forEach((st) => {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: st.user_id,
      title: 'New Online Test Published',
      message: `${newTest.title} (${newTest.duration_minutes} mins) is now available.`,
      type: 'test',
      reference_id: newTest.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  });

  saveDB();

  sendAdminDataUpdate('TEST_PUBLISHED', `New Exam/Test: "${newTest.title}" (${newTest.class_name} - ${newTest.subject})`, {
    test_id: newTest.id,
    title: newTest.title,
    subject: newTest.subject,
    class_name: newTest.class_name,
    duration_minutes: newTest.duration_minutes,
    total_questions: Array.isArray(questions) ? questions.length : 0,
  }).catch(() => {});

  res.status(201).json(newTest);
});

teacherRouter.get('/tests/:id/results', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const test = db.tests.find((t) => t.id === id && ws.matchesWorkspace(t.teacher_id));
  if (!test) {
    res.status(404).json({ error: 'Test not found.' });
    return;
  }

  const results = db.test_results.filter((r) => r.test_id === id);
  const questions = db.test_questions.filter((q) => q.test_id === id);

  res.json({
    test,
    questions,
    results,
  });
});

// 8. Marks & Academic Results
teacherRouter.get('/marks', (req: AuthenticatedRequest, res: Response) => {
  const className = cleanParam(req.query.class_name);
  const subject = cleanParam(req.query.subject);
  const examName = cleanParam(req.query.exam_name);

  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  let marks = db.marks.filter((m) => ws.matchesWorkspace(m.teacher_id));

  if (className && !isAllClasses(className)) {
    const targetCls = normalizeStr(className);
    marks = marks.filter((m) => normalizeStr(m.class_name) === targetCls);
  }
  if (subject && normalizeStr(subject) !== 'all' && normalizeStr(subject) !== 'all subjects') {
    const targetSub = normalizeStr(subject);
    marks = marks.filter((m) => normalizeStr(m.subject) === targetSub);
  }
  if (examName) {
    const targetExam = normalizeStr(examName);
    marks = marks.filter((m) => normalizeStr(m.exam_name) === targetExam);
  }

  res.json(marks.reverse());
});

teacherRouter.post('/marks', (req: AuthenticatedRequest, res: Response) => {
  const {
    student_id,
    class_name,
    subject,
    exam_name,
    max_marks,
    obtained_marks,
    remarks,
    exam_date,
  } = req.body;

  if (!student_id || !subject || !exam_name || obtained_marks === undefined || !max_marks) {
    res.status(400).json({ error: 'Student, subject, exam name, max marks, and obtained marks are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const student = db.students.find((s) => s.id === student_id && ws.matchesWorkspace(s.teacher_id));
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const numObtained = Number(obtained_marks);
  const numMax = Number(max_marks);
  const percentage = Math.round((numObtained / numMax) * 100);

  let grade = 'F';
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';

  const markEntry: AcademicMarkEntry = {
    id: `mrk-${Date.now()}`,
    student_id: student.id,
    student_name: student.name,
    student_roll: student.roll_number,
    teacher_id: ws.effectiveTeacherId,
    class_name: class_name || student.class_name,
    subject: subject.trim(),
    exam_name: exam_name.trim(),
    max_marks: numMax,
    obtained_marks: numObtained,
    percentage,
    grade,
    remarks: remarks || '',
    exam_date: exam_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  db.marks.push(markEntry);

  // Notify student
  db.notifications.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: student.user_id,
    title: 'Exam Marks Published',
    message: `Marks for ${markEntry.exam_name} (${markEntry.subject}): ${markEntry.obtained_marks}/${markEntry.max_marks} (${markEntry.grade})`,
    type: 'marks',
    reference_id: markEntry.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  saveDB();

  sendAdminDataUpdate('MARKS_RECORDED', `Academic Marks: ${student.name} (#${student.roll_number}) - ${markEntry.exam_name} (${markEntry.subject})`, {
    student_id: student.student_id,
    student_name: student.name,
    roll_number: student.roll_number,
    exam: markEntry.exam_name,
    subject: markEntry.subject,
    score: `${markEntry.obtained_marks}/${markEntry.max_marks} (${markEntry.percentage}%)`,
    grade: markEntry.grade,
  }).catch(() => {});

  res.status(201).json(markEntry);
});

// 9. Announcements
teacherRouter.get('/announcements', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const list = db.announcements.filter((a) => ws.matchesWorkspace(a.teacher_id));
  res.json(list.reverse());
});

teacherRouter.post('/announcements', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    message,
    priority,
    target_type,
    target_class,
    target_batch,
    target_value,
    video_url,
    video_title,
    attachments,
  } = req.body;

  if (!title || !message) {
    res.status(400).json({ error: 'Title and announcement message are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const newAnn: Announcement = {
    id: `ann-${Date.now()}`,
    teacher_id: ws.effectiveTeacherId,
    teacher_name: teacher.name,
    title: title.trim(),
    message: message.trim(),
    priority: priority || 'normal',
    target_type: target_type || 'all',
    target_value: target_value || undefined,
    target_class: target_class || undefined,
    target_batch: target_batch || undefined,
    video_url: video_url || undefined,
    video_title: video_title || undefined,
    attachments: Array.isArray(attachments) ? attachments : [],
    created_at: new Date().toISOString(),
  };

  db.announcements.push(newAnn);

  // Broadcast notification to relevant students
  let recipients = db.students.filter((s) => ws.matchesWorkspace(s.teacher_id) && s.is_active);
  if (target_type === 'class' && target_class) {
    recipients = recipients.filter((s) => s.class_name === target_class);
  }
  if (target_type === 'batch' && target_batch) {
    recipients = recipients.filter((s) => s.batch === target_batch);
  }

  recipients.forEach((st) => {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: st.user_id,
      title: `Announcement: ${newAnn.title}`,
      message: newAnn.message.substring(0, 100) + '...',
      type: 'announcement',
      reference_id: newAnn.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  });

  saveDB();
  res.status(201).json(newAnn);
});

teacherRouter.delete('/announcements/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const idx = db.announcements.findIndex((a) => a.id === id && ws.matchesWorkspace(a.teacher_id));
  if (idx === -1) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }

  db.announcements.splice(idx, 1);
  saveDB();
  res.json({ success: true, message: 'Announcement deleted.' });
});

// 10. Reports Aggregator
teacherRouter.get('/reports/summary', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const students = db.students.filter((s) => ws.matchesWorkspace(s.teacher_id) && s.is_active);

  const studentReports = students.map((st) => {
    const att = db.attendance.filter((a) => a.student_id === st.id);
    const present = att.filter((a) => a.status === 'present').length;
    const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 100;

    const marks = db.marks.filter((m) => m.student_id === st.id);
    const avgMarks =
      marks.length > 0
        ? Math.round(marks.reduce((acc, curr) => acc + curr.percentage, 0) / marks.length)
        : 0;

    const subs = db.assignment_submissions.filter((s) => s.student_id === st.id);
    const tests = db.test_results.filter((r) => r.student_id === st.id);

    return {
      id: st.id,
      student_id: st.student_id,
      code: st.student_id,
      name: st.name,
      roll_number: st.roll_number,
      class_name: st.class_name,
      section: st.section,
      parent_name: st.parent_name,
      attendancePercentage: attPct,
      attendance_percentage: attPct,
      academicAverage: avgMarks,
      average_marks: avgMarks,
      completedAssignments: subs.length,
      assignments_completed: subs.length,
      completedTests: tests.length,
      tests_attempted: tests.length,
    };
  });

  res.json({
    generated_at: new Date().toISOString(),
    total_students: students.length,
    students: studentReports,
  });
});

// 11. Teacher Profile Management
teacherRouter.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  const teacher = getTeacherProfile(req);
  if (!teacher) {
    res.status(404).json({ error: 'Teacher profile not found.' });
    return;
  }
  const db = getDB();
  const ws = getTeacherWorkspace(teacher);
  const user = db.users.find((u) => u.id === teacher.user_id);
  const { password_hash, ...safeUser } = user || {};
  res.json({
    teacher: {
      ...teacher,
      academy_name: ws.academyName,
      academy_code: ws.academyCode,
      academy_logo: ws.academyLogo,
    },
    user: safeUser,
  });
});

teacherRouter.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const {
    name,
    phone,
    subject,
    institution,
    academy_name,
    academy_logo,
    school_logo,
    logo,
    bio,
    profile_photo,
    classes_taught,
  } = req.body;

  if (name && typeof name === 'string' && name.trim()) {
    teacher.name = name.trim();
  }
  if (phone !== undefined) {
    teacher.phone = String(phone).trim();
  }
  if (subject !== undefined) {
    teacher.subject = String(subject).trim() || 'All Subjects';
  }

  const nextSchoolNameRaw = academy_name !== undefined ? academy_name : institution;
  if (nextSchoolNameRaw !== undefined) {
    const cleanSchoolName = String(nextSchoolNameRaw).trim() || 'Academiq Academy';
    teacher.institution = cleanSchoolName;
    teacher.academy_name = cleanSchoolName;

    // Keep school name synced across all faculty and students of this academy
    if (ws.isOwner) {
      db.teachers.forEach((t) => {
        if ((t.academy_id || t.id) === ws.academyId) {
          t.academy_name = cleanSchoolName;
          t.institution = cleanSchoolName;
        }
      });
      db.students.forEach((s) => {
        if (ws.allowedTeacherIds.has(s.teacher_id)) {
          s.academy_name = cleanSchoolName;
        }
      });
    }
  }

  const nextSchoolLogoRaw =
    academy_logo !== undefined ? academy_logo : school_logo !== undefined ? school_logo : logo;
  if (nextSchoolLogoRaw !== undefined) {
    const cleanLogo = String(nextSchoolLogoRaw).trim();
    teacher.academy_logo = cleanLogo;
    if (ws.isOwner) {
      db.teachers.forEach((t) => {
        if ((t.academy_id || t.id) === ws.academyId) {
          t.academy_logo = cleanLogo;
        }
      });
      db.students.forEach((s) => {
        if (ws.allowedTeacherIds.has(s.teacher_id)) {
          s.academy_logo = cleanLogo;
        }
      });
    }
  }

  if (bio !== undefined) {
    teacher.bio = String(bio).trim();
  }
  if (profile_photo !== undefined) {
    teacher.profile_photo = String(profile_photo).trim();
  }
  if (Array.isArray(classes_taught)) {
    teacher.classes_taught = classes_taught;
  }

  // Also sync with user object
  const user = db.users.find((u) => u.id === teacher.user_id);
  if (user) {
    if (name) user.name = teacher.name;
    if (phone !== undefined) user.phone = teacher.phone;
    if (profile_photo !== undefined) user.profile_photo = teacher.profile_photo;
    user.updated_at = new Date().toISOString();
  }

  saveDB();
  const updatedWs = getTeacherWorkspace(teacher);
  const { password_hash, ...safeUser } = user || {};
  res.json({
    teacher: {
      ...teacher,
      academy_name: updatedWs.academyName,
      academy_code: updatedWs.academyCode,
      academy_logo: updatedWs.academyLogo,
    },
    user: safeUser,
    message: 'Teacher profile updated successfully.',
  });
});

// ==========================================
// 12. Faculty & Staff Collaboration System
// ==========================================

// Get all faculty staff in current academy, workspace status & memos
teacherRouter.get('/staff', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  // List all faculty members in this academy
  const facultyMembers = db.teachers
    .filter((t) => t.academy_id === ws.academyId)
    .map((t) => {
      const materialsCount = db.materials.filter(
        (m) => m.author_teacher_id === t.id || (m.teacher_id === t.id && !m.author_teacher_id)
      ).length;
      const testsCount = db.tests.filter(
        (test) => test.author_teacher_id === t.id || (test.teacher_id === t.id && !test.author_teacher_id)
      ).length;

      return {
        id: t.id,
        user_id: t.user_id,
        teacher_id: t.teacher_id,
        name: t.name,
        email: t.email,
        phone: t.phone || '',
        subject: t.subject || 'General Academics',
        classes_taught: t.classes_taught || [],
        role_in_academy: t.role_in_academy || (t.id === ws.academyId ? 'HEAD_TEACHER' : 'CO_TEACHER'),
        is_owner: t.id === ws.academyId || t.role_in_academy === 'HEAD_TEACHER',
        profile_photo: t.profile_photo || '',
        joined_at: t.joined_at || (t as any).created_at || new Date().toISOString(),
        materials_count: materialsCount,
        tests_count: testsCount,
        is_current_user: t.id === teacher.id,
      };
    });

  // Get faculty memos for this academy
  const memos = (db.faculty_memos || [])
    .filter((m) => m.academy_id === ws.academyId)
    .reverse();

  // Workspaces available to switch between
  const availableWorkspaces = [
    {
      id: ws.academyId,
      name: ws.academyName,
      code: ws.academyCode,
      mode: 'academy',
      label: `${ws.academyName} (Shared Academy)`,
      role: teacher.role_in_academy,
      is_current: teacher.active_workspace_mode === 'academy',
      is_owner: ws.isOwner,
    },
    {
      id: teacher.id,
      name: 'Personal Workspace',
      code: teacher.academy_code,
      mode: 'personal',
      label: 'My Private Solo Workspace',
      role: 'HEAD_TEACHER',
      is_current: teacher.active_workspace_mode === 'personal',
      is_owner: true,
    },
  ];

  res.json({
    academy: {
      id: ws.academyId,
      name: ws.academyName,
      code: ws.academyCode,
      logo: ws.academyLogo,
      academy_logo: ws.academyLogo,
      is_owner: ws.isOwner,
      role: teacher.role_in_academy,
      role_in_academy: teacher.role_in_academy,
      active_workspace_mode: teacher.active_workspace_mode,
      faculty_count: facultyMembers.length,
      total_faculty: facultyMembers.length,
      total_students: db.students.filter((s) => ws.matchesWorkspace(s.teacher_id) && s.is_active).length,
      total_classes: db.classes.filter((c) => ws.matchesWorkspace(c.teacher_id)).length,
    },
    faculty: facultyMembers,
    invitations: [],
    memos,
    available_workspaces: availableWorkspaces,
  });
});

// Invite or Add Co-Teacher by Email
teacherRouter.post('/staff/invite', (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, subject, classes_taught, role_in_academy } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: 'Educator name and valid email address are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const assignedRole =
    role_in_academy === 'HEAD_TEACHER' || role_in_academy === 'admin' ? 'HEAD_TEACHER' : 'CO_TEACHER';

  // Check if a teacher with this email already exists in DB
  const existingTeacher = db.teachers.find((t) => t.email && t.email.toLowerCase() === cleanEmail);

  if (existingTeacher) {
    // Check if already in this academy
    if (existingTeacher.academy_id === ws.academyId) {
      res.status(400).json({ error: `Educator ${cleanName} is already a member of this academy.` });
      return;
    }

    // Attach them to this academy
    existingTeacher.academy_id = ws.academyId;
    existingTeacher.academy_name = ws.academyName;
    existingTeacher.institution = ws.academyName;
    existingTeacher.academy_code = ws.academyCode;
    existingTeacher.academy_logo = ws.academyLogo;
    existingTeacher.role_in_academy = assignedRole;
    existingTeacher.active_workspace_mode = 'academy';
    if (subject) existingTeacher.subject = subject.trim();
    if (Array.isArray(classes_taught) && classes_taught.length > 0) {
      existingTeacher.classes_taught = classes_taught;
    }
    existingTeacher.joined_at = new Date().toISOString();
    existingTeacher.invited_by = teacher.name;

    saveDB();

    res.status(200).json({
      success: true,
      teacher: existingTeacher,
      message: `${cleanName} has been successfully added to ${ws.academyName}! They will see this shared workspace upon their next login.`,
    });
    return;
  }

  // Pre-register invited teacher profile
  const inviteId = `tea_inv_${Date.now()}`;
  const newInvite = {
    id: inviteId,
    user_id: `user_inv_${Date.now()}`,
    teacher_id: `TCH-INV-${Math.floor(1000 + Math.random() * 9000)}`,
    name: cleanName,
    email: cleanEmail,
    phone: phone ? String(phone).trim() : '',
    subject: subject ? subject.trim() : 'Subject Specialist',
    institution: ws.academyName,
    classes_taught:
      Array.isArray(classes_taught) && classes_taught.length > 0
        ? classes_taught
        : Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`),
    bio: `Invited faculty member at ${ws.academyName}.`,
    profile_photo: '',
    academy_id: ws.academyId,
    academy_name: ws.academyName,
    academy_code: ws.academyCode,
    academy_logo: ws.academyLogo,
    role_in_academy: assignedRole as 'HEAD_TEACHER' | 'CO_TEACHER' | 'FACULTY',
    active_workspace_mode: 'academy' as const,
    is_owner: false,
    joined_at: new Date().toISOString(),
    invited_by: teacher.name,
  };

  db.teachers.push(newInvite as TeacherProfile);
  saveDB();

  res.status(201).json({
    success: true,
    teacher: newInvite,
    message: `Invitation generated for ${cleanName} (${cleanEmail}). When they sign in or register using this email, they will automatically enter ${ws.academyName}!`,
  });
});

// Join Academy via Shareable Code (e.g. "APEX-4921")
teacherRouter.post('/staff/join-academy', (req: AuthenticatedRequest, res: Response) => {
  const rawCode = req.body?.code || req.body?.academy_code;
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    res.status(400).json({ error: 'Please provide a valid Academy Code.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;

  const targetCode = rawCode.trim().toUpperCase();

  // Find target academy by code
  const targetTeacher = db.teachers.find(
    (t) => t.academy_code && t.academy_code.toUpperCase() === targetCode
  );

  if (!targetTeacher) {
    res.status(404).json({
      error: `Invalid Academy Code "${targetCode}". Please verify the code with your institution head.`,
    });
    return;
  }

  const targetWs = getTeacherWorkspace(targetTeacher);
  const targetAcademyId = targetWs.academyId;
  const targetAcademyName = targetWs.academyName;

  if (targetAcademyId === teacher.academy_id) {
    res.status(400).json({
      error: `You are already a member of "${targetAcademyName}".`,
    });
    return;
  }

  // Link teacher to this academy
  teacher.academy_id = targetAcademyId;
  teacher.academy_name = targetAcademyName;
  teacher.institution = targetAcademyName;
  teacher.academy_code = targetWs.academyCode;
  teacher.academy_logo = targetWs.academyLogo;
  teacher.role_in_academy = 'CO_TEACHER';
  teacher.active_workspace_mode = 'academy';
  teacher.joined_at = new Date().toISOString();
  teacher.invited_by = targetTeacher.name;

  saveDB();

  res.json({
    success: true,
    academy_name: targetAcademyName,
    academy_logo: targetWs.academyLogo,
    message: `Successfully joined "${targetAcademyName}"! You now have full access to the shared student roster, classes, and study materials.`,
  });
});

// Switch Workspace Mode ("academy" vs "personal")
teacherRouter.post('/staff/switch-workspace', (req: AuthenticatedRequest, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'academy' && mode !== 'personal') {
    res.status(400).json({ error: 'Invalid mode. Must be "academy" or "personal".' });
    return;
  }

  const teacher = getTeacherProfile(req);
  if (!teacher) return;

  teacher.active_workspace_mode = mode;
  saveDB();

  res.json({
    success: true,
    mode,
    academy_name: teacher.academy_name,
    message:
      mode === 'personal'
        ? 'Switched to Personal Workspace. Your changes here will be private to you.'
        : `Switched to ${teacher.academy_name}. You are now collaborating with your faculty team.`,
  });
});

// Leave Shared Academy (Revert to personal standalone workspace)
teacherRouter.post('/staff/leave-academy', (req: AuthenticatedRequest, res: Response) => {
  const teacher = getTeacherProfile(req);
  if (!teacher) return;

  teacher.academy_id = teacher.id;
  teacher.academy_name = teacher.institution || `${teacher.name}'s Academy`;
  teacher.role_in_academy = 'HEAD_TEACHER';
  teacher.active_workspace_mode = 'personal';

  saveDB();

  res.json({
    success: true,
    message: 'You have left the shared academy and returned to your independent personal workspace.',
  });
});

// Remove Co-Teacher from Academy (Head Educator only)
teacherRouter.delete('/staff/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  if (!ws.isOwner) {
    res.status(403).json({ error: 'Only the Head Educator or Academy Owner can remove faculty members.' });
    return;
  }

  if (id === teacher.id) {
    res.status(400).json({ error: 'You cannot remove yourself from your own academy.' });
    return;
  }

  const target = db.teachers.find((t) => t.id === id);
  if (!target) {
    res.status(404).json({ error: 'Faculty member not found.' });
    return;
  }

  // Detach target from academy
  target.academy_id = target.id;
  target.academy_name = target.institution || `${target.name}'s Academy`;
  target.role_in_academy = 'HEAD_TEACHER';
  target.active_workspace_mode = 'personal';

  saveDB();

  res.json({
    success: true,
    message: `${target.name} has been removed from ${ws.academyName} and reverted to their private workspace.`,
  });
});

// Update Academy Settings (Name, Logo, Regenerate Code)
teacherRouter.put('/staff/academy', (req: AuthenticatedRequest, res: Response) => {
  const { name, academy_name, academy_logo, school_logo, logo, regenerate_code } = req.body;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  if (!ws.isOwner) {
    res.status(403).json({ error: 'Only the Head Educator can modify Academy details.' });
    return;
  }

  const nextName = academy_name ?? name;
  if (nextName && typeof nextName === 'string' && nextName.trim()) {
    const cleanName = nextName.trim();
    db.teachers.forEach((t) => {
      if ((t.academy_id || t.id) === ws.academyId) {
        t.academy_name = cleanName;
        t.institution = cleanName;
      }
    });
    db.students.forEach((s) => {
      if (ws.allowedTeacherIds.has(s.teacher_id)) {
        s.academy_name = cleanName;
      }
    });
  }

  const nextLogo =
    academy_logo !== undefined ? academy_logo : school_logo !== undefined ? school_logo : logo;
  if (nextLogo !== undefined) {
    const cleanLogo = String(nextLogo).trim();
    db.teachers.forEach((t) => {
      if ((t.academy_id || t.id) === ws.academyId) {
        t.academy_logo = cleanLogo;
      }
    });
    db.students.forEach((s) => {
      if (ws.allowedTeacherIds.has(s.teacher_id)) {
        s.academy_logo = cleanLogo;
      }
    });
  }

  if (regenerate_code) {
    const rawName = (teacher.academy_name || 'ACD').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const prefix = rawName.length >= 3 ? rawName : 'ACAD';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${prefix}-${rand}`;

    db.teachers.forEach((t) => {
      if ((t.academy_id || t.id) === ws.academyId) {
        t.academy_code = newCode;
      }
    });
    db.students.forEach((s) => {
      if (ws.allowedTeacherIds.has(s.teacher_id)) {
        s.academy_code = newCode;
      }
    });
  }

  saveDB();

  res.json({
    success: true,
    academy_name: teacher.academy_name,
    academy_code: teacher.academy_code,
    academy_logo: teacher.academy_logo || '',
    message: 'Academy configuration updated successfully.',
  });
});

// Faculty Discussion Board / Staff Memos
teacherRouter.post('/staff/memo', (req: AuthenticatedRequest, res: Response) => {
  const { title, content, priority, target_class } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Memo title and content are required.' });
    return;
  }

  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  if (!db.faculty_memos) {
    db.faculty_memos = [];
  }

  const newMemo: FacultyMemo = {
    id: `memo-${Date.now()}`,
    academy_id: ws.academyId,
    author_teacher_id: teacher.id,
    author_name: teacher.name,
    author_subject: teacher.subject,
    author_role: teacher.role_in_academy === 'HEAD_TEACHER' ? 'Head Educator' : 'Subject Faculty',
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'normal',
    target_class: target_class || undefined,
    created_at: new Date().toISOString(),
  };

  db.faculty_memos.push(newMemo);
  saveDB();

  res.status(201).json({ success: true, memo: newMemo });
});

teacherRouter.delete('/staff/memo/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const teacher = getTeacherProfile(req);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  if (!db.faculty_memos) {
    res.status(404).json({ error: 'Memo not found.' });
    return;
  }

  const idx = db.faculty_memos.findIndex((m) => m.id === id && m.academy_id === ws.academyId);
  if (idx === -1) {
    res.status(404).json({ error: 'Memo not found.' });
    return;
  }

  const memo = db.faculty_memos[idx];
  // Allow author or head teacher to delete
  if (memo.author_teacher_id !== teacher.id && !ws.isOwner) {
    res.status(403).json({ error: 'Permission denied to delete this memo.' });
    return;
  }

  db.faculty_memos.splice(idx, 1);
  saveDB();

  res.json({ success: true, message: 'Faculty memo deleted.' });
});

// ==========================================
// 13. Complete School / Tuition Profile & Student Visibility Controls
// ==========================================
const ALLOWED_STUDENT_VISIBLE_FIELDS = new Set([
  'institute_type',
  'board',
  'tagline',
  'timings',
  'contact_phone',
  'contact_email',
  'address',
  'website',
  'established_year',
  'about',
]);

teacherRouter.get('/school-profile', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  const academyTeachers = db.teachers.filter((t) => (t.academy_id || t.id) === ws.academyId);
  const owner =
    academyTeachers.find((t) => t.id === ws.academyId) ||
    academyTeachers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    teacher;

  const existing = owner.school_profile || academyTeachers.find((t) => !!t.school_profile)?.school_profile;

  const schoolProfile = {
    academy_id: ws.academyId,
    academy_name: ws.academyName,
    academy_code: ws.academyCode,
    academy_logo: ws.academyLogo,
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
      : ['board', 'timings'],
    updated_at: existing?.updated_at || new Date().toISOString(),
  };

  res.json({
    school_profile: schoolProfile,
    can_edit: ws.isOwner,
    stats: {
      total_faculty: academyTeachers.length,
      total_students: db.students.filter((s) => ws.allowedTeacherIds.has(s.teacher_id) && s.is_active).length,
      total_classes: db.classes.filter((c) => ws.allowedTeacherIds.has(c.teacher_id)).length,
    },
  });
});

teacherRouter.put('/school-profile', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const teacher = getTeacherProfile(req, res);
  if (!teacher) return;
  const ws = getTeacherWorkspace(teacher);

  if (!ws.isOwner) {
    res.status(403).json({ error: 'Only the Principal / Admin (Head Educator) can update the School / Tuition Profile.' });
    return;
  }

  const academyTeachers = db.teachers.filter((t) => (t.academy_id || t.id) === ws.academyId);
  const owner =
    academyTeachers.find((t) => t.id === ws.academyId) ||
    academyTeachers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    teacher;

  const existing: Partial<SchoolProfileDetails> = owner.school_profile || {};
  const body = req.body || {};

  const nextName =
    body.academy_name !== undefined && String(body.academy_name).trim()
      ? String(body.academy_name).trim()
      : ws.academyName;
  const nextLogo = body.academy_logo !== undefined ? String(body.academy_logo).trim() : ws.academyLogo;

  const sanitizedVisibleFields: StudentVisibleSchoolField[] = Array.isArray(body.student_visible_fields)
    ? (body.student_visible_fields
        .filter((f: any) => typeof f === 'string' && ALLOWED_STUDENT_VISIBLE_FIELDS.has(f))
        .slice(0, 3) as StudentVisibleSchoolField[])
    : Array.isArray(existing.student_visible_fields)
    ? existing.student_visible_fields
    : (['board', 'timings'] as StudentVisibleSchoolField[]);

  const updatedProfile: SchoolProfileDetails = {
    academy_id: ws.academyId,
    academy_name: nextName,
    academy_code: ws.academyCode,
    academy_logo: nextLogo,
    institute_type:
      body.institute_type !== undefined ? String(body.institute_type).trim() : existing.institute_type || 'School',
    board: body.board !== undefined ? String(body.board).trim() : existing.board || '',
    principal_name:
      body.principal_name !== undefined ? String(body.principal_name).trim() : existing.principal_name || '',
    vice_principal_name:
      body.vice_principal_name !== undefined
        ? String(body.vice_principal_name).trim()
        : existing.vice_principal_name || '',
    tagline: body.tagline !== undefined ? String(body.tagline).trim() : existing.tagline || '',
    affiliation_number:
      body.affiliation_number !== undefined
        ? String(body.affiliation_number).trim()
        : existing.affiliation_number || '',
    established_year:
      body.established_year !== undefined ? String(body.established_year).trim() : existing.established_year || '',
    timings: body.timings !== undefined ? String(body.timings).trim() : existing.timings || '',
    contact_phone:
      body.contact_phone !== undefined ? String(body.contact_phone).trim() : existing.contact_phone || '',
    contact_email:
      body.contact_email !== undefined ? String(body.contact_email).trim() : existing.contact_email || '',
    website: body.website !== undefined ? String(body.website).trim() : existing.website || '',
    address: body.address !== undefined ? String(body.address).trim() : existing.address || '',
    city_state: body.city_state !== undefined ? String(body.city_state).trim() : existing.city_state || '',
    about: body.about !== undefined ? String(body.about).trim() : existing.about || '',
    student_visible_fields: sanitizedVisibleFields,
    updated_at: new Date().toISOString(),
  };

  // Sync across all teachers & students in this school tenant
  db.teachers.forEach((t) => {
    if ((t.academy_id || t.id) === ws.academyId) {
      t.academy_name = nextName;
      t.institution = nextName;
      t.academy_logo = nextLogo;
      t.school_profile = updatedProfile;
    }
  });

  db.students.forEach((s) => {
    if (ws.allowedTeacherIds.has(s.teacher_id)) {
      s.academy_name = nextName;
      s.academy_logo = nextLogo;
    }
  });

  saveDB();

  res.json({
    success: true,
    school_profile: updatedProfile,
    message: 'School / Tuition Profile updated and synced across faculty and student views.',
  });
});

