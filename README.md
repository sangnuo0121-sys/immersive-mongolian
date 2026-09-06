# Immersive Mongolian

[![Quality checks](https://github.com/sangnuo0121-sys/immersive-mongolian/actions/workflows/ci.yml/badge.svg)](https://github.com/sangnuo0121-sys/immersive-mongolian/actions/workflows/ci.yml)

**[Live Demo](https://immersivemongolian.coze.site/)** · [Source Code](https://github.com/sangnuo0121-sys/immersive-mongolian) · [Report an Issue](https://github.com/sangnuo0121-sys/immersive-mongolian/issues)

Immersive Mongolian is a bilingual, full-stack learning platform for traditional Mongolian. It brings together alphabet practice, themed vocabulary, daily learning, pronunciation contributions, cultural content, leaderboards, and progress tracking in one responsive application.

## Why This Project

Traditional Mongolian presents distinctive challenges for digital learning, including vertical writing, font support, pronunciation resources, and limited interactive content. This project explores how modern web technologies can make the language more accessible while creating space for community participation and cultural storytelling.

## Features

- Chinese and English interfaces with traditional Mongolian rendered as SVG
- Themed vocabulary collections, daily tasks, review activities, and an XP-based level system
- Community pronunciation uploads, voting, and administrator review
- Cultural articles, oral archives, wisdom quotes, and acknowledgements
- Email authentication, user profiles, and an administrator dashboard
- Responsive desktop sidebar and mobile bottom navigation
- Role- and ownership-based permissions enforced by both API checks and Supabase RLS

## Tech Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4, shadcn/ui, and Radix UI
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- pnpm 11
- GitHub Actions for automated validation and dependency auditing

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 11
- A Supabase project

### Installation

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:5000](http://localhost:5000).

## Environment Variables

Configure these values in `.env.local` or in your deployment platform:

| Variable | Purpose | Safe to expose publicly? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side administrative operations | No |
| `BOOTSTRAP_ADMIN_EMAIL` | Initial administrator email | No |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial administrator password | No |
| `FEEDBACK_RESOLVE_CODE` | Optional legacy feedback maintenance code | No |

Never create a variable named `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Any value prefixed with `NEXT_PUBLIC_` may be included in the browser bundle.

## Supabase Setup

1. Create a Supabase project and configure the environment variables.
2. Create the `word-audio`, `acknowledgements-images`, `culture-articles-images`, and `oral-archives-audio` storage buckets as needed.
3. Run the database schema in the Supabase SQL Editor.
4. Apply the migrations in order:

```text
supabase/migrations/0001_auth_profiles_xp_levels.sql
supabase/migrations/0002_secure_content_rls.sql
```

The second migration replaces legacy public-write policies. Public users receive read-only access, authenticated contributors can maintain their own content, and administrative data can be changed only by administrators.

See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for the complete manual setup guide.

## Available Commands

```bash
pnpm dev          # Start the development server on port 5000
pnpm validate     # Run TypeScript and blocking ESLint checks
pnpm build        # Create a production build
pnpm start        # Start the production server
```

## Security

- Environment files, dependencies, build output, and private local materials are excluded through `.gitignore`.
- Standard Supabase clients always use the anonymous key; the service-role key is limited to explicit server-side administrative operations.
- Create, update, and delete endpoints verify authentication, ownership, or administrator status on the server.
- Existing deployments must apply the latest RLS migration because updating application code does not automatically update database policies.

## Project Structure

```text
src/app/                 Pages and API routes
src/components/          Product and UI components
src/context/             Global learning state
src/lib/                 Authentication, rendering, and business utilities
src/storage/database/    Supabase client and database schema
supabase/migrations/     Database migrations
public/                  Fonts, images, and pre-rendered Mongolian assets
scripts/                 Build and SVG-generation scripts
```

## License

This project is available under the [MIT License](LICENSE).
