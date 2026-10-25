export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Legacy HS256 JWT secret. Leave unset if the project uses asymmetric signing keys (JWKS). */
  SUPABASE_JWT_SECRET?: string;
  ALLOWED_EMAIL_DOMAINS?: string;
  /** Comma-separated emails of the teacher account(s). Everyone else who signs in is a student. */
  TEACHER_EMAILS?: string;
  ALLOWED_ORIGINS?: string;
  MAX_BODY_BYTES?: string;
}
