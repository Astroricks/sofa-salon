# Security Policy

## Supported versions

Security fixes are applied on the default branch (`main`). Deploy from the latest release or commit when possible.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report vulnerabilities privately using one of these channels:

1. **GitHub Security Advisories** (preferred): open the repository → **Security** → **Report a vulnerability**.
2. **Email**: contact the maintainers through the email listed on the GitHub profile or organization that owns the repository.

Include:

- A description of the issue and impact
- Steps to reproduce (or a proof of concept)
- Affected routes, roles, or env configuration if known

We aim to acknowledge reports within a few business days. We will coordinate disclosure timing with you before publishing a fix.

## Scope notes

- This app expects each deployment to use **its own** Supabase project and secrets. Do not point a test or fork deployment at a production database with real guest data.
- The Supabase **anon** key is public by design (client bundle); report issues where Row Level Security or server routes fail to enforce authorization.
- The **service role** key, `CRON_SECRET`, and `RESEND_API_KEY` must remain server-only. Reports involving exposure of those secrets in client code or the repository are in scope.

## Out of scope

- Issues in third-party services (Supabase, Vercel, Google OAuth, Resend) — report those to the vendor.
- Vulnerabilities in dependencies without a practical exploit path in this app (still welcome; we may track them as routine dependency updates).
