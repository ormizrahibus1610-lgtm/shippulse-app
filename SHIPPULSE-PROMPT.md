# ShipPulse — One-Paragraph Product Prompt

Build ShipPulse, a minimalist SaaS Changelog and Feature Voting board
using Next.js, TypeScript, and our existing `shippulse-dev` Supabase
Free-Tier project. Public visitors can browse the roadmap and published
changelogs without logging in. Authenticated users sign up and sign in
with Supabase Auth, submit new feature requests, and toggle one upvote
per feature enforced by a Postgres unique key and `auth.uid()` Row Level
Security policies. Admin users can publish changelog releases linked to
shipped features. Keep every secret out of git, verify every UI flow in
headless Playwright with zero console or network errors, require green
GitHub Actions CI on pull requests, and ship live on Vercel Hobby.

## Target Stack ($0 Free Tier)
- GitHub + Actions CI · Supabase `shippulse-dev` (slot 1/2) · Vercel Hobby
