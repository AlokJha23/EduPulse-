export type Role = 'TEACHER' | 'STUDENT' | 'ADMIN' | 'teacher' | 'student' | 'admin';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  profile_photo?: string;
  must_change_password?: boolean;
  force_password_change?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TeacherProfile {
  id: string;
  user_id: string;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  institution: string;
  classes_taught: string[];
  bio?: string;
  profile_photo?: string;
  // Collaborative Academy & Staff features
  academy_id?: string;
  academy_name?: string;
  academy_code?: string;
  academy_logo?: string;
  school_profile?: SchoolProfileDetails;
  role_in_academy?: 'HEAD_TEACHER' | 'CO_TEACHER' | 'FACULTY';
  active_workspace_mode?: 'academy' | 'personal';
  assigned_subjects?: string[];
  assigned_classes?: string[];
  is_owner?: boolean;
  joined_at?: string;
  invited_by?: string;
}

export type StudentVisibleSchoolField =
  | 'institute_type'
  | 'board'
  | 'tagline'
  | 'timings'
  | 'contact_phone'
  | 'contact_email'
  | 'address'
  | 'website'
  | 'established_year'
  | 'about';

export interface SchoolProfileDetails {
  academy_id?: string;
  academy_name: string;
  academy_code?: string;
  academy_logo?: string;
  institute_type?: string;
  board?: string;
  principal_name?: string;
  vice_principal_name?: string;
  tagline?: string;
  affiliation_number?: string;
  established_year?: string;
  timings?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  address?: string;
  city_state?: string;
  about?: string;
  student_visible_fields?: StudentVisibleSchoolField[];
  updated_at?: string;
}

export interface FacultyMemo {
  id: string;
  academy_id: string;
  author_teacher_id: string;
  author_name: string;
  author_subject?: string;
  author_role: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'important';
  target_class?: string;
  created_at: string;
}

export interface AcademyWorkspace {
  id: string;
  name: string;
  code: string;
  logo?: string;
  academy_logo?: string;
  owner_name: string;
  owner_email: string;
  is_owner: boolean;
  role_in_academy: 'HEAD_TEACHER' | 'CO_TEACHER' | 'FACULTY';
  active_workspace_mode: 'academy' | 'personal';
  total_faculty: number;
  total_students: number;
  total_classes: number;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  teacher_id: string;
  student_id: string;
  roll_number: string;
  name: string;
  email: string;
  phone?: string;
  class_name: string;
  section: string;
  batch?: string;
  batch_name?: string;
  parent_name: string;
  parent_phone: string;
  dob?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  bio?: string;
  profile_photo?: string;
  is_active: boolean;
  created_at: string;
  academy_name?: string;
  academy_code?: string;
  academy_logo?: string;
}

export interface ClassGroup {
  id: string;
  teacher_id: string;
  name: string; // e.g. "Class 10"
  section?: string;
  sections?: string[];
  subject?: string;
  subjects?: string[];
  batch?: string;
  batches?: string[];
  academic_year: string;
  description?: string;
  student_count?: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  teacher_id: string;
  class_name: string;
  section: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
  created_at: string;
}

export type MaterialType =
  | 'notes'
  | 'pdf'
  | 'formula_sheet'
  | 'sample_paper'
  | 'slides'
  | 'image'
  | 'doc'
  | 'link'
  | 'video'
  | 'text'
  | 'revision'
  | 'worksheet';

export type MaterialVisibility = 'all' | 'class' | 'batch' | 'selected';

export interface MaterialAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'video' | 'doc' | 'slides' | 'link' | 'other';
  size?: string;
  dataUrl?: string;
}

export interface StudyMaterial {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  author_teacher_id?: string;
  author_teacher_name?: string;
  author_subject?: string;
  author_role?: string;
  title: string;
  description?: string;
  subject: string;
  class_name: string;
  chapter: string;
  topic?: string;
  material_type: string;
  file_url?: string;
  file_name?: string;
  file_size?: string;
  content_text?: string;
  attachments?: MaterialAttachment[];
  preview_images?: string[];
  external_url?: string;
  visibility?: MaterialVisibility;
  target_batch?: string;
  target_student_ids?: string[];
  allow_download: boolean;
  bookmarks_count?: number;
  is_bookmarked?: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  author_teacher_id?: string;
  author_teacher_name?: string;
  author_subject?: string;
  author_role?: string;
  title: string;
  description?: string;
  instructions?: string;
  subject: string;
  chapter?: string;
  class_name: string;
  section?: string;
  batch?: string;
  due_date: string; // ISO string or YYYY-MM-DD
  max_marks: number;
  attachments?: { name: string; url: string; size?: string }[];
  target_student_ids?: string[];
  submissions_count?: number;
  total_students?: number;
  created_at: string;
  my_submission?: {
    id: string;
    submitted_at: string;
    content_text?: string;
    file_name?: string;
    status: 'submitted' | 'graded';
    marks_obtained?: number;
    marks?: number;
    feedback?: string;
  };
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name?: string;
  student_roll?: string;
  teacher_id: string;
  content_text?: string;
  file_url?: string;
  file_name?: string;
  submitted_at: string;
  marks_obtained?: number;
  marks?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned' | 'late';
  graded_at?: string;
}

export interface TestQuestion {
  id?: string;
  test_id?: string;
  section?: string; // e.g. "Physics", "Chemistry", "Mathematics" or "Section A", "Section B"
  question_text: string;
  question_type: 'mcq' | 'numerical' | 'written' | string;
  image_url?: string;
  diagram_url?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_a_image?: string;
  option_b_image?: string;
  option_c_image?: string;
  option_d_image?: string;
  correct_option?: 'A' | 'B' | 'C' | 'D' | string;
  options?: string[];
  correct_answer?: string;
  marks: number;
  positive_marks?: number; // e.g. +4
  negative_marks?: number; // e.g. -1
  explanation?: string;
  solution_image?: string;
}

export interface Test {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  author_teacher_id?: string;
  author_teacher_name?: string;
  author_subject?: string;
  author_role?: string;
  title: string;
  subject: string;
  test_type?: 'mcq' | 'written' | 'cbt';
  class_name: string;
  section?: string;
  sections?: string[]; // e.g. ["Physics", "Chemistry", "Mathematics"]
  chapter?: string;
  batch?: string;
  duration_minutes: number;
  total_marks?: number;
  max_marks?: number;
  instructions?: string;
  questions?: TestQuestion[];
  is_published: boolean;
  start_date?: string;
  due_date?: string;
  submissions_count?: number;
  total_students?: number;
  created_at: string;
  my_result?: TestResult;
}

export interface TestResult {
  id: string;
  test_id: string;
  test_title?: string;
  student_id: string;
  student_name?: string;
  student_roll?: string;
  teacher_id: string;
  score_obtained?: number;
  total_marks?: number;
  marks_obtained?: number;
  max_marks?: number;
  percentage: number;
  passed?: boolean;
  grade?: string;
  rank?: number;
  percentile?: number;
  total_attempted?: number;
  correct_count?: number;
  incorrect_count?: number;
  unattempted_count?: number;
  accuracy?: number;
  time_spent_seconds?: number;
  section_scores?: Record<string, { score: number; max: number; correct: number; total: number }>;
  student_answers?: any;
  status?: 'submitted' | 'graded';
  remarks?: string;
  completed_at?: string;
  attempted_at?: string;
}

export interface AcademicMarkEntry {
  id: string;
  student_id: string;
  student_name?: string;
  student_roll?: string;
  teacher_id: string;
  class_name?: string;
  subject: string;
  exam_name: string;
  max_marks: number;
  marks_obtained?: number;
  obtained_marks?: number;
  percentage: number;
  grade: string;
  remarks?: string;
  exam_date?: string;
  created_at: string;
}

export interface AnnouncementAttachment {
  name: string;
  url: string;
  type: 'video' | 'image' | 'pdf' | 'document' | 'other';
  size?: string;
  dataUrl?: string;
}

export interface Announcement {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  video_url?: string;
  video_title?: string;
  attachments?: AnnouncementAttachment[];
  images?: string[];
  target_type: 'all' | 'class' | 'batch' | 'students' | string;
  target_value?: string;
  target_class?: string;
  target_batch?: string;
  target_student_ids?: string[];
  created_at: string;
}

export interface DoubtAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'document' | 'other';
  size?: string;
  dataUrl?: string;
}

export interface DoubtReply {
  id: string;
  doubt_id: string;
  author_id: string;
  author_name: string;
  author_role: 'TEACHER' | 'STUDENT' | 'teacher' | 'student';
  author_photo?: string;
  content: string;
  attachments?: DoubtAttachment[];
  is_solution?: boolean;
  created_at: string;
}

export interface Doubt {
  id: string;
  student_id: string;
  student_name: string;
  student_roll?: string;
  student_class?: string;
  student_section?: string;
  student_photo?: string;
  subject: string;
  chapter?: string;
  topic?: string;
  title: string;
  description: string;
  attachments?: DoubtAttachment[];
  status: 'open' | 'in_progress' | 'resolved';
  priority?: 'normal' | 'urgent';
  upvotes?: number;
  upvoted_by?: string[];
  replies?: DoubtReply[];
  created_at: string;
  updated_at?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'assignment' | 'material' | 'test' | 'announcement' | 'marks' | 'attendance' | 'doubt';
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  teacher?: TeacherProfile;
  student?: StudentProfile;
  must_change_password?: boolean;
}

export interface StudentCredentialsPayload {
  student_id: string;
  temporary_password?: string;
  name: string;
  roll_number: string;
  class_name: string;
  section: string;
}

export interface DashboardStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  pending_assignments: number;
  upcoming_tests: number;
  recent_submissions: number;
  average_class_performance: number;
  total_materials: number;
  total_classes: number;
}
