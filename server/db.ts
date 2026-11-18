import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
  TestQuestion,
  TestResult,
  AcademicMarkEntry,
  Announcement,
  NotificationItem,
  FacultyMemo,
} from '../src/types';

interface DatabaseSchema {
  users: User[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  classes: ClassGroup[];
  attendance: AttendanceRecord[];
  materials: StudyMaterial[];
  assignments: Assignment[];
  assignment_submissions: AssignmentSubmission[];
  tests: Test[];
  test_questions: TestQuestion[];
  test_results: TestResult[];
  marks: AcademicMarkEntry[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  faculty_memos: FacultyMemo[];
  bookmarks: { id: string; student_id: string; material_id: string; created_at: string }[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// In-memory cache
let db: DatabaseSchema = {
  users: [],
  teachers: [],
  students: [],
  classes: [],
  attendance: [],
  materials: [],
  assignments: [],
  assignment_submissions: [],
  tests: [],
  test_questions: [],
  test_results: [],
  marks: [],
  announcements: [],
  notifications: [],
  faculty_memos: [],
  bookmarks: [],
};

// Ensure data folder exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Save database to disk atomically
export function saveDB() {
  try {
    ensureDataDir();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Initialize clean empty database
function seedInitialData() {
  db = {
    users: [],
    teachers: [],
    students: [],
    classes: [],
    attendance: [],
    materials: [],
    assignments: [],
    assignment_submissions: [],
    tests: [],
    test_questions: [],
    test_results: [],
    marks: [],
    announcements: [],
    notifications: [],
    faculty_memos: [],
    bookmarks: [],
  };

  saveDB();
  console.log('Database initialized with clean schema.');
}

// Load DB from file or seed
export function initDB() {
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      console.log('Database successfully loaded from file.');
    } catch (err) {
      console.error('Failed to parse database file. Re-seeding...', err);
      seedInitialData();
    }
  } else {
    seedInitialData();
  }
}

// Export database accessors
export function getDB(): DatabaseSchema {
  return db;
}
