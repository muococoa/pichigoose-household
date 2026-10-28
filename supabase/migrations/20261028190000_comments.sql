-- Comments (Nora, 28 Oct): every shopping item, to-do and note has its own short conversation,
-- so the household can ask "Do you mean this one?" before buying, and answer.
-- Flat, like a chat. Everyone in the household sees and writes them; you can delete your own.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  item_id uuid references public.list_items (id) on delete cascade,
  todo_id uuid references public.todos (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- A comment belongs to exactly one thing.
  check (num_nonnulls(item_id, todo_id, note_id) = 1)
);
create index comments_household on public.comments (household_id);
create index comments_item on public.comments (item_id);
create index comments_todo on public.comments (todo_id);
create index comments_note on public.comments (note_id);

-- The household always comes from the thing being commented on, whatever the app sends.
create function public.comment_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.item_id is not null then
    select l.household_id into new.household_id from public.list_items i join public.lists l on l.id = i.list_id where i.id = new.item_id;
  elsif new.todo_id is not null then
    select t.household_id into new.household_id from public.todos t where t.id = new.todo_id;
  else
    select n.household_id into new.household_id from public.notes n where n.id = new.note_id;
  end if;
  if new.household_id is null then
    raise exception 'nothing to comment on' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
create trigger comment_household before insert on public.comments
  for each row execute function public.comment_household();

alter table public.comments enable row level security;
create policy "members read comments" on public.comments
  for select to authenticated using (public.is_member(household_id));
create policy "members write their own comments" on public.comments
  for insert to authenticated with check (public.is_member(household_id) and author_id = auth.uid());
create policy "delete your own comments" on public.comments
  for delete to authenticated using (author_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.comments;
  end if;
end;
$$;
