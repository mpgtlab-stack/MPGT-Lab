-- À copier-coller dans Supabase > SQL Editor > New query > Run

create table submissions (
  id uuid primary key,
  tracking_code text not null,
  title text not null,
  type text not null,
  author_name text not null,
  author_email text not null,
  content text not null,
  status text not null default 'pending',
  admin_comment text default '',
  published_content text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- On désactive la sécurité "ligne par ligne" (RLS) pour ce projet simple :
-- ça veut dire que le site peut lire/écrire librement dans cette table.
-- C'est le même niveau de sécurité qu'un mot de passe unique côté admin
-- (voir la note sur ADMIN_PASSWORD). Amplement suffisant pour un site de club,
-- à revoir avec un développeur si le site grandit beaucoup.
alter table submissions disable row level security;
