# Security Policy

## Supported Versions
Security patches and updates are applied to the active `main` release branch of the Academiq Education Platform.

## Security Architecture Highlights
1. **Authentication & Session Integrity:** Signed JWT tokens with role (`TEACHER` / `STUDENT`) and tenant (`academy_id`) claims enforced server-side.
2. **Password Hashing:** All user credentials are hashed using `bcryptjs`.
3. **Role-Based Access Control (RBAC):** Server-side middleware (`requireAuth`, `requireRole`) validates role and tenant ownership on every API route. Student profile details are strictly restricted to authorized faculty/admin accounts within the same institution.
4. **Multi-Tenant Isolation:** Queries enforce `teacher_id` / `academy_id` scoping so records never leak across registered schools.

## Reporting a Vulnerability
If you discover a security vulnerability (such as an authentication bypass, cross-tenant data leak, or privilege escalation):

1. **Do not** open a public issue or disclose exploit details publicly.
2. Email a detailed report to **alokkumar02012@gmail.com** including steps to reproduce, affected endpoints/components, and potential impact.
3. We aim to acknowledge reports within 48 hours and coordinate a verified fix promptly.
