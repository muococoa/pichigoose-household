-- Wish lists (Nora, 29 Oct): everyone can keep a wish list on their profile, for things they'd love to have.
-- The people you live with can see it, and can quietly mark "I'll get this". You never see who's getting
-- what (the claims live in their own table, which you can't read for your own wishes). When you get a
-- wish, it stays on the list under a "Got it" stamp.
-- A wish belongs to the person, not to a household, like money: it follows you to every home you're in.

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  name text not null check (length(trim(name)) between 1 and 120),
  price text check (price is null or length(price) <= 30),
  link text check (link is null or length(link) <= 2000),
  note text check (note is null or length(note) <= 500),
  got_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index wishes_owner on public.wishes (owner_id);

alter table public.wishes enable row level security;
create policy "see your own and your housemates' wishes" on public.wishes
  for select to authenticated using (owner_id = auth.uid() or public.shares_household(owner_id));
create policy "add your own wishes" on public.wishes
  for insert to authenticated with check (owner_id = auth.uid());
create policy "change your own wishes" on public.wishes
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete your own wishes" on public.wishes
  for delete to authenticated using (owner_id = auth.uid());

-- "I'll get this": one person per wish. Seen by everyone who can see the wish, except its owner.
create table public.wish_claims (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null unique references public.wishes (id) on delete cascade,
  claimed_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

-- Whose wish is it? (Runs with full rights so the claim rules can ask without reading the wish themselves.)
create function public.wish_owner(wish uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select w.owner_id from public.wishes w where w.id = wish;
$$;

alter table public.wish_claims enable row level security;
create policy "see claims on housemates' wishes, never your own" on public.wish_claims
  for select to authenticated
  using (public.wish_owner(wish_id) <> auth.uid() and public.shares_household(public.wish_owner(wish_id)));
create policy "claim a housemate's wish as yourself" on public.wish_claims
  for insert to authenticated
  with check (claimed_by = auth.uid() and public.wish_owner(wish_id) <> auth.uid() and public.shares_household(public.wish_owner(wish_id)));
create policy "let go of your own claim" on public.wish_claims
  for delete to authenticated using (claimed_by = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.wishes;
    alter publication supabase_realtime add table public.wish_claims;
  end if;
end;
$$;
