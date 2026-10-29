-- Hearts (Nora, 29 Oct): like Instagram. Double-tap a comment, chat message or note to heart it, or tap
-- the small heart next to it; tap again to take yours back. Only hearts, no other emoji (yet).
-- Each person can heart a thing once. Under the thing you see a red heart with the avatars of who hearted.

create table public.hearts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  comment_id uuid references public.comments (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A heart belongs to exactly one thing.
  check (num_nonnulls(comment_id, message_id, note_id) = 1),
  unique (user_id, comment_id),
  unique (user_id, message_id),
  unique (user_id, note_id)
);
create index hearts_household on public.hearts (household_id);

-- The household always comes from the thing being hearted, whatever the app sends.
create function public.heart_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.comment_id is not null then
    select c.household_id into new.household_id from public.comments c where c.id = new.comment_id;
  elsif new.message_id is not null then
    select m.household_id into new.household_id from public.messages m where m.id = new.message_id;
  else
    select n.household_id into new.household_id from public.notes n where n.id = new.note_id;
  end if;
  if new.household_id is null then
    raise exception 'nothing to heart' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
create trigger heart_household before insert on public.hearts
  for each row execute function public.heart_household();

alter table public.hearts enable row level security;
-- Everyone in the household sees the hearts, except on private messages: only the two people in that
-- chat (the check on messages runs with the reader's own rights, so it follows the messages rules).
create policy "members read hearts" on public.hearts
  for select to authenticated
  using (public.is_member(household_id) and (message_id is null or exists (select 1 from public.messages m where m.id = message_id)));
create policy "heart as yourself" on public.hearts
  for insert to authenticated
  with check (
    public.is_member(household_id) and user_id = auth.uid()
    and (message_id is null or exists (select 1 from public.messages m where m.id = message_id))
  );
create policy "take back your own heart" on public.hearts
  for delete to authenticated using (user_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.hearts;
  end if;
end;
$$;
