import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, TeacherProfile, StudentProfile, Role } from '../types';
import { api } from '../services/api';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  teacher: TeacherProfile | null;
  student: StudentProfile | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  unreadNotifsCount: number;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (payload: {
    email: string;
    pass: string;
    name: string;
    subject?: string;
    institution?: string;
  }) => Promise<void>;
  loginTeacher: (identifier: string, pass: string) => Promise<void>;
  signupTeacher: (payload: any) => Promise<void>;
  loginStudent: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (payload: { current_password?: string; new_password: string; confirm_password?: string }) => Promise<void>;
  refreshAuth: () => Promise<void>;
  setMustChangePassword: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('edupulse_token');
    if (!token) {
      setUser(null);
      setTeacher(null);
      setStudent(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setTeacher(data.teacher || null);
      setStudent(data.student || null);
      setMustChangePassword(!!data.must_change_password);
      setUnreadNotifsCount(data.unreadNotifications || 0);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem('edupulse_token');
      setUser(null);
      setTeacher(null);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('edupulse_token', idToken);
          const data = await api.getMe();
          setUser(data.user);
          setTeacher(data.teacher || null);
          setStudent(data.student || null);
          setMustChangePassword(!!data.must_change_password);
          setUnreadNotifsCount(data.unreadNotifications || 0);
        } catch (err) {
          console.warn('Error fetching profile with Firebase token:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If not logged in via Firebase, check if custom token exists (e.g. student session)
        refreshAuth();
      }
    });

    return () => unsubscribe();
  }, [refreshAuth]);

  // 1. Google Sign-In (Firebase Auth)
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      localStorage.setItem('edupulse_token', token);
      const data = await api.getMe();
      setUser(data.user);
      setTeacher(data.teacher || null);
      setStudent(data.student || null);
      setMustChangePassword(false);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email & Password Sign-In (Firebase Auth with database fallback)
  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const token = await cred.user.getIdToken();
      localStorage.setItem('edupulse_token', token);
      const data = await api.getMe();
      setUser(data.user);
      setTeacher(data.teacher || null);
      setStudent(data.student || null);
      setMustChangePassword(false);
    } catch (firebaseErr: any) {
      // If user was created via traditional credentials, fallback to teacher login API
      console.info('Trying database credentials fallback for teacher login...');
      try {
        const res = await api.teacherLogin(email, pass);
        localStorage.setItem('edupulse_token', res.token);
        setUser(res.user);
        setTeacher(res.teacher || null);
        setStudent(null);
        setMustChangePassword(!!res.must_change_password);
      } catch (dbErr) {
        throw firebaseErr;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Email & Password Sign-Up (Firebase Auth + Cloud SQL Teacher Record)
  const signupWithEmail = async (payload: {
    email: string;
    pass: string;
    name: string;
    subject?: string;
    institution?: string;
  }) => {
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.pass);
      if (payload.name && cred.user) {
        await updateProfile(cred.user, { displayName: payload.name });
      }
      const token = await cred.user.getIdToken();
      localStorage.setItem('edupulse_token', token);

      // Register profile details on backend
      const data = await api.getMe();
      setUser(data.user);
      setTeacher(data.teacher || null);
      setStudent(null);
      setMustChangePassword(false);
    } catch (firebaseErr: any) {
      console.info('Firebase signup note, trying backend registration fallback...', firebaseErr);
      try {
        const res = await api.teacherSignup({
          teacher_id: payload.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''),
          name: payload.name,
          email: payload.email,
          password: payload.pass,
          confirm_password: payload.pass,
          subject: payload.subject || 'General Academics',
          institution: payload.institution || 'Academiq Academy',
        });
        localStorage.setItem('edupulse_token', res.token);
        setUser(res.user);
        setTeacher(res.teacher || null);
        setStudent(null);
        setMustChangePassword(false);
      } catch (dbErr) {
        throw firebaseErr;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginTeacher = async (identifier: string, pass: string) => {
    // If identifier is an email, try Firebase first
    if (identifier.includes('@')) {
      return loginWithEmail(identifier, pass);
    }
    const res = await api.teacherLogin(identifier, pass);
    localStorage.setItem('edupulse_token', res.token);
    setUser(res.user);
    setTeacher(res.teacher || null);
    setStudent(null);
    setMustChangePassword(!!res.must_change_password);
  };

  const signupTeacher = async (payload: any) => {
    if (!payload.faculty_passcode) {
      throw new Error('Security Gate: Faculty Authorization Passcode is required to register as a Teacher.');
    }
    await api.verifyTeacherPasscode(payload.faculty_passcode);

    const res = await api.teacherSignup(payload);
    localStorage.setItem('edupulse_token', res.token);
    setUser(res.user);
    setTeacher(res.teacher || null);
    setStudent(null);
    setMustChangePassword(false);
  };

  const loginStudent = async (identifier: string, pass: string) => {
    const res = await api.studentLogin(identifier, pass);
    localStorage.setItem('edupulse_token', res.token);
    setUser(res.user);
    setStudent(res.student || null);
    setTeacher(null);
    setMustChangePassword(!!res.must_change_password);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('edupulse_token');
    setUser(null);
    setTeacher(null);
    setStudent(null);
    setMustChangePassword(false);
  };

  const changePassword = async (payload: {
    current_password?: string;
    new_password: string;
    confirm_password?: string;
  }) => {
    await api.changePassword(payload);
    setMustChangePassword(false);
    if (user) {
      setUser({ ...user, must_change_password: false });
    }
  };

  const role = user ? user.role : null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        teacher,
        student,
        role,
        isAuthenticated,
        isLoading,
        mustChangePassword,
        unreadNotifsCount,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        loginTeacher,
        signupTeacher,
        loginStudent,
        logout,
        changePassword,
        refreshAuth,
        setMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

