# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Zero-build Vanilla HTML5, CSS3, and ES Modules deployed on Vercel (Hobby free tier), backed by Supabase (PostgreSQL, Auth, Row Level Security) for CMS data and ImageKit (`https://ik.imagekit.io/arambuuu/`) for media optimization and authenticated uploads via one zero-dependency Vercel Serverless Function (`api/imagekit-auth.js`).

## Users

Prospective clients, creative directors, agency leads, and engineering managers evaluating Ra Ashni Aram D. Piloto (Arambuuu) for front-end web development, UI/UX design, branding, and multimedia production, plus the portfolio owner managing project case studies, gallery works, and inquiries through the built-in CMS.

## Product Purpose

Present a minimal, light-mode-first portfolio across five clear pages (`Home`, `About`, `Projects`, `My Tools`, `Contact`) and give the owner a secure, zero-cost CMS to publish, edit, reorder, and archive projects, gallery artworks, and contact inquiries without redeploying source code.

## Positioning

A practicing designer-developer portfolio (active since 2017) combining production front-end engineering (Vue, React, Quasar, Laravel, Tailwind CSS) with brand, print, UI/UX, and motion craft from Davao del Norte, Philippines.

## Operating Context

- Visitors browse across desktop and mobile viewports in daylight/studio environments; light mode is the primary surface with an optional secondary dark theme.
- All public reads and contact submissions work cleanly under Supabase free-tier limits and ImageKit URL transformations (`f-auto,q-80`), falling back gracefully to seeded portfolio data when database credentials are not yet configured.
- Owner authenticates via Supabase Auth (`signInWithPassword`) to access CMS routes (`#admin`) and request short-lived HMAC-SHA1 ImageKit upload signatures from `/api/imagekit-auth`.

## Capabilities and Constraints

- Five pages: `Home`, `About`, `Projects` (including unified Visual Gallery), `My Tools`, and `Contact`, plus protected `#admin` CMS workspace.
- Security boundaries: Row Level Security (RLS) enabled on all Supabase tables (`projects`, `gallery_items`, `contact_messages`); no private keys in client-side code; ImageKit private key kept strictly in Vercel environment variables; DOM rendering escapes untrusted strings (`textContent` / safe DOM builders) and validates URLs (`http:` / `https:` only).
- Free-tier constraints: zero build step, zero runtime npm dependencies, optimized ImageKit transforms, minimal payload sizes.

## Brand Commitments

- Brand name: `Arambuuu` · Owner: `Ra Ashni Aram D. Piloto`
- Confirmed visual assets on ImageKit:
  - Logo: `https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png`
  - Portrait: `https://ik.imagekit.io/arambuuu/Arambuuu/profile.png`
- Light-mode-first minimal presentation.

## Evidence on Hand

- Experience: Front-end Web Developer at Bridge Digital Transformations Inc. (July 2025 – May 2026); Freelancer — Multimedia & Visual Artist (2017 – Present).
- Education: Bachelor of Science in Information Technology, Davao del Norte State College (July 2021 – June 2025).
- Contact channels: `arampiloto@gmail.com`, `+63 991 721 9541`, `https://linkedin.com/in/arambuuu`, `https://github.com/Arambuuu`, `https://arambuuu.my.canva.site/portfolio-arambuuu`, Davao del Norte, Philippines.
- Core disciplines & tools: Vue, React, Laravel, Quasar, Tailwind CSS, Figma, Photoshop, Illustrator, InDesign, CorelDRAW, Premiere Pro, After Effects, CapCut, Filmora, Webflow, Wix, Squarespace.

## Product Principles

- Let real artifacts and structured work speak before ornament.
- Enforce strict security boundaries by default across database RLS, serverless signing, and DOM rendering.
- Keep architecture minimal, dependency-free, and sustainable on Vercel, Supabase, and ImageKit free tiers.
