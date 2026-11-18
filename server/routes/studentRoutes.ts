import { Router, Response } from 'express';
import { getDB, saveDB } from '../db';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../auth';
import { AssignmentSubmission, TestResult } from '../../src/types';
import { sendAdminDataUpdate } from '../services/adminSyncService';

export const studentRouter = Router();

// Apply auth & student role check to all student routes
studentRouter.use(authenticateToken);
studentRouter.use(requireStudent);

// Helper to clean query parameters (guards against 'undefined', 'null', empty strings)
function cleanParam(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
}

function normalizeStr(val: unknown): string {
  return typeof val === 'string' ? val.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function isAllClasses(val: unknown): boolean {
  const n = normalizeStr(val);
  return n === 'all' || n === 'all classes' || n === 'all_classes';
}

function isClassMatch(itemClass: unknown, studentClass: unknown): boolean {
  if (!itemClass || isAllClasses(itemClass)) return true;
  return normalizeStr(itemClass) === normalizeStr(studentClass);
}

function isMaterialVisibleToStudent(m: any, student: any): boolean {
  if (m.visibility === 'specific' && Array.isArray(m.target_student_ids)) {
    return m.target_student_ids.includes(student.id);
  }
  if (m.visibility === 'batch' && m.target_batch) {
    return normalizeStr(m.target_batch) === normalizeStr(student.batch || student.batch_name);
  }
  if (m.visibility === 'all' || isAllClasses(m.class_name)) {
    return true;
  }
  return (
    isClassMatch(m.class_name, student.class_name) ||
    (!!m.target_batch && normalizeStr(m.target_batch) === normalizeStr(student.batch || student.batch_name))
  );
}

// Helper to get student record
function getStudentRecord(req: AuthenticatedRequest) {
  const db = getDB();
  return db.students.find(
    (s) =>
      s.user_id === req.user?.userId ||
      s.student_id === req.user?.studentId ||
      s.id === req.user?.studentDocId
  );
}

// Helper to get all faculty teacher IDs for a student's academy
function getStudentAcademyTeacherIds(studentTeacherId: string): Set<string> {
  const db = getDB();
  const directTeacher = db.teachers.find(
    (t) => t.id === studentTeacherId || t.academy_id === studentTeacherId
  );
  const academyId = directTeacher?.academy_id || studentTeacherId;
  const ids = new Set<string>();
  ids.add(studentTeacherId);
  ids.add(academyId);
  db.teachers.forEach((t) => {
    if ((t.academy_id || t.id) === academyId) {
      ids.add(t.id);
    }
  });
  return ids;
}

// 1. Student Dashboard Summary
studentRouter.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);

  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const today = new Date().toISOString().split('T')[0];

  // Today's attendance
  const todayAtt = db.attendance.find(
    (a) => a.student_id === student.id && a.date === today
  );

  // Overall attendance
  const allAtt = db.attendance.filter((a) => a.student_id === student.id);
  const presentDays = allAtt.filter((a) => a.status === 'present').length;
  const attendancePercentage =
    allAtt.length > 0 ? Math.round((presentDays / allAtt.length) * 100) : 0;

  // Assignments for this student's class across academy teachers
  const classAssignments = db.assignments.filter(
    (a) => academyTeachers.has(a.teacher_id) && isClassMatch(a.class_name, student.class_name)
  );
  const submissions = db.assignment_submissions.filter((s) => s.student_id === student.id);

  const pendingAssignments = classAssignments.filter(
    (a) => !submissions.some((s) => s.assignment_id === a.id)
  );

  // Tests
  const classTests = db.tests.filter(
    (t) => academyTeachers.has(t.teacher_id) && isClassMatch(t.class_name, student.class_name) && t.is_published
  );
  const testResults = db.test_results.filter((r) => r.student_id === student.id);
  const upcomingTests = classTests.filter(
    (t) => !testResults.some((r) => r.test_id === t.id)
  );

  // Recent materials
  const recentMaterials = db.materials
    .filter((m) => academyTeachers.has(m.teacher_id) && isMaterialVisibleToStudent(m, student))
    .slice(-6)
    .reverse();

  // Announcements
  const announcements = db.announcements
    .filter(
      (a) =>
        academyTeachers.has(a.teacher_id) &&
        (a.target_type === 'all' ||
          !a.target_type ||
          (a.target_type === 'class' && isClassMatch(a.target_class, student.class_name)) ||
          (a.target_type === 'batch' &&
            normalizeStr(a.target_batch) === normalizeStr(student.batch || student.batch_name)))
    )
    .slice(-4)
    .reverse();

  // Marks summary
  const studentMarks = db.marks.filter((m) => m.student_id === student.id);
  const avgMarks =
    studentMarks.length > 0
      ? Math.round(
          studentMarks.reduce((acc, curr) => acc + curr.percentage, 0) / studentMarks.length
        )
      : null;

  res.json({
    student,
    today_attendance: todayAtt ? todayAtt.status : 'not_marked',
    attendance_percentage: attendancePercentage,
    total_attendance_days: allAtt.length,
    present_days: presentDays,
    pending_assignments: pendingAssignments,
    upcoming_tests: upcomingTests,
    recent_materials: recentMaterials,
    recent_announcements: announcements,
    latest_marks: studentMarks.slice(-3).reverse(),
    average_performance: avgMarks,
  });
});

// 2. Study Materials & Notes
studentRouter.get('/materials', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const search = cleanParam(req.query.search);
  const subject = cleanParam(req.query.subject);
  const chapter = cleanParam(req.query.chapter);
  const bookmarkedOnly =
    cleanParam(req.query.bookmarked_only) === 'true' ||
    cleanParam(req.query.bookmarked) === 'true';

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);

  const materials = db.materials.filter(
    (m) => academyTeachers.has(m.teacher_id) && isMaterialVisibleToStudent(m, student)
  );

  // Student bookmarks
  const studentBookmarks = new Set(
    db.bookmarks.filter((b) => b.student_id === student.id).map((b) => b.material_id)
  );

  let enriched = materials.map((m) => ({
    ...m,
    is_bookmarked: studentBookmarks.has(m.id),
  }));

  if (bookmarkedOnly) {
    enriched = enriched.filter((m) => m.is_bookmarked);
  }

  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.chapter && m.chapter.toLowerCase().includes(q)) ||
        (m.topic && m.topic.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }

  if (subject && normalizeStr(subject) !== 'all' && normalizeStr(subject) !== 'all subjects') {
    const targetSub = normalizeStr(subject);
    enriched = enriched.filter((m) => normalizeStr(m.subject) === targetSub);
  }

  if (chapter) {
    const targetChap = normalizeStr(chapter);
    enriched = enriched.filter((m) => normalizeStr(m.chapter) === targetChap);
  }

  res.json(enriched.reverse());
});

// Bookmark Toggle
studentRouter.post('/materials/:id/bookmark', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const existingIdx = db.bookmarks.findIndex(
    (b) => b.student_id === student.id && b.material_id === id
  );

  const material = db.materials.find((m) => m.id === id);
  let isBookmarked = false;

  if (existingIdx >= 0) {
    db.bookmarks.splice(existingIdx, 1);
    if (material && material.bookmarks_count && material.bookmarks_count > 0) {
      material.bookmarks_count -= 1;
    }
    isBookmarked = false;
  } else {
    db.bookmarks.push({
      id: `bmk-${Date.now()}`,
      student_id: student.id,
      material_id: id,
      created_at: new Date().toISOString(),
    });
    if (material) {
      material.bookmarks_count = (material.bookmarks_count || 0) + 1;
    }
    isBookmarked = true;
  }

  saveDB();
  res.json({ is_bookmarked: isBookmarked });
});

// 3. Assignments & Homework
studentRouter.get('/assignments', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const classAssignments = db.assignments.filter(
    (a) => academyTeachers.has(a.teacher_id) && isClassMatch(a.class_name, student.class_name)
  );

  const submissions = db.assignment_submissions.filter((s) => s.student_id === student.id);

  const list = classAssignments.map((asg) => {
    const sub = submissions.find((s) => s.assignment_id === asg.id);
    const normalizedSub = sub
      ? {
          ...sub,
          marks_obtained: sub.marks_obtained ?? sub.marks,
        }
      : null;
    const isOverdue = new Date(asg.due_date).getTime() < Date.now() && !sub;

    return {
      ...asg,
      submission: normalizedSub,
      my_submission: normalizedSub,
      status: sub ? sub.status : isOverdue ? 'overdue' : 'pending',
    };
  });

  res.json(list.reverse());
});

// Submit Homework
studentRouter.post('/assignments/:id/submit', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content_text, file_url, file_name } = req.body;

  if (!content_text && !file_url) {
    res.status(400).json({ error: 'Please provide text solutions or an uploaded file.' });
    return;
  }

  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const assignment = db.assignments.find(
    (a) => a.id === id && academyTeachers.has(a.teacher_id)
  );
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found.' });
    return;
  }

  const existingSub = db.assignment_submissions.find(
    (s) => s.assignment_id === id && s.student_id === student.id
  );

  const isLate = new Date(assignment.due_date).getTime() < Date.now();

  if (existingSub) {
    existingSub.content_text = content_text || existingSub.content_text;
    existingSub.file_url = file_url || existingSub.file_url;
    existingSub.file_name = file_name || existingSub.file_name;
    existingSub.submitted_at = new Date().toISOString();
    existingSub.status = isLate ? 'late' : 'submitted';
  } else {
    const newSub: AssignmentSubmission = {
      id: `sub-${Date.now()}`,
      assignment_id: id,
      student_id: student.id,
      student_name: student.name,
      student_roll: student.roll_number,
      teacher_id: assignment.teacher_id,
      content_text: content_text || '',
      file_url: file_url || undefined,
      file_name: file_name || undefined,
      submitted_at: new Date().toISOString(),
      status: isLate ? 'late' : 'submitted',
    };
    db.assignment_submissions.push(newSub);
  }

  // Notify Teacher
  const teacher = db.teachers.find((t) => t.id === student.teacher_id);
  if (teacher) {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: teacher.user_id,
      title: 'New Student Submission',
      message: `${student.name} submitted assignment: "${assignment.title}".`,
      type: 'assignment',
      reference_id: assignment.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  saveDB();

  sendAdminDataUpdate('HOMEWORK_SUBMITTED', `Homework Submission: ${student.name} (#${student.roll_number}) submitted "${assignment.title}"`, {
    student_id: student.student_id,
    student_name: student.name,
    class_name: student.class_name,
    assignment_title: assignment.title,
    submitted_at: new Date().toISOString(),
    is_late: isLate,
  }).catch(() => {});

  res.status(201).json({ success: true, message: 'Assignment submitted successfully!' });
});

// 4. Online Tests & Quizzes
studentRouter.get('/tests', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const classTests = db.tests.filter(
    (t) =>
      academyTeachers.has(t.teacher_id) &&
      isClassMatch(t.class_name, student.class_name) &&
      t.is_published
  );

  const results = db.test_results.filter((r) => r.student_id === student.id);

  const list = classTests.map((t) => {
    const resItem = results.find((r) => r.test_id === t.id);
    const questionsCount = db.test_questions.filter((q) => q.test_id === t.id).length;

    return {
      ...t,
      questions_count: questionsCount,
      is_completed: !!resItem,
      result: resItem || null,
    };
  });

  res.json(list.reverse());
});

// Start / Take Test (Fetch questions with answers stripped for security)
studentRouter.get('/tests/:id/take', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const test = db.tests.find(
    (t) =>
      t.id === id &&
      academyTeachers.has(t.teacher_id) &&
      isClassMatch(t.class_name, student.class_name)
  );

  if (!test) {
    res.status(404).json({ error: 'Test not found or not assigned to your class.' });
    return;
  }

  // Check if already taken
  const existingResult = db.test_results.find(
    (r) => r.test_id === id && r.student_id === student.id
  );

  const questions = db.test_questions.filter((q) => q.test_id === id);

  // Strip correct answer if test not completed yet
  const safeQuestions = questions.map((q) => ({
    id: q.id,
    test_id: q.test_id,
    section: q.section,
    question_text: q.question_text,
    question_type: q.question_type,
    image_url: q.image_url,
    diagram_url: q.diagram_url,
    option_a: q.option_a,
    option_a_image: q.option_a_image,
    option_b: q.option_b,
    option_b_image: q.option_b_image,
    option_c: q.option_c,
    option_c_image: q.option_c_image,
    option_d: q.option_d,
    option_d_image: q.option_d_image,
    marks: q.marks,
    positive_marks: q.positive_marks ?? q.marks ?? 4,
    negative_marks: q.negative_marks ?? 0,
    // Only send correct_option and explanation if already completed
    correct_option: existingResult ? q.correct_option : undefined,
    explanation: existingResult ? q.explanation : undefined,
  }));

  res.json({
    test,
    questions: safeQuestions,
    existing_result: existingResult || null,
  });
});

// Submit Test Answers
studentRouter.post('/tests/:id/submit', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const rawPayload = req.body;

  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const test = db.tests.find(
    (t) =>
      t.id === id &&
      academyTeachers.has(t.teacher_id) &&
      isClassMatch(t.class_name, student.class_name)
  );
  if (!test) {
    res.status(404).json({ error: 'Test not found or access denied.' });
    return;
  }

  const existingResult = db.test_results.find(
    (r) => r.test_id === id && r.student_id === student.id
  );
  if (existingResult) {
    res.status(400).json({ error: 'You have already submitted this test.' });
    return;
  }

  // Normalize answer format (supports { answers: ... }, flat { qId: 'A' }, or array)
  const answerMap: Record<string, string> = {};
  const rawAnswers = rawPayload && typeof rawPayload === 'object' && 'answers' in rawPayload
    ? rawPayload.answers
    : rawPayload;

  if (Array.isArray(rawAnswers)) {
    rawAnswers.forEach((a: any) => {
      if (a?.question_id && a?.selected_option) {
        answerMap[a.question_id] = String(a.selected_option);
      }
    });
  } else if (rawAnswers && typeof rawAnswers === 'object') {
    Object.entries(rawAnswers).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) {
        answerMap[k] = v.trim();
      }
    });
  }

  const questions = db.test_questions.filter((q) => q.test_id === id);

  let marksObtained = 0;
  let totalMaxMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  const sectionScores: Record<string, { score: number; max: number; correct: number; total: number }> = {};

  questions.forEach((q, idx) => {
    const posMarks = Number(q.positive_marks ?? q.marks ?? 4);
    const negMarks = Number(q.negative_marks ?? 0);
    const secName = q.section || test.subject || 'General';
    if (!sectionScores[secName]) {
      sectionScores[secName] = { score: 0, max: 0, correct: 0, total: 0 };
    }
    sectionScores[secName].max += posMarks;
    sectionScores[secName].total += 1;
    totalMaxMarks += posMarks;

    const studentChoice = answerMap[q.id] || answerMap[String(idx)];
    if (!studentChoice) {
      unattemptedCount++;
    } else if (
      q.question_type === 'mcq' &&
      studentChoice.toUpperCase() === (q.correct_option || '').toUpperCase()
    ) {
      marksObtained += posMarks;
      correctCount++;
      sectionScores[secName].score += posMarks;
      sectionScores[secName].correct += 1;
    } else if (q.question_type === 'mcq') {
      marksObtained -= negMarks;
      incorrectCount++;
      sectionScores[secName].score -= negMarks;
    }
  });

  const safeMarks = Math.max(0, marksObtained);
  const percentage = totalMaxMarks > 0 ? Math.max(0, Math.round((safeMarks / totalMaxMarks) * 100)) : 0;
  const attemptedCount = questions.length - unattemptedCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  let grade = 'F';
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';

  const newResult: TestResult = {
    id: `res-${Date.now()}`,
    test_id: id,
    test_title: test.title,
    student_id: student.id,
    student_name: student.name,
    student_roll: student.roll_number,
    teacher_id: test.teacher_id,
    marks_obtained: safeMarks,
    score_obtained: safeMarks,
    max_marks: totalMaxMarks,
    total_marks: totalMaxMarks,
    percentage,
    grade,
    passed: percentage >= 40,
    total_attempted: attemptedCount,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    unattempted_count: unattemptedCount,
    accuracy,
    section_scores: sectionScores,
    student_answers: answerMap,
    status: 'graded',
    remarks:
      percentage >= 80
        ? 'Great performance!'
        : percentage >= 50
        ? 'Good effort, review incorrect questions.'
        : 'Needs revision.',
    attempted_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  db.test_results.push(newResult);

  // Compute rank within this test
  const allTestResults = db.test_results
    .filter((r) => r.test_id === id)
    .sort((a, b) => (b.marks_obtained ?? 0) - (a.marks_obtained ?? 0));
  const rank = allTestResults.findIndex((r) => r.id === newResult.id) + 1;
  newResult.rank = rank > 0 ? rank : 1;
  newResult.percentile =
    allTestResults.length > 1
      ? Math.round(((allTestResults.length - newResult.rank) / (allTestResults.length - 1)) * 100)
      : 100;

  // Notify Teacher
  const teacher = db.teachers.find((t) => t.id === student.teacher_id);
  if (teacher) {
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: teacher.user_id,
      title: 'Student Attempted Test',
      message: `${student.name} completed "${test.title}" (${safeMarks}/${totalMaxMarks} - ${grade}).`,
      type: 'test',
      reference_id: test.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  saveDB();

  sendAdminDataUpdate('TEST_COMPLETED', `Student Test Result: ${student.name} scored ${safeMarks}/${totalMaxMarks} (${percentage}% - ${grade}) on "${test.title}"`, {
    student_id: student.student_id,
    student_name: student.name,
    test_title: test.title,
    marks_obtained: safeMarks,
    max_marks: totalMaxMarks,
    percentage,
    grade,
    attempted_at: newResult.attempted_at,
  }).catch(() => {});

  // Return questions with answers revealed for immediate review scorecard
  const solutionQuestions = questions.map((q) => ({
    ...q,
    positive_marks: q.positive_marks ?? q.marks ?? 4,
    negative_marks: q.negative_marks ?? 0,
  }));

  res.status(201).json({
    result: newResult,
    questions: solutionQuestions,
    message: 'Test submitted and automatically evaluated!',
  });
});

// 5. Attendance (Student's own record view only)
studentRouter.get('/attendance', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const records = db.attendance
    .filter((a) => a.student_id === student.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = records.length;
  const present = records.filter((a) => a.status === 'present').length;
  const absent = records.filter((a) => a.status === 'absent').length;
  const late = records.filter((a) => a.status === 'late').length;
  const leave = records.filter((a) => a.status === 'leave').length;

  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  res.json({
    records,
    summary: {
      total_days: total,
      present,
      absent,
      late,
      leave,
      percentage,
    },
  });
});

// 6. Marks & Progress
studentRouter.get('/marks', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const marks = db.marks
    .filter((m) => m.student_id === student.id)
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  const testResults = db.test_results
    .filter((r) => r.student_id === student.id)
    .sort((a, b) => new Date(b.attempted_at || b.completed_at || '').getTime() - new Date(a.attempted_at || a.completed_at || '').getTime());

  const avgPercentage =
    marks.length > 0
      ? Math.round(marks.reduce((acc, curr) => acc + curr.percentage, 0) / marks.length)
      : null;

  res.json({
    academic_marks: marks,
    test_results: testResults,
    overall_percentage: avgPercentage,
  });
});

// 7. Announcements
studentRouter.get('/announcements', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const academyTeachers = getStudentAcademyTeacherIds(student.teacher_id);
  const announcements = db.announcements.filter(
    (a) =>
      academyTeachers.has(a.teacher_id) &&
      (a.target_type === 'all' ||
        !a.target_type ||
        (a.target_type === 'class' && isClassMatch(a.target_class, student.class_name)) ||
        (a.target_type === 'batch' &&
          normalizeStr(a.target_batch) === normalizeStr(student.batch || student.batch_name)))
  );

  res.json(announcements.reverse());
});

function getStudentSchoolBranding(student: ReturnType<typeof getStudentRecord>) {
  const db = getDB();
  if (!student) {
    return {
      academyName: 'Academiq Campus',
      academyCode: '',
      academyLogo: '',
      teacher: null,
    };
  }
  const directTeacher = db.teachers.find(
    (t) => t.id === student.teacher_id || t.academy_id === student.teacher_id
  );
  const academyId = directTeacher?.academy_id || directTeacher?.id || student.teacher_id;
  const peers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
  const owner =
    peers.find((t) => t.id === academyId) ||
    peers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    directTeacher;

  return {
    academyName:
      owner?.academy_name ||
      owner?.institution ||
      student.academy_name ||
      directTeacher?.academy_name ||
      directTeacher?.institution ||
      'Academiq Campus',
    academyCode: owner?.academy_code || student.academy_code || directTeacher?.academy_code || '',
    academyLogo:
      owner?.academy_logo ||
      peers.find((t) => !!t.academy_logo)?.academy_logo ||
      student.academy_logo ||
      directTeacher?.academy_logo ||
      '',
    teacher: directTeacher || owner || null,
  };
}

// 8. Profile & Allowed Updates
studentRouter.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const user = db.users.find((u) => u.id === student.user_id);
  const branding = getStudentSchoolBranding(student);
  const teacher = branding.teacher;

  const enrichedStudent = {
    ...student,
    phone: student.phone || user?.phone || '',
    profile_photo: student.profile_photo || user?.profile_photo || '',
    academy_name: branding.academyName,
    academy_code: branding.academyCode,
    academy_logo: branding.academyLogo,
  };

  res.json({
    student: enrichedStudent,
    teacher: teacher ? { name: teacher.name, email: teacher.email, subject: teacher.subject } : null,
    account: user ? { email: user.email, name: user.name, phone: user.phone, profile_photo: user.profile_photo } : null,
  });
});

studentRouter.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  const {
    phone,
    parent_phone,
    address,
    profile_photo,
    dob,
    emergency_contact,
    blood_group,
    bio,
  } = req.body;
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  if (phone !== undefined) student.phone = String(phone).trim();
  if (parent_phone !== undefined) student.parent_phone = String(parent_phone).trim();
  if (address !== undefined) student.address = String(address).trim();
  if (profile_photo !== undefined) student.profile_photo = String(profile_photo).trim();
  if (dob !== undefined) student.dob = String(dob).trim();
  if (emergency_contact !== undefined) student.emergency_contact = String(emergency_contact).trim();
  if (blood_group !== undefined) student.blood_group = String(blood_group).trim();
  if (bio !== undefined) student.bio = String(bio).trim();

  const user = db.users.find((u) => u.id === student.user_id);
  if (user) {
    if (phone !== undefined) user.phone = student.phone;
    if (profile_photo !== undefined) user.profile_photo = student.profile_photo;
    user.updated_at = new Date().toISOString();
  }

  const branding = getStudentSchoolBranding(student);
  const enrichedStudent = {
    ...student,
    academy_name: branding.academyName,
    academy_code: branding.academyCode,
    academy_logo: branding.academyLogo,
  };

  saveDB();
  const { password_hash, ...safeUser } = user || {};
  res.json({ student: enrichedStudent, user: safeUser, message: 'Profile updated successfully.' });
});

// 9. Student School / Tuition Public Directory (Strictly Filtered by Admin Settings)
const STUDENT_FIELD_LABELS: Record<string, string> = {
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

studentRouter.get('/school-profile', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const student = getStudentRecord(req);
  if (!student) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }

  const branding = getStudentSchoolBranding(student);
  const directTeacher = branding.teacher;
  const academyId = directTeacher?.academy_id || directTeacher?.id || student.teacher_id;
  const peers = db.teachers.filter((t) => (t.academy_id || t.id) === academyId);
  const owner =
    peers.find((t) => t.id === academyId) ||
    peers.find((t) => t.role_in_academy === 'HEAD_TEACHER') ||
    directTeacher;

  const sp = owner?.school_profile || peers.find((t) => !!t.school_profile)?.school_profile;
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

  const visibleExtras = allowedKeys
    .filter((key) => Boolean(STUDENT_FIELD_LABELS[key]) && Boolean(fullValues[key]))
    .map((key) => ({
      key,
      label: STUDENT_FIELD_LABELS[key],
      value: fullValues[key],
    }));

  res.json({
    school_profile: {
      academy_name: branding.academyName,
      academy_logo: branding.academyLogo,
      principal_name: sp?.principal_name || '',
      vice_principal_name: sp?.vice_principal_name || '',
      visible_extras: visibleExtras,
    },
  });
});

