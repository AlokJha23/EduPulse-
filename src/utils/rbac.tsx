import React from 'react';
import { Role } from '../types';

export type Permission =
  // Teacher Administrative Permissions
  | 'MANAGE_STUDENTS'
  | 'MANAGE_CLASSES'
  | 'TAKE_ATTENDANCE'
  | 'MANAGE_NOTES'
  | 'MANAGE_ASSIGNMENTS'
  | 'GRADE_ASSIGNMENTS'
  | 'MANAGE_TESTS'
  | 'MANAGE_MARKS'
  | 'BROADCAST_ANNOUNCEMENTS'
  | 'VIEW_MASTER_REPORTS'
  | 'MANAGE_FACULTY_HUB'
  // Student Learning Permissions
  | 'STUDENT_VIEW_NOTES'
  | 'STUDENT_SUBMIT_ASSIGNMENT'
  | 'STUDENT_TAKE_TEST'
  | 'STUDENT_VIEW_ATTENDANCE'
  | 'STUDENT_VIEW_MARKS'
  | 'STUDENT_VIEW_ANNOUNCEMENTS'
  | 'STUDENT_ASK_DOUBTS';

export type CanonicalRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

export const ROLE_PERMISSIONS: Record<CanonicalRole, Permission[]> = {
  TEACHER: [
    'MANAGE_STUDENTS',
    'MANAGE_CLASSES',
    'TAKE_ATTENDANCE',
    'MANAGE_NOTES',
    'MANAGE_ASSIGNMENTS',
    'GRADE_ASSIGNMENTS',
    'MANAGE_TESTS',
    'MANAGE_MARKS',
    'BROADCAST_ANNOUNCEMENTS',
    'VIEW_MASTER_REPORTS',
    'MANAGE_FACULTY_HUB',
  ],
  ADMIN: [
    'MANAGE_STUDENTS',
    'MANAGE_CLASSES',
    'TAKE_ATTENDANCE',
    'MANAGE_NOTES',
    'MANAGE_ASSIGNMENTS',
    'GRADE_ASSIGNMENTS',
    'MANAGE_TESTS',
    'MANAGE_MARKS',
    'BROADCAST_ANNOUNCEMENTS',
    'VIEW_MASTER_REPORTS',
    'MANAGE_FACULTY_HUB',
  ],
  STUDENT: [
    'STUDENT_VIEW_NOTES',
    'STUDENT_SUBMIT_ASSIGNMENT',
    'STUDENT_TAKE_TEST',
    'STUDENT_VIEW_ATTENDANCE',
    'STUDENT_VIEW_MARKS',
    'STUDENT_VIEW_ANNOUNCEMENTS',
    'STUDENT_ASK_DOUBTS',
  ],
};

export const TEACHER_ALLOWED_VIEWS: readonly string[] = [
  'dashboard',
  'students',
  'classes',
  'attendance',
  'notes',
  'doubts',
  'assignments',
  'tests',
  'marks',
  'announcements',
  'reports',
  'staff',
  'school-profile',
  'profile',
];

export const STUDENT_ALLOWED_VIEWS: readonly string[] = [
  'dashboard',
  'notes',
  'doubts',
  'assignments',
  'tests',
  'attendance',
  'marks',
  'announcements',
  'school-profile',
  'profile',
];

/**
 * Normalizes role string to canonical uppercase Role
 */
export function normalizeRole(rawRole?: string | null): CanonicalRole {
  if (!rawRole) return 'STUDENT';
  const upper = rawRole.toUpperCase();
  if (upper === 'TEACHER' || upper === 'ADMIN') return 'TEACHER';
  return 'STUDENT';
}

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(rawRole?: string | null, permission?: Permission): boolean {
  if (!rawRole || !permission) return false;
  const role = normalizeRole(rawRole);
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks whether a navigation view is allowed for the user's role
 */
export function isViewAllowedForRole(rawRole?: string | null, view?: string): boolean {
  if (!rawRole || !view) return false;
  const role = normalizeRole(rawRole);
  if (role === 'TEACHER') {
    return TEACHER_ALLOWED_VIEWS.includes(view);
  }
  return STUDENT_ALLOWED_VIEWS.includes(view);
}

interface RBACGuardProps {
  role?: string | null;
  permission?: Permission;
  requiredRole?: 'TEACHER' | 'STUDENT' | 'ADMIN';
  allowedViews?: string[];
  currentView?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * React Component for declarative RBAC UI element protection
 */
export const RBACGuard: React.FC<RBACGuardProps> = ({
  role,
  permission,
  requiredRole,
  allowedViews,
  currentView,
  fallback = null,
  children,
}) => {
  const normRole = normalizeRole(role);

  if (requiredRole && normRole !== requiredRole) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(normRole, permission)) {
    return <>{fallback}</>;
  }

  if (allowedViews && currentView && !allowedViews.includes(currentView)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
