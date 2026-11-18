import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role } from '../src/types';
import { adminAuth } from '../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../src/db/users.ts';
import { getDB, saveDB } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'edupulse_secure_jwt_secret_token_key_2026';

export interface TokenPayload {
  userId: string;
  role: Role;
  teacherId?: string;
  studentId?: string;
  studentDocId?: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plainText, hash);
  } catch (err) {
    return false;
  }
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  // 1. Try Firebase Auth ID token first
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    const email = decodedFirebase.email || '';
    const name = decodedFirebase.name || (email ? email.split('@')[0] : 'Educator');
    const photoUrl = decodedFirebase.picture || '';

    // Synchronize to PostgreSQL database via Drizzle
    let syncResult;
    try {
      syncResult = await getOrCreateUser({
        uid: decodedFirebase.uid,
        email,
        name,
        photoUrl,
        role: 'TEACHER',
      });
    } catch (dbErr) {
      console.warn('Cloud SQL sync notice:', dbErr);
    }

    const teacherDocId = `tea_${decodedFirebase.uid}`;
    const teacherId = syncResult?.teacher?.teacherId || `TCH-${decodedFirebase.uid.slice(0, 6).toUpperCase()}`;

    // Ensure teacher & classes exist in runtime store (isolated by teacherDocId or linked to invited academy)
    const db = getDB();
    let runtimeTeacher = db.teachers.find((t) => t.user_id === decodedFirebase.uid || t.id === teacherDocId);

    // Check if an academy owner already pre-invited this educator by email
    const preInvited = email
      ? db.teachers.find(
          (t) =>
            t.email &&
            t.email.toLowerCase() === email.toLowerCase() &&
            t.user_id !== decodedFirebase.uid &&
            t.role_in_academy === 'CO_TEACHER'
        )
      : null;

    if (!runtimeTeacher) {
      let academyId = teacherDocId;
      let academyName = 'Academiq Academy';
      let academyCode = '';
      let roleInAcademy: 'HEAD_TEACHER' | 'CO_TEACHER' = 'HEAD_TEACHER';
      let subject = 'General Academics';
      let classesTaught = Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`);

      if (preInvited && preInvited.academy_id) {
        // Automatically join the inviting institution/academy!
        academyId = preInvited.academy_id;
        academyName = preInvited.academy_name || 'Academiq Academy';
        roleInAcademy = 'CO_TEACHER';
        subject = preInvited.subject || 'General Academics';
        if (preInvited.classes_taught && preInvited.classes_taught.length > 0) {
          classesTaught = preInvited.classes_taught;
        }
        // Remove the temporary invite placeholder
        db.teachers = db.teachers.filter((t) => t.id !== preInvited.id);
      } else {
        const rawName = (name || 'ACD').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
        const prefix = rawName.length >= 3 ? rawName : 'ACAD';
        const rand = Math.floor(1000 + Math.random() * 9000);
        academyCode = `${prefix}-${rand}`;
      }

      const newTeacherProfile = {
        id: teacherDocId,
        user_id: decodedFirebase.uid,
        teacher_id: teacherId,
        name,
        email,
        phone: preInvited?.phone || '',
        subject,
        institution: academyName,
        classes_taught: classesTaught,
        bio: 'Educator profile on Academiq.',
        profile_photo: photoUrl,
        academy_id: academyId,
        academy_name: academyName,
        academy_code: academyCode,
        role_in_academy: roleInAcademy,
        active_workspace_mode: 'academy' as const,
        is_owner: roleInAcademy === 'HEAD_TEACHER',
        joined_at: new Date().toISOString(),
      };
      db.teachers.push(newTeacherProfile);

      // Only create starter classes if starting an independent private academy
      if (academyId === teacherDocId) {
        const starterClasses = Array.from({ length: 12 }, (_, i) => {
          const classNum = i + 1;
          return {
            id: `cls-${decodedFirebase.uid.slice(0, 8)}-${classNum}`,
            teacher_id: teacherDocId,
            name: `Class ${classNum}`,
            section: 'Section A',
            subject: 'General Academics',
            batch: 'Regular Batch',
            academic_year: '2026-2027',
            description: `Academic classroom for Class ${classNum} Section A`,
            student_count: 0,
          };
        });
        db.classes.push(...starterClasses);
      }

      if (!db.users.some((u) => u.id === decodedFirebase.uid)) {
        db.users.push({
          id: decodedFirebase.uid,
          role: 'TEACHER',
          name,
          email,
          phone: '',
          password_hash: '',
          profile_photo: photoUrl,
          must_change_password: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      saveDB();
    } else {
      // Ensure existing teacher profile has academy metadata
      let updated = false;
      if (!runtimeTeacher.academy_id) {
        runtimeTeacher.academy_id = runtimeTeacher.id;
        updated = true;
      }
      if (!runtimeTeacher.academy_code) {
        const rawName = (runtimeTeacher.name || 'ACD').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
        const prefix = rawName.length >= 3 ? rawName : 'ACAD';
        const rand = Math.floor(1000 + Math.random() * 9000);
        runtimeTeacher.academy_code = `${prefix}-${rand}`;
        updated = true;
      }
      if (!runtimeTeacher.academy_name) {
        runtimeTeacher.academy_name = runtimeTeacher.institution || 'Academiq Academy';
        updated = true;
      }
      if (!runtimeTeacher.role_in_academy) {
        runtimeTeacher.role_in_academy = runtimeTeacher.academy_id === runtimeTeacher.id ? 'HEAD_TEACHER' : 'CO_TEACHER';
        updated = true;
      }
      if (!runtimeTeacher.active_workspace_mode) {
        runtimeTeacher.active_workspace_mode = 'academy';
        updated = true;
      }
      if (updated) {
        saveDB();
      }
    }

    req.user = {
      userId: decodedFirebase.uid,
      role: 'TEACHER',
      teacherId: teacherDocId,
      email,
      name,
    };
    next();
    return;
  } catch (firebaseErr) {
    // Fall back to JWT token
  }

  // 2. Standard JWT token fallback
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function requireTeacher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const role = req.user.role?.toUpperCase();
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    res.status(403).json({
      error: 'Access denied. This action requires Teacher administrative privileges.',
    });
    return;
  }

  next();
}

export function requireStudent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const role = req.user.role?.toUpperCase();
  if (role !== 'STUDENT') {
    res.status(403).json({
      error: 'Access denied. This section is strictly for enrolled student accounts.',
    });
    return;
  }

  next();
}
