# Contributing to Academiq

Thank you for your interest in improving the Academiq Education Platform!

## Development Guidelines
1. **TypeScript & Code Quality:** Write clean, strictly typed TypeScript across both `/src` (React + Tailwind CSS) and `/server` (Express).
2. **Security & Isolation:** Any new endpoint must enforce `requireAuth`, appropriate `requireRole`, and strict `academy_id` tenant scoping. Never expose student personal details to unauthorized roles.
3. **Verification Before Submitting:**
   - Run `npm run lint` to confirm zero TypeScript errors.
   - Run `npm run build` to verify production bundle compilation.
   - Test both Teacher and Student flows across separate school tenants to ensure zero data leakage.

## Pull Request Checklist
- [ ] All changes adhere to the existing MIT License (`LICENSE`).
- [ ] No secrets, API keys, or faculty passcodes are hardcoded in client UI code.
- [ ] `npm run lint` and `npm run build` pass without errors.
