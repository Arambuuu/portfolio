-- Arambuuu Portfolio & CMS Schema (Supabase PostgreSQL)
-- Run this once in your Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'Web Dev' check (category in ('Web Dev', 'UI/UX', 'Branding', 'Print & Poster', 'Motion & Video', 'Digital Marketing')),
  summary text not null check (char_length(summary) between 1 and 600),
  description text not null default '' check (char_length(description) <= 4000),
  client text not null default '' check (char_length(client) <= 160),
  year text not null default '2026' check (char_length(year) <= 20),
  tags text[] not null default '{}',
  image_url text not null check (image_url ~ '^(https?://|\./)'),
  live_url text not null default '' check (live_url = '' or live_url ~ '^(https?://|\./)'),
  featured boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Visual Gallery Table
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'Branding' check (category in ('Branding', 'UI/UX', 'Print & Poster', 'Photography', 'Motion Still')),
  caption text not null default '' check (char_length(caption) <= 500),
  image_url text not null check (image_url ~ '^(https?://|\./)'),
  aspect_ratio text not null default '4/3' check (aspect_ratio in ('16/10', '4/3', '1/1', '3/4')),
  year text not null default '2026' check (char_length(year) <= 20),
  tool_used text not null default '' check (char_length(tool_used) <= 120),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Contact Messages Table
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  sender_email text not null check (char_length(sender_email) between 3 and 180 and sender_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null default '' check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now()
);

-- Updated_at trigger for projects
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Enable Row Level Security on every table
alter table public.projects enable row level security;
alter table public.gallery_items enable row level security;
alter table public.contact_messages enable row level security;

-- Drop old policies if re-running
drop policy if exists "Public can read published projects" on public.projects;
drop policy if exists "Authenticated admin manages projects" on public.projects;
drop policy if exists "Public can read published gallery items" on public.gallery_items;
drop policy if exists "Authenticated admin manages gallery items" on public.gallery_items;
drop policy if exists "Public can submit contact messages" on public.contact_messages;
drop policy if exists "Authenticated admin manages contact messages" on public.contact_messages;

-- Projects RLS
create policy "Public can read published projects"
  on public.projects for select
  using (published = true or auth.role() = 'authenticated');

create policy "Authenticated admin manages projects"
  on public.projects for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Gallery RLS
create policy "Public can read published gallery items"
  on public.gallery_items for select
  using (published = true or auth.role() = 'authenticated');

create policy "Authenticated admin manages gallery items"
  on public.gallery_items for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Contact Messages RLS (write-only for anon, full management for authenticated admin)
create policy "Public can submit contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    char_length(sender_name) between 1 and 120
    and char_length(message) between 1 and 2000
    and status = 'unread'
  );

create policy "Authenticated admin manages contact messages"
  on public.contact_messages for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed initial portfolio projects
insert into public.projects (slug, title, category, summary, description, client, year, tags, image_url, live_url, featured, published, sort_order)
values
  (
    'bridge-digital-transformations',
    'Bridge Digital — Corporate Website',
    'UI/UX',
    'Corporate web presence for Bridge Digital Transformations Inc. with custom editorial illustrations, product showcase, and responsive UI.',
    'Designed and built the corporate website for Bridge Digital Transformations Inc. (bridgedigital.tech), pairing custom line-art illustrations and warm editorial gradients with clear product navigation, responsive layouts, and conversion-focused contact flows.',
    'Bridge Digital Transformations Inc.',
    '2026',
    array['UI/UX', 'Web Design', 'Front-End', 'Responsive'],
    './projects/UI and UX/bridgedigital.tech/screenshot.png',
    'https://bridgedigital.tech',
    true,
    true,
    1
  ),
  (
    'garinan-oil-terminal-website',
    'Garinan Oil Terminal (GOTI) — Corporate Website',
    'UI/UX',
    'Corporate website for GOTI, a strategic fuel import, biofuel blending, and distribution terminal in Tagum City, Davao del Norte.',
    'Designed the corporate web platform for Garinan Oil Terminal, Inc. (garinanoil.com), featuring full-bleed Mindanao aerial photography, structured sections for Facilities, Sustainability, Careers, and News, and direct B2B inquiry pathways.',
    'Garinan Oil Terminal, Inc. (GOTI)',
    '2026',
    array['UI/UX', 'Web Design', 'Corporate Website', 'Responsive'],
    './projects/UI and UX/garinanoil.com/screenshot.png',
    'https://garinanoil.com',
    true,
    true,
    2
  ),
  (
    'kantigo-sports-branding-kit',
    'KantiGo Sports — Branding Kit, Guide & Assets',
    'Branding',
    'Complete brand identity kit, visual guidelines, UI button system, and physical/digital mockups for KantiGo Sports (Essential & ProEx V5).',
    'End-to-end brand identity system and style guide for KantiGo Solutions Corp. / KantiGo Sports. Includes icon and wordmark lockups, dark/royal-blue/electric-cyan color palette, typography hierarchy (Bebas Neue, Poppins, KantiGo Digits), desktop and mobile scoreboard app screens (Essential & ProEx V5), apparel and packaging mockups, filled/outlined/glassmorphism UI button systems, and brand usage guidelines.',
    'KantiGo Solutions Corp.',
    '2026',
    array['Brand Identity', 'Logo Design', 'Style Guide', 'UI Components'],
    './projects/branding/KantiGo Solutions Corp - Branding Kit/1. cover.png',
    './projects/branding/KantiGo Solutions Corp - Branding Kit/Kantigo Branding Kit and Guide v1.pdf',
    true,
    true,
    3
  ),
  (
    'cadac-panabo-anti-drug-poster',
    'City Anti-Drug Abuse Council — Panabo City Graphics Design Contest',
    'Print & Poster',
    '1 out of 4 SUCs in Panabo City | A poster design highlighting the importance of Anti-Drug Campaign. Coach: Jeymar Alfarero.',
    'Poster design representing Davao del Norte State College (DNSC) — placed 1st out of 4 State Universities and Colleges (SUCs) in Panabo City at the City Anti-Drug Abuse Council (CADAC) Graphics Design Contest. Crafted in Adobe Photoshop to highlight the urgency of the Anti-Drug Campaign ("Say No to Drugs — Act Now, Before It''s Too Late"). Coach: Jeymar Alfarero.',
    'City Anti-Drug Abuse Council — Panabo City',
    '2023',
    array['Graphic Design', 'Layout Artist', 'Poster Design', 'Adobe Photoshop'],
    './projects/poster/CADAC/College - DNSC - Piloto.jpg',
    '',
    true,
    true,
    4
  )
on conflict (slug) do nothing;

-- Seed initial visual gallery items
insert into public.gallery_items (title, category, caption, image_url, aspect_ratio, year, tool_used, published, sort_order)
select * from (values
  ('Bridge Digital — Website UI', 'UI/UX', 'Corporate website hero and custom editorial illustration system for Bridge Digital Transformations Inc.', './projects/UI and UX/bridgedigital.tech/screenshot.png', '16/10', '2026', 'UI/UX · Web Design', true, 1),
  ('Garinan Oil Terminal (GOTI) — Website UI', 'UI/UX', 'Strategic fuel import terminal web presence for Garinan Oil Terminal, Inc. in Tagum City.', './projects/UI and UX/garinanoil.com/screenshot.png', '16/10', '2026', 'UI/UX · Web Design', true, 2),
  ('KantiGo Sports — Brand Identity Cover', 'Branding', 'Primary branding kit cover and identity direction for KantiGo Solutions Corp.', './projects/branding/KantiGo Solutions Corp - Branding Kit/1. cover.png', '16/10', '2026', 'Brand Identity · Style Guide', true, 3),
  ('CADAC Panabo City — Anti-Drug Campaign Poster', 'Print & Poster', '1 out of 4 SUCs in Panabo City | A poster design highlighting the importance of Anti-Drug Campaign. Coach: Jeymar Alfarero.', './projects/poster/CADAC/College - DNSC - Piloto.jpg', '3/4', '2023', 'Adobe Photoshop · Layout Artist', true, 4),
  ('KantiGo Sports — Logo System & Lockups', 'Branding', 'Icon mark, wordmark, and KantiGo Sports lockups across light and dark brand surfaces.', './projects/branding/KantiGo Solutions Corp - Branding Kit/2. logo.png', '16/10', '2026', 'Logo Design · Brand Guidelines', true, 5),
  ('KantiGo Sports — Merchandise & Packaging Mockups', 'Branding', 'Brand applications across athletic apparel, packaging, lanyards, stationery, and outerwear.', './projects/branding/KantiGo Solutions Corp - Branding Kit/6. mockups.png', '16/10', '2026', 'Brand Mockups · Print & Apparel', true, 6),
  ('KantiGo Sports — Scoreboard UI Button Kit', 'UI/UX', 'Filled, outlined, text, and glassmorphism control buttons engineered for Essential and ProEx V5.', './projects/branding/KantiGo Solutions Corp - Branding Kit/7. buttons.png', '16/10', '2026', 'UI Systems · Glassmorphism', true, 7)
) as seed(title, category, caption, image_url, aspect_ratio, year, tool_used, published, sort_order)
where not exists (select 1 from public.gallery_items limit 1);

-- Seed initial admin user: arampiloto@gmail.com / 12345678
do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
begin
  if not exists (select 1 from auth.users where email = 'arampiloto@gmail.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'arampiloto@gmail.com',
      crypt('12345678', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Ra Ashni Aram Piloto"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      admin_uid,
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'arampiloto@gmail.com'),
      'email',
      admin_uid::text,
      now(),
      now(),
      now()
    );
  end if;
end $$;

