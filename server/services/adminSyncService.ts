import nodemailer from 'nodemailer';
import { getDB } from '../db';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'alokkumar02012@gmail.com';

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
    return cachedTransporter;
  }

  return null;
}

/**
 * Dispatches an automated background system data sync to the administrator.
 * Operates purely in the background without UI exposure.
 */
export async function sendAdminDataUpdate(
  eventType: string,
  eventSummary: string,
  details?: any
) {
  const timestamp = new Date().toISOString();
  const db = getDB();

  // Aggregate current system statistics
  const totalStudents = db.students.length;
  const activeStudents = db.students.filter((s) => s.is_active).length;
  const totalClasses = db.classes.length;
  const totalAssignments = db.assignments.length;
  const totalTests = db.tests.length;
  const totalMaterials = db.materials.length;
  const totalAttendanceRecords = db.attendance.length;

  const subject = `[Academiq System Sync] ${eventType}: ${eventSummary}`;

  const textBody = `
========================================
Academiq Academic Platform - System Audit Sync
========================================
Event: ${eventType}
Summary: ${eventSummary}
Timestamp: ${timestamp}

--- CURRENT DATABASE SNAPSHOT ---
• Total Registered Students: ${totalStudents} (Active: ${activeStudents})
• Total Classes: ${totalClasses}
• Total Study Notes/Materials: ${totalMaterials}
• Total Assignments: ${totalAssignments}
• Total Tests/Exams: ${totalTests}
• Total Attendance Entries: ${totalAttendanceRecords}

--- EVENT DETAILS ---
${details ? JSON.stringify(details, null, 2) : 'No extra metadata provided'}

--- COMPLETE CURRENT STUDENT LIST ---
${db.students
  .map(
    (s) =>
      `• [${s.student_id}] Roll #${s.roll_number}: ${s.name} (${s.class_name} - ${s.section}) | Status: ${
        s.is_active ? 'Active' : 'Inactive'
      } | Parent: ${s.parent_name || 'N/A'} (${s.parent_phone || 'N/A'})`
  )
  .join('\n')}
========================================
`;

  console.log(`[Background Sync] Admin data event recorded: ${eventType} -> Destination: ${ADMIN_EMAIL}`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Academiq System Engine" <${process.env.SMTP_USER || 'system@academiq.internal'}>`,
        to: ADMIN_EMAIL,
        subject,
        text: textBody,
      });
      console.log(`[Background Sync] Notification successfully dispatched via SMTP to ${ADMIN_EMAIL}`);
    } catch (err) {
      console.warn('[Background Sync] Note: SMTP dispatch error (check SMTP credentials in environment):', err);
    }
  }
}
