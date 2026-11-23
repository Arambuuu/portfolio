-- Arambuuu Portfolio & CMS Schema (Supabase PostgreSQL)
-- Run this once in your Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'Web Dev' check (category in ('Web Dev', 'UI/UX', 'Branding', 'Motion & Video', 'Digital Marketing')),
  summary text not null check (char_length(summary) between 1 and 600),
  description text not null default '' check (char_length(description) <= 4000),
  client text not null default '' check (char_length(client) <= 160),
  year text not null default '2026' check (char_length(year) <= 20),
  tags text[] not null default '{}',
  image_url text not null check (image_url ~ '^https?://'),
  live_url text not null default '' check (live_url = '' or live_url ~ '^https?://'),
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
  image_url text not null check (image_url ~ '^https?://'),
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
    'branding-identity-systems',
    'Branding & Identity Systems',
    'Branding',
    'Comprehensive logo marks, print brochures, tarpaulins, and cohesive visual identity systems built for regional businesses.',
    'End-to-end brand systems covering primary logomarks, typography standards, color tokens, print collateral (brochures, tarpaulins, event signage), and social campaign templates engineered for print and screen consistency.',
    'Selected Brand Clients',
    '2025',
    array['Illustrator', 'CorelDRAW', 'InDesign', 'Brand Strategy'],
    'https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png?tr=bg-141413,w-960,q-85,f-auto',
    'https://arambuuu.my.canva.site/portfolio-arambuuu',
    true,
    true,
    1
  ),
  (
    'responsive-web-applications',
    'Responsive Business Web Applications',
    'Web Dev',
    'Production front-end architectures using Vue, Quasar, React, Laravel, and Tailwind CSS with CMS-driven workflows.',
    'Built and maintained responsive multi-screen web applications at Bridge Digital Transformations Inc. and for freelance clients. Focused on fast initial load, accessible component systems, clean state management, and CMS content workflows.',
    'Bridge Digital Transformations Inc.',
    '2026',
    array['Vue', 'React', 'Quasar', 'Laravel', 'Tailwind CSS'],
    'https://ik.imagekit.io/arambuuu/Arambuuu/profile.png',
    'https://github.com/Arambuuu',
    true,
    true,
    2
  ),
  (
    'ui-ux-prototypes-layouts',
    'UI/UX Prototypes & Design Systems',
    'UI/UX',
    'Interactive wireframes, component tokens, and high-converting web layouts designed in Figma, Webflow, Wix, and Squarespace.',
    'Structured product design process from user flow mapping and low-fidelity wireframes to clickable Figma prototypes and production Webflow/Squarespace builds optimized for desktop and mobile clarity.',
    'Digital Product Clients',
    '2025',
    array['Figma', 'Webflow', 'UI Systems', 'Prototyping'],
    'https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png?tr=bg-141413,w-960,q-85,f-auto',
    'https://arambuuu.my.canva.site/portfolio-arambuuu',
    false,
    true,
    3
  ),
  (
    'promotional-video-motion',
    'Promotional Video & Motion Graphics',
    'Motion & Video',
    'Commercial reels, product explainers, and kinetic brand graphics edited in Premiere Pro, After Effects, CapCut, and Filmora.',
    'Storyboarding, pacing, color grading, kinetic typography, and social-first vertical/landscape exports tailored for marketing launches and brand awareness campaigns.',
    'Campaign & Brand Partners',
    '2024',
    array['Premiere Pro', 'After Effects', 'CapCut', 'Motion'],
    'https://ik.imagekit.io/arambuuu/Arambuuu/profile.png',
    'https://arambuuu.my.canva.site/portfolio-arambuuu',
    false,
    true,
    4
  ),
  (
    'digital-marketing-assets',
    'Digital Marketing & Campaign Creatives',
    'Digital Marketing',
    'High-clarity social media kits, web banners, and ad creative systems designed for consistent multi-channel engagement.',
    'Modular campaign templates and art-directed social graphics combining photography, clean typographic hierarchy, and brand-aligned visual pacing for online business pages.',
    'Online Business Pages',
    '2025',
    array['Photoshop', 'Illustrator', 'Social Media', 'Ad Creative'],
    'https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png?tr=bg-141413,w-960,q-85,f-auto',
    'https://arambuuu.my.canva.site/portfolio-arambuuu',
    false,
    true,
    5
  )
on conflict (slug) do nothing;

-- Seed initial visual gallery items
insert into public.gallery_items (title, category, caption, image_url, aspect_ratio, year, tool_used, published, sort_order)
select * from (values
  ('Arambuuu Studio Monogram', 'Branding', 'Primary studio mark and geometric identity emblem hosted via ImageKit.', 'https://ik.imagekit.io/arambuuu/Arambuuu/Arambuuu.png', '1/1', '2026', 'Illustrator · Figma', true, 1),
  ('Studio Portrait — Ra Ashni Aram Piloto', 'Photography', 'Editorial studio portrait from Davao del Norte creative practice.', 'https://ik.imagekit.io/arambuuu/Arambuuu/profile.png', '3/4', '2026', 'Photography · Lightroom', true, 2)
) as seed(title, category, caption, image_url, aspect_ratio, year, tool_used, published, sort_order)
where not exists (select 1 from public.gallery_items limit 1);
