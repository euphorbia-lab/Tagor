# Security

Tagor's whole point is that the server cannot read your events, so security reports are
taken seriously.

## Reporting a vulnerability

Please report privately, not in a public issue. Use GitHub's private vulnerability
reporting: the **Security** tab of this repository, then **Report a vulnerability**.

Include what you found, how to reproduce it, and what an attacker could do with it. You
should get a first reply within about a week.

## Scope

In scope:

- The client-side encryption (`src/lib/crypto.ts`) and how keys travel in links
- Row Level Security and database functions (`supabase/migrations/`)
- The API routes (`src/pages/api/`) and the manage-token flow
- The `purge-expired` edge function and image storage
- Anything that leaks event contents, photos, IP addresses or location metadata

Out of scope: rate-limit tuning, missing security headers with no concrete impact, and
issues that need a compromised device or browser.
