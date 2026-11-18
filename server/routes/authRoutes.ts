import { Router, Response } from 'express';
import { getDB, saveDB } from '../db';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  authenticateToken,
  AuthenticatedRequest,
} from '../auth';
import {
  User,
  TeacherProfile,
  StudentProfile,
  SchoolProfileDetails,
  StudentVisibleSchoolField,
} from '../../src/types';

export const authRouter = Router();

// Authorized Master Faculty Passcodes for institutional security gate
const MASTER_TEACHER_PASSCODES = [
  'TEACHER2026',
  'FACULTY@ACADEMIQ',
  'ACAD2026',
  'ADMIN@FACULTY2026',
];

export function validateFacultyPasscode(passcode?: string): { valid: boolean; academy?: any } {
  if (!passcode || typeof passcode !== 'string') return { valid: false };
  const clean = passcode.trim().toUpperCase();
  if (MASTER_TEACHER_PASSCODES.includes(clean)) {
    return { valid: true };
  }
  const db = getDB();
  const matchedAcademy = db.teachers.find(
    (t) => t.academy_code && t.academy_code.trim().toUpperCase() === clean
  );
  if (matchedAcademy) {
    return { valid: true, academy: matchedAcademy };
  }
  return { valid: false };
}

function resolveCanonicalAcademyBranding(db: ReturnType<typeof getDB>, refTeacher?: TeacherProfile | null) {
  if (!refTeacher) return null;
  const academyId = refTeacher.academy_id || refTeacher.id;
  const peers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
  const owner =
    peers.find((t) => t.id === academyId) ||
    peers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    refTeacher;

  const academyName =
    owner.academy_name ||
    owner.institution ||
    refTeacher.academy_name ||
    refTeacher.institution ||
    'Academiq Academy';
  const academyCode = owner.academy_code || refTeacher.academy_code || 'ACAD-0000';
  const academyLogo =
    owner.academy_logo ||
    peers.find((t) => !!t.academy_logo)?.academy_logo ||
    refTeacher.academy_logo ||
    '';

  const ownerSchoolProfile = owner.school_profile || peers.find((t) => !!t.school_profile)?.school_profile;

  const schoolProfile: SchoolProfileDetails = {
    academy_id: academyId,
    academy_name: academyName,
    academy_code: academyCode,
    academy_logo: academyLogo,
    institute_type: ownerSchoolProfile?.institute_type || 'School',
    board: ownerSchoolProfile?.board || '',
    principal_name: ownerSchoolProfile?.principal_name || '',
    vice_principal_name: ownerSchoolProfile?.vice_principal_name || '',
    tagline: ownerSchoolProfile?.tagline || '',
    affiliation_number: ownerSchoolProfile?.affiliation_number || '',
    established_year: ownerSchoolProfile?.established_year || '',
    timings: ownerSchoolProfile?.timings || '',
    contact_phone: ownerSchoolProfile?.contact_phone || owner.phone || '',
    contact_email: ownerSchoolProfile?.contact_email || owner.email || '',
    website: ownerSchoolProfile?.website || '',
    address: ownerSchoolProfile?.address || '',
    city_state: ownerSchoolProfile?.city_state || '',
    about: ownerSchoolProfile?.about || '',
    student_visible_fields: Array.isArray(ownerSchoolProfile?.student_visible_fields)
      ? (ownerSchoolProfile.student_visible_fields as StudentVisibleSchoolField[])
      : (['board', 'timings'] as StudentVisibleSchoolField[]),
    updated_at: ownerSchoolProfile?.updated_at,
  };

  return {
    academyId,
    academyName,
    academyCode,
    academyLogo,
    schoolProfile,
  };
}

function hydrateTeacherWithBranding(db: ReturnType<typeof getDB>, teacher: TeacherProfile): TeacherProfile {
  const branding = resolveCanonicalAcademyBranding(db, teacher);
  if (!branding) return teacher;
  return {
    ...teacher,
    institution: branding.academyName,
    academy_id: branding.academyId,
    academy_name: branding.academyName,
    academy_code: branding.academyCode,
    academy_logo: branding.academyLogo,
    school_profile: branding.schoolProfile,
  };
}

// Verify Teacher/Faculty Passcode before allowing registration
authRouter.post('/verify-teacher-passcode', (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    res.status(400).json({ valid: false, error: 'Faculty authorization passcode is required.' });
    return;
  }

  const result = validateFacultyPasscode(passcode);
  if (!result.valid) {
    res.status(403).json({
      valid: false,
      error: 'Invalid Faculty Authorization Passcode. Please contact your institution administrator.',
    });
    return;
  }

  const db = getDB();
  const branding = resolveCanonicalAcademyBranding(db, result.academy);

  res.json({
    valid: true,
    message: 'Faculty authorization passcode verified successfully.',
    academy_name: branding?.academyName || result.academy?.academy_name || result.academy?.institution || null,
    academy_code: branding?.academyCode || result.academy?.academy_code || null,
    academy_logo: branding?.academyLogo || result.academy?.academy_logo || null,
  });
});

// Teacher Login
authRouter.post('/teacher/login', (req, res) => {
  const { identifier, password } = req.body; // identifier can be teacher_id or email

  if (!identifier || !password) {
    res.status(400).json({ error: 'Please enter Teacher ID / Email and password.' });
    return;
  }

  const db = getDB();

  // Find teacher profile by teacher_id or email
  const teacher = db.teachers.find(
    (t) =>
      t.teacher_id.toLowerCase() === identifier.trim().toLowerCase() ||
      t.email.toLowerCase() === identifier.trim().toLowerCase()
  );

  if (!teacher) {
    res.status(401).json({ error: 'Teacher account not found with the provided credentials.' });
    return;
  }

  const user = db.users.find((u) => u.id === teacher.user_id);
  if (!user || user.role?.toUpperCase() !== 'TEACHER') {
    res.status(401).json({ error: 'Invalid teacher account.' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'This teacher account is deactivated. Please contact support.' });
    return;
  }

  const isPasswordValid = verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    teacherId: teacher.id,
    email: user.email,
    name: user.name,
  });

  const { password_hash, ...safeUser } = user;

  const hydratedTeacher = hydrateTeacherWithBranding(db, teacher);

  res.json({
    token,
    user: safeUser,
    teacher: hydratedTeacher,
    must_change_password: !!user.must_change_password,
    message: 'Teacher authenticated successfully',
  });
});

// Teacher Sign Up (Guarded by Faculty Passcode with Multi-School Tenant Isolation)
authRouter.post('/teacher/signup', (req, res) => {
  const {
    name,
    teacher_id,
    email,
    phone,
    password,
    confirm_password,
    subject,
    institution,
    academy_logo,
    school_logo,
    logo,
    institute_type,
    principal_name,
    vice_principal_name,
    tagline,
    affiliation_number,
    established_year,
    timings,
    contact_phone,
    contact_email,
    website,
    address,
    city_state,
    about,
    student_visible_fields,
    registration_type, // 'new_school' | 'join_school'
    school_code,
    board,
    classes_taught,
    bio,
    faculty_passcode,
  } = req.body;

  // Strict RBAC gate: verify faculty authorization passcode
  const passcodeCheck = validateFacultyPasscode(faculty_passcode);
  if (!passcodeCheck.valid) {
    res.status(403).json({
      error: 'Access Denied: Valid Faculty Security Passcode is required to register a Teacher account. Unauthorized access blocked.',
    });
    return;
  }

  if (!name || !teacher_id || !email || !password || !subject || !institution) {
    res.status(400).json({ error: 'All required teacher signup fields must be filled.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  if (confirm_password && password !== confirm_password) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  const db = getDB();

  // Check unique teacher_id and email
  const existingTeacherId = db.teachers.find(
    (t) => t.teacher_id.toLowerCase() === teacher_id.trim().toLowerCase()
  );
  if (existingTeacherId) {
    res.status(400).json({ error: `Teacher ID "${teacher_id}" is already registered. Please choose another.` });
    return;
  }

  const existingEmail = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (existingEmail) {
    res.status(400).json({ error: `Email "${email}" is already registered. Please login.` });
    return;
  }

  const userId = `user-teacher-${Date.now()}`;
  const teacherDocId = `teacher-prof-${Date.now()}`;
  const now = new Date().toISOString();
  const effectiveSubject = subject && subject.trim() ? subject.trim() : 'All Subjects';
  const effectiveInstitution = institution && institution.trim() ? institution.trim() : 'Academiq Academy';

  // Multi-School Tenant Setup
  let targetAcademyId = teacherDocId;
  let targetAcademyName = effectiveInstitution;
  let targetAcademyCode = '';
  let targetAcademyLogo = String(academy_logo || school_logo || logo || '').trim();
  let targetRole: 'HEAD_TEACHER' | 'CO_TEACHER' | 'FACULTY' = 'HEAD_TEACHER';
  let isOwner = true;

  // Check if joining an existing school via school_code or matched passcode
  const targetCode = (school_code || (passcodeCheck.academy ? passcodeCheck.academy.academy_code : '')).trim().toUpperCase();
  const matchedSchool = targetCode
    ? db.teachers.find((t) => t.academy_code && t.academy_code.trim().toUpperCase() === targetCode)
    : null;

  if (registration_type === 'join_school' || matchedSchool) {
    if (!matchedSchool) {
      res.status(404).json({ error: `School code "${targetCode}" not found. Please verify with your principal.` });
      return;
    }
    // Link to the existing school tenant & inherit canonical school name/logo
    const schoolBranding = resolveCanonicalAcademyBranding(db, matchedSchool);
    targetAcademyId = schoolBranding?.academyId || matchedSchool.academy_id || matchedSchool.id;
    targetAcademyName = schoolBranding?.academyName || matchedSchool.academy_name || matchedSchool.institution || effectiveInstitution;
    targetAcademyCode = schoolBranding?.academyCode || matchedSchool.academy_code || targetCode;
    targetAcademyLogo = schoolBranding?.academyLogo || matchedSchool.academy_logo || targetAcademyLogo;
    targetRole = 'FACULTY';
    isOwner = false;
  } else {
    // Brand new school tenant registration
    const cleanName = effectiveInstitution.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const prefix = cleanName.length >= 3 ? cleanName : 'SCH';
    const rand = Math.floor(1000 + Math.random() * 9000);
    targetAcademyCode = `${prefix}-${rand}`;
    targetAcademyId = teacherDocId;
    targetAcademyName = effectiveInstitution;
    targetRole = 'HEAD_TEACHER';
    isOwner = true;
  }

  const newUser: User = {
    id: userId,
    role: 'TEACHER',
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone || '',
    password_hash: hashPassword(password),
    profile_photo: '',
    must_change_password: false,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const defaultClassesTaught = Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`);

  const newTeacher: TeacherProfile = {
    id: teacherDocId,
    user_id: userId,
    teacher_id: teacher_id.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone || '',
    subject: effectiveSubject,
    institution: targetAcademyName,
    academy_id: targetAcademyId,
    academy_name: targetAcademyName,
    academy_code: targetAcademyCode,
    academy_logo: targetAcademyLogo,
    school_profile: isOwner
      ? {
          academy_id: targetAcademyId,
          academy_name: targetAcademyName,
          academy_code: targetAcademyCode,
          academy_logo: targetAcademyLogo,
          institute_type: String(institute_type || 'School').trim() || 'School',
          board: board ? String(board).trim() : '',
          principal_name: principal_name ? String(principal_name).trim() : '',
          vice_principal_name: vice_principal_name ? String(vice_principal_name).trim() : '',
          tagline: tagline ? String(tagline).trim() : '',
          affiliation_number: affiliation_number ? String(affiliation_number).trim() : '',
          established_year: established_year ? String(established_year).trim() : '',
          timings: timings ? String(timings).trim() : '',
          contact_phone: contact_phone ? String(contact_phone).trim() : String(phone || '').trim(),
          contact_email: contact_email ? String(contact_email).trim() : email.trim().toLowerCase(),
          website: website ? String(website).trim() : '',
          address: address ? String(address).trim() : '',
          city_state: city_state ? String(city_state).trim() : '',
          about: about ? String(about).trim() : '',
          student_visible_fields: Array.isArray(student_visible_fields)
            ? (student_visible_fields as StudentVisibleSchoolField[])
            : (['board', 'timings'] as StudentVisibleSchoolField[]),
          updated_at: now,
        }
      : resolveCanonicalAcademyBranding(db, matchedSchool)?.schoolProfile,
    role_in_academy: targetRole,
    active_workspace_mode: 'academy',
    is_owner: isOwner,
    classes_taught: Array.isArray(classes_taught) && classes_taught.length > 0 ? classes_taught : defaultClassesTaught,
    bio: bio || `Educator at ${targetAcademyName}`,
    profile_photo: '',
  };

  db.users.push(newUser);
  db.teachers.push(newTeacher);

  // If registering a brand new school, provision initial isolated classes for Class 1 to 12
  if (isOwner) {
    const starterClasses = Array.from({ length: 12 }, (_, i) => {
      const classNum = i + 1;
      return {
        id: `cls-${teacherDocId}-${classNum}`,
        teacher_id: teacherDocId,
        name: `Class ${classNum}`,
        section: 'Section A',
        subject: effectiveSubject,
        batch: 'Regular Batch',
        academic_year: '2026-2027',
        description: `Classroom for Class ${classNum} Section A at ${targetAcademyName}`,
        student_count: 0,
      };
    });
    db.classes.push(...starterClasses);
  }

  saveDB();

  const token = generateToken({
    userId: newUser.id,
    role: newUser.role,
    teacherId: newTeacher.id,
    email: newUser.email,
    name: newUser.name,
  });

  const { password_hash, ...safeUser } = newUser;

  res.status(201).json({
    token,
    user: safeUser,
    teacher: newTeacher,
    must_change_password: false,
    message: 'Teacher account created successfully.',
  });
});

// Student Login
authRouter.post('/student/login', (req, res) => {
  const { identifier, password } = req.body; // identifier can be student_id or email

  if (!identifier || !password) {
    res.status(400).json({ error: 'Please enter Student ID / Email and password.' });
    return;
  }

  const db = getDB();

  // Find student by student_id or email
  const student = db.students.find(
    (s) =>
      s.student_id.toLowerCase() === identifier.trim().toLowerCase() ||
      s.email.toLowerCase() === identifier.trim().toLowerCase()
  );

  if (!student) {
    res.status(401).json({
      error: 'Student record not found. Please verify your Student ID provided by your teacher.',
    });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);
  if (!user || user.role?.toUpperCase() !== 'STUDENT') {
    res.status(401).json({ error: 'Invalid student account.' });
    return;
  }

  if (!student.is_active || !user.is_active) {
    res.status(403).json({
      error: 'Your student account is currently deactivated by your teacher. Please contact your instructor.',
    });
    return;
  }

  const isPasswordValid = verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    studentId: student.student_id,
    studentDocId: student.id,
    email: user.email,
    name: user.name,
  });

  const { password_hash, ...safeUser } = user;

  const directTeacher = db.teachers.find(
    (t) => t.id === student.teacher_id || t.academy_id === student.teacher_id
  );
  const schoolBranding = resolveCanonicalAcademyBranding(db, directTeacher);
  const studentWithSchool = {
    ...student,
    phone: student.phone || user.phone || '',
    profile_photo: student.profile_photo || user.profile_photo || '',
    academy_name:
      schoolBranding?.academyName ||
      student.academy_name ||
      directTeacher?.academy_name ||
      directTeacher?.institution ||
      'Academiq Campus',
    academy_code: schoolBranding?.academyCode || student.academy_code || directTeacher?.academy_code || 'SCH-0000',
    academy_logo: schoolBranding?.academyLogo || student.academy_logo || directTeacher?.academy_logo || '',
  };

  res.json({
    token,
    user: safeUser,
    student: studentWithSchool,
    must_change_password: !!user.must_change_password,
    message: 'Student authenticated successfully',
  });
});

// Student self-registration explanation / guard
authRouter.post('/student/signup', (req, res) => {
  res.status(403).json({
    error: 'Direct student self-registration is restricted. Student accounts must be generated and authorized by your Teacher to maintain institutional integrity. Please obtain your Student ID and temporary password from your teacher.',
  });
});

// Change Password (Used for first-login force change and user settings)
authRouter.post('/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!new_password || new_password.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  if (confirm_password && new_password !== confirm_password) {
    res.status(400).json({ error: 'New passwords do not match.' });
    return;
  }

  const db = getDB();
  const user = db.users.find((u) => u.id === req.user?.userId);

  if (!user) {
    res.status(404).json({ error: 'User record not found.' });
    return;
  }

  // If not first-time mandatory change, check current password
  if (!user.must_change_password && current_password) {
    const isCurrentValid = verifyPassword(current_password, user.password_hash);
    if (!isCurrentValid) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }
  }

  user.password_hash = hashPassword(new_password);
  user.must_change_password = false;
  user.updated_at = new Date().toISOString();
  saveDB();

  res.json({
    success: true,
    message: 'Password successfully updated.',
  });
});

// Get Current Authenticated Profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  let user = db.users.find((u) => u.id === req.user?.userId);

  if (!user && req.user) {
    user = {
      id: req.user.userId,
      role: req.user.role,
      name: req.user.name || 'Educator',
      email: req.user.email || '',
      phone: '',
      password_hash: '',
      profile_photo: '',
      must_change_password: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(user);
  }

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { password_hash, ...safeUser } = user;

  let teacher: TeacherProfile | undefined;
  let student: StudentProfile | undefined;

  if (user.role === 'TEACHER') {
    const rawTeacher = db.teachers.find((t) => t.user_id === user?.id || t.id === req.user?.teacherId);
    if (!rawTeacher && req.user?.userId) {
      const created: TeacherProfile = {
        id: req.user.teacherId || `tea_${req.user.userId}`,
        user_id: req.user.userId,
        teacher_id: `TCH-${req.user.userId.slice(0, 6).toUpperCase()}`,
        name: user.name,
        email: user.email,
        phone: '',
        subject: 'General Academics',
        institution: 'Academiq Academy',
        classes_taught: Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`),
        bio: 'Educator profile on Academiq.',
        profile_photo: user.profile_photo,
      };
      db.teachers.push(created);
      teacher = hydrateTeacherWithBranding(db, created);
    } else if (rawTeacher) {
      teacher = hydrateTeacherWithBranding(db, rawTeacher);
    }
  } else if (user.role === 'STUDENT') {
    const rawStudent = db.students.find((s) => s.user_id === user?.id);
    if (rawStudent) {
      const directTeacher = db.teachers.find(
        (t) => t.id === rawStudent.teacher_id || t.academy_id === rawStudent.teacher_id
      );
      const schoolBranding = resolveCanonicalAcademyBranding(db, directTeacher);
      student = {
        ...rawStudent,
        phone: rawStudent.phone || user.phone || '',
        profile_photo: rawStudent.profile_photo || user.profile_photo || '',
        academy_name:
          schoolBranding?.academyName ||
          rawStudent.academy_name ||
          directTeacher?.academy_name ||
          directTeacher?.institution ||
          'Academiq Campus',
        academy_code:
          schoolBranding?.academyCode ||
          rawStudent.academy_code ||
          directTeacher?.academy_code ||
          'SCH-0000',
        academy_logo:
          schoolBranding?.academyLogo ||
          rawStudent.academy_logo ||
          directTeacher?.academy_logo ||
          '',
      };
    }
  }

  const unreadNotifications = db.notifications.filter(
    (n) => n.user_id === user?.id && !n.is_read
  ).length;

  res.json({
    user: safeUser,
    teacher,
    student,
    must_change_password: !!user.must_change_password,
    unreadNotifications,
  });
});
