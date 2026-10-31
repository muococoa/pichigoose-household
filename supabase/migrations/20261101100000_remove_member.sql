-- Remove someone from the household (Nora, 31 Oct): the person who created it (its admin) can take anyone
-- else out, for example someone added by accident. They lose access to everything in it right away. What
-- they wrote stays. Everyone else can still only leave on their own.
create policy "the admin removes people" on public.household_members
  for delete to authenticated
  using (
    user_id <> auth.uid()
    and exists (select 1 from public.households h where h.id = household_id and h.created_by = auth.uid())
  );
