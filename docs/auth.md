# Authentication and Sessions

## Sign-up / verification
1. `POST /api/v1/auth/sign-up` creates user + profile + verification token.
2. `POST /api/v1/auth/verify-email` consumes token and activates account.

## Sign-in
- `POST /api/v1/auth/sign-in` validates password hash and verified email.
- API sets `SESSION_COOKIE_NAME` cookie with token-bound session hash.

## Session resolution
- Every protected endpoint resolves current user from cookie token hash in `sessions`.
- Expired or revoked session yields 401.

## Role enforcement
- Admin APIs use `admin_user` dependency and return 403 for non-admin roles.
- Web admin page should consume admin APIs; unauthorized users are redirected.

## Password reset
- Request endpoint issues reset token (demo returns token payload).
- Complete endpoint hashes new password and consumes token.

## Security posture in demo mode
- Passwords are hashed with scrypt.
- Session tokens are random and server-side hashed with `SESSION_SECRET`.
- Demo mode returns verification/reset tokens only to support local flows.
