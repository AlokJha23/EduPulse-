# Privacy Policy

**Effective Date:** January 1, 2026  
**Platform:** Academiq Education Platform

## 1. Overview
Academiq ("we", "our", or "the Platform") provides multi-tenant academic management, study material distribution, attendance tracking, and online assessment tools for schools, coaching institutes, teachers, and students. We are committed to safeguarding personal, institutional, and student educational records.

## 2. Multi-Tenant Data Isolation
- Every registered school or academy operates inside a logically isolated workspace identified by a unique `academy_id` and `academy_code`.
- Data belonging to one institution (student rosters, attendance sheets, grades, notes, announcements, and assignments) is strictly isolated and never mixed with or accessible to another institution.

## 3. Information Collected
- **Educator & Admin Data:** Name, institutional affiliation, subject specialization, contact email, phone number, and encrypted password credentials.
- **Student Data (Administered by School Faculty):** Student ID, roll number, class/section, parent/guardian name and contact phone, attendance logs, assignment submissions, test responses, academic marks, and optional student-completed profile details (profile photo, date of birth, blood group, emergency contact, residential address, and bio).

## 4. Strict Role-Based Access Control (RBAC)
- **Complete Student Profiles:** Detailed student contact information, photographs, emergency contacts, residential addresses, and medical/blood group details are accessible **exclusively** to authorized faculty and administrators within that student's enrolled school.
- **Student Access:** Students can access only their own profile, their own attendance, marks, test scorecards, and study resources scoped to their enrolled class and school.

## 5. Data Security & Authentication
- Passwords are stored using cryptographic one-way hashing (`bcryptjs`) and never stored in plaintext.
- API requests are authenticated via signed JSON Web Tokens (JWT) and verified on every endpoint before accessing or modifying records.

## 6. Contact & Data Requests
For institutional data export, correction, or deletion requests, please contact the platform maintainer at **alokkumar02012@gmail.com** or your school's designated administrator.
