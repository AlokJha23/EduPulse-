export const ALL_CLASSES = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
] as const;

export type AcademicClass = (typeof ALL_CLASSES)[number];

export const STANDARD_SECTIONS = ['A', 'B', 'C', 'D'] as const;

export const DEFAULT_SUBJECT = 'All Subjects';

export const COMMON_SUBJECTS = [
  'All Subjects',
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Hindi',
  'Social Studies',
  'History & Civics',
  'Geography',
  'Computer Science',
  'Economics',
  'Accountancy',
  'Business Studies',
  'Environmental Studies',
];
