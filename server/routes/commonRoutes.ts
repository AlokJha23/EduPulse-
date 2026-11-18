import { Router, Response } from 'express';
import { getDB, saveDB } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';

export const commonRouter = Router();

// Apply auth to common routes
commonRouter.use(authenticateToken);

// Notifications
commonRouter.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const userId = req.user?.userId;
  const userNotifs = db.notifications.filter((n) => n.user_id === userId);
  res.json(userNotifs.reverse());
});

commonRouter.post('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const notif = db.notifications.find((n) => n.id === id && n.user_id === req.user?.userId);
  if (notif) {
    notif.is_read = true;
    saveDB();
  }
  res.json({ success: true });
});

commonRouter.post('/notifications/read-all', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  db.notifications.forEach((n) => {
    if (n.user_id === req.user?.userId) {
      n.is_read = true;
    }
  });
  saveDB();
  res.json({ success: true });
});

// File Storage Abstraction Endpoint
// In development, saves file metadata and supports data URI or simulation
commonRouter.post('/upload', (req: AuthenticatedRequest, res: Response) => {
  const { fileName, fileType, fileData, fileSize } = req.body;

  if (!fileName) {
    res.status(400).json({ error: 'File name is required.' });
    return;
  }

  // Storage abstraction: In production this would write to S3/GCS bucket or local disk storage
  const fileUrl =
    fileData && fileData.startsWith('data:')
      ? fileData
      : `https://storage.academiq.edu/uploads/${Date.now()}_${encodeURIComponent(fileName)}`;

  res.json({
    url: fileUrl,
    name: fileName,
    type: fileType || 'application/pdf',
    size: fileSize || '1.2 MB',
    uploaded_at: new Date().toISOString(),
  });
});

function normalizeClassVal(val?: string): string {
  return (val || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getAcademyTeacherIdsForTeacher(teacherId?: string): Set<string> {
  const db = getDB();
  const ids = new Set<string>();
  if (!teacherId) return ids;
  ids.add(teacherId);
  const teacher = db.teachers.find((t) => t.id === teacherId);
  if (!teacher) return ids;
  const isPersonal = teacher.active_workspace_mode === 'personal';
  if (isPersonal) return ids;
  const academyId = teacher.academy_id || teacher.id;
  ids.add(academyId);
  db.teachers.forEach((t) => {
    if ((t.academy_id || t.id) === academyId) {
      ids.add(t.id);
    }
  });
  return ids;
}

function getAcademyTeacherIdsForStudent(studentTeacherId: string): Set<string> {
  const db = getDB();
  const directTeacher = db.teachers.find(
    (t) => t.id === studentTeacherId || t.academy_id === studentTeacherId
  );
  const academyId = directTeacher?.academy_id || studentTeacherId;
  const ids = new Set<string>([studentTeacherId, academyId]);
  db.teachers.forEach((t) => {
    if ((t.academy_id || t.id) === academyId) {
      ids.add(t.id);
    }
  });
  return ids;
}

// Global Search (Fast & Multi-Tenant Isolated)
commonRouter.get('/search', (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    res.json({ results: [] });
    return;
  }

  const query = q.trim().toLowerCase();
  const db = getDB();
  const role = (req.user?.role || '').toUpperCase();
  const results: Array<{ id: string; title: string; subtitle: string; type: string; url?: string }> = [];

  if (role === 'TEACHER') {
    const allowedIds = getAcademyTeacherIdsForTeacher(req.user?.teacherId);

    // Search students
    db.students
      .filter((s) => allowedIds.has(s.teacher_id))
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.student_id.toLowerCase().includes(query) ||
          (s.roll_number || '').toLowerCase().includes(query) ||
          (s.class_name || '').toLowerCase().includes(query) ||
          (s.email || '').toLowerCase().includes(query)
      )
      .slice(0, 15)
      .forEach((s) => {
        results.push({
          id: s.id,
          title: s.name,
          subtitle: `Student (${s.student_id}) • Roll #${s.roll_number} • ${s.class_name} ${s.section}`,
          type: 'student',
        });
      });

    // Search study materials
    db.materials
      .filter((m) => allowedIds.has(m.teacher_id))
      .filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.chapter || '').toLowerCase().includes(query) ||
          (m.topic || '').toLowerCase().includes(query) ||
          (m.subject || '').toLowerCase().includes(query) ||
          (m.class_name || '').toLowerCase().includes(query)
      )
      .slice(0, 15)
      .forEach((m) => {
        results.push({
          id: m.id,
          title: m.title,
          subtitle: `Study Note • ${m.subject} (${m.class_name} - ${m.chapter})`,
          type: 'material',
        });
      });

    // Search assignments
    db.assignments
      .filter((a) => allowedIds.has(a.teacher_id))
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.subject || '').toLowerCase().includes(query) ||
          (a.class_name || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .forEach((a) => {
        results.push({
          id: a.id,
          title: a.title,
          subtitle: `Assignment • ${a.subject} (${a.class_name})`,
          type: 'assignment',
        });
      });

    // Search CBT tests
    db.tests
      .filter((t) => allowedIds.has(t.teacher_id))
      .filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.subject || '').toLowerCase().includes(query) ||
          (t.class_name || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: `CBT Test • ${t.subject} (${t.class_name})`,
          type: 'test',
        });
      });

    // Search announcements
    db.announcements
      .filter((a) => allowedIds.has(a.teacher_id))
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.message.toLowerCase().includes(query)
      )
      .slice(0, 8)
      .forEach((a) => {
        results.push({
          id: a.id,
          title: a.title,
          subtitle: `Announcement • ${a.priority || 'normal'}`,
          type: 'announcement',
        });
      });
  } else if (role === 'STUDENT') {
    const student = db.students.find(
      (s) =>
        s.user_id === req.user?.userId ||
        s.student_id === req.user?.studentId ||
        s.id === req.user?.studentDocId
    );
    if (!student) {
      res.json({ results: [] });
      return;
    }

    const academyTeachers = getAcademyTeacherIdsForStudent(student.teacher_id);
    const stuClassNorm = normalizeClassVal(student.class_name);

    // Search study materials within student's school & class
    db.materials
      .filter(
        (m) =>
          academyTeachers.has(m.teacher_id) &&
          (m.visibility === 'all' ||
            normalizeClassVal(m.class_name) === 'all classes' ||
            normalizeClassVal(m.class_name) === 'all' ||
            normalizeClassVal(m.class_name) === stuClassNorm ||
            (m.target_batch && student.batch && m.target_batch.trim().toLowerCase() === student.batch.trim().toLowerCase()))
      )
      .filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.chapter || '').toLowerCase().includes(query) ||
          (m.topic || '').toLowerCase().includes(query) ||
          (m.subject || '').toLowerCase().includes(query)
      )
      .slice(0, 15)
      .forEach((m) => {
        results.push({
          id: m.id,
          title: m.title,
          subtitle: `Study Note • ${m.subject} (${m.chapter})`,
          type: 'material',
        });
      });

    // Search assignments within student's school & class
    db.assignments
      .filter(
        (a) =>
          academyTeachers.has(a.teacher_id) &&
          (normalizeClassVal(a.class_name) === 'all classes' ||
            normalizeClassVal(a.class_name) === stuClassNorm)
      )
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.subject || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .forEach((a) => {
        results.push({
          id: a.id,
          title: a.title,
          subtitle: `Homework • ${a.subject}`,
          type: 'assignment',
        });
      });

    // Search published tests within student's school & class
    db.tests
      .filter(
        (t) =>
          academyTeachers.has(t.teacher_id) &&
          t.is_published &&
          (normalizeClassVal(t.class_name) === 'all classes' ||
            normalizeClassVal(t.class_name) === stuClassNorm)
      )
      .filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.subject || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: `Online Test • ${t.subject}`,
          type: 'test',
        });
      });

    // Search announcements within student's school
    db.announcements
      .filter(
        (a) =>
          academyTeachers.has(a.teacher_id) &&
          (a.target_type === 'all' ||
            (a.target_type === 'class' && normalizeClassVal(a.target_class) === stuClassNorm) ||
            (a.target_type === 'batch' && a.target_batch === student.batch))
      )
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.message.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .forEach((a) => {
        results.push({
          id: a.id,
          title: a.title,
          subtitle: 'Announcement',
          type: 'announcement',
        });
      });
  }

  res.json({ results });
});
