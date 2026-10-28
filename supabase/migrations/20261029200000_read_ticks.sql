-- Read ticks in Messages (Nora, 29 Oct): to show two ticks once everyone has read a message,
-- people in a household can see how far the others have read. Changing them stays your own.
drop policy "your own read marks" on public.chat_reads;
create policy "members see read marks" on public.chat_reads
  for select to authenticated using (public.is_member(household_id));
create policy "set your own read marks" on public.chat_reads
  for insert to authenticated with check (user_id = auth.uid());
create policy "change your own read marks" on public.chat_reads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_reads;
  end if;
end;
$$;
