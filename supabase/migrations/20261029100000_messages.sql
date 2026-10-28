-- Messages (Nora, 29 Oct): like WhatsApp. Every household has one group chat for everyone,
-- and each pair of people in it has a private chat.
--   to_user null  -> the household's group chat
--   to_user set   -> a private message between author and to_user

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  to_user uuid references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_household on public.messages (household_id, created_at);

alter table public.messages enable row level security;
-- Group messages: everyone in the household. Private ones: only the two people in the chat.
create policy "read your chats" on public.messages
  for select to authenticated
  using (public.is_member(household_id) and (to_user is null or to_user = auth.uid() or author_id = auth.uid()));
create policy "write as yourself to someone in the household" on public.messages
  for insert to authenticated
  with check (
    public.is_member(household_id) and author_id = auth.uid()
    and (to_user is null or exists (select 1 from public.household_members m where m.household_id = messages.household_id and m.user_id = to_user))
  );
create policy "delete your own messages" on public.messages
  for delete to authenticated using (author_id = auth.uid());

-- Where each person stopped reading each chat, for the unread counts.
-- chat is 'household' for the group chat, or the other person's id for a private chat.
create table public.chat_reads (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  household_id uuid not null references public.households (id) on delete cascade,
  chat text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, household_id, chat)
);
alter table public.chat_reads enable row level security;
create policy "your own read marks" on public.chat_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Mark a chat as read up to now.
create function public.mark_chat_read(hid uuid, chat text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.chat_reads (user_id, household_id, chat, read_at)
  values (auth.uid(), hid, mark_chat_read.chat, now())
  on conflict (user_id, household_id, chat) do update set read_at = excluded.read_at;
$$;
revoke execute on function public.mark_chat_read(uuid, text) from public, anon;
grant execute on function public.mark_chat_read(uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
