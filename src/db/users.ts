import { db } from './index.ts';
import { users, teachers, classes } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface UserSyncPayload {
  uid: string;
  email: string;
  name?: string;
  role?: 'TEACHER' | 'STUDENT';
  photoUrl?: string;
  phone?: string;
  subject?: string;
  institution?: string;
}

export async function getOrCreateUser(payload: UserSyncPayload) {
  const { uid, email, name = 'Educator', role = 'TEACHER', photoUrl = '', phone = '', subject = 'General Academics', institution = 'Academiq Academy' } = payload;

  try {
    // 1. Upsert into users table
    const existingUsers = await db.select().from(users).where(eq(users.uid, uid));
    let userRecord = existingUsers[0];

    if (!userRecord) {
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email,
          name,
          role,
          phone,
          profilePhoto: photoUrl,
          isActive: true,
        })
        .returning();
      userRecord = inserted[0];
    } else {
      // Update name/email/photo if available
      const updated = await db
        .update(users)
        .set({
          email,
          name: name || userRecord.name,
          profilePhoto: photoUrl || userRecord.profilePhoto,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      userRecord = updated[0] || userRecord;
    }

    // 2. If Teacher, ensure teacher record & default starter classes exist
    let teacherRecord = null;
    if (userRecord.role === 'TEACHER') {
      const existingTeachers = await db.select().from(teachers).where(eq(teachers.userUid, uid));
      if (existingTeachers.length === 0) {
        // Generate a teacher_id based on email prefix or uid
        const baseId = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'teacher';
        const teacherId = `${baseId}_${uid.slice(0, 5)}`;
        const defaultClassesTaught = JSON.stringify(
          Array.from({ length: 12 }, (_, i) => `Class ${i + 1} - Section A`)
        );

        const newTeacher = await db
          .insert(teachers)
          .values({
            id: `tea_${uid}`,
            userUid: uid,
            teacherId,
            name: userRecord.name,
            email: userRecord.email,
            phone: phone || '',
            subject,
            institution,
            bio: 'Educator profile on Academiq.',
            profilePhoto: photoUrl,
            classesTaught: defaultClassesTaught,
          })
          .returning();
        teacherRecord = newTeacher[0];

        // Seed starter classes for this teacher (isolated by teacherUid)
        const starterClasses = Array.from({ length: 12 }, (_, i) => {
          const classNum = i + 1;
          return {
            id: `cls_${uid}_${classNum}`,
            teacherUid: uid,
            name: `Class ${classNum}`,
            section: 'Section A',
            subject: subject || 'General Academics',
            batch: 'Regular Batch',
            academicYear: '2026-2027',
            description: `Academic classroom for Class ${classNum} Section A`,
          };
        });

        await db.insert(classes).values(starterClasses);
      } else {
        teacherRecord = existingTeachers[0];
      }
    }

    return { user: userRecord, teacher: teacherRecord };
  } catch (error) {
    console.error('getOrCreateUser database error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
