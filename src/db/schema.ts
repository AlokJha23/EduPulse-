import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  role: text('role').notNull().default('TEACHER'), // TEACHER or STUDENT
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  profilePhoto: text('profile_photo'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Teachers Profile Table
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(), // Firebase UID
  teacherId: text('teacher_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  institution: text('institution'),
  bio: text('bio'),
  profilePhoto: text('profile_photo'),
  classesTaught: text('classes_taught'), // JSON string array
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Students Table (Isolated by teacher_uid)
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  userUid: text('user_uid'), // Firebase UID if student has logged in
  teacherUid: text('teacher_uid').notNull(), // Owner teacher Firebase UID
  studentId: text('student_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  grade: text('grade'),
  section: text('section'),
  rollNumber: text('roll_number'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  guardianEmail: text('guardian_email'),
  address: text('address'),
  tempPassword: text('temp_password'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Classes Table
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  name: text('name').notNull(),
  section: text('section'),
  subject: text('subject'),
  batch: text('batch'),
  academicYear: text('academic_year'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Attendance Records Table
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  studentId: text('student_id').notNull(),
  classId: text('class_id'),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull(), // present | absent | late
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Study Materials Table
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  classGrade: text('class_grade').notNull(),
  chapter: text('chapter'),
  topic: text('topic'),
  description: text('description'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileType: text('file_type'),
  fileSize: text('file_size'),
  isPublished: boolean('is_published').default(true),
  downloadsCount: integer('downloads_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Assignments Table
export const assignments = pgTable('assignments', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  classGrade: text('class_grade').notNull(),
  description: text('description'),
  dueDate: text('due_date'),
  totalMarks: integer('total_marks').default(100),
  attachments: text('attachments'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Assignment Submissions
export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  assignmentId: text('assignment_id').notNull(),
  studentId: text('student_id').notNull(),
  fileUrl: text('file_url'),
  remarks: text('remarks'),
  obtainedMarks: integer('obtained_marks'),
  feedback: text('feedback'),
  status: text('status').default('submitted'),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// 9. Tests Table
export const tests = pgTable('tests', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  classGrade: text('class_grade').notNull(),
  durationMinutes: integer('duration_minutes').default(30),
  totalMarks: integer('total_marks').default(100),
  scheduleDate: text('schedule_date'),
  isPublished: boolean('is_published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Test Questions Table
export const testQuestions = pgTable('test_questions', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  teacherUid: text('teacher_uid').notNull(),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON string array of options
  correctAnswer: integer('correct_answer').notNull(), // index 0..3
  marks: integer('marks').default(1),
});

// 11. Test Results Table
export const testResults = pgTable('test_results', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  teacherUid: text('teacher_uid').notNull(),
  studentId: text('student_id').notNull(),
  score: integer('score').notNull(),
  totalMarks: integer('total_marks').notNull(),
  percentage: integer('percentage').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  answers: text('answers'),
  completedAt: timestamp('completed_at').defaultNow(),
});

// 12. Marks / Academic Records Table
export const marks = pgTable('marks', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  studentId: text('student_id').notNull(),
  examName: text('exam_name').notNull(),
  subject: text('subject').notNull(),
  totalMarks: integer('total_marks').notNull(),
  obtainedMarks: integer('obtained_marks').notNull(),
  percentage: integer('percentage').notNull(),
  grade: text('grade').notNull(),
  remarks: text('remarks'),
  academicYear: text('academic_year'),
  term: text('term'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Announcements Table
export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  teacherUid: text('teacher_uid').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  targetClass: text('target_class').notNull(),
  priority: text('priority').default('normal'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
