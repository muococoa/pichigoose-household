-- Notes (Nora, 29 Oct): everyone in the household can read and change every note, but only the person who wrote
-- a note can delete it. (A note whose writer has left the app can be deleted by anyone in the household.)
-- A fresh start (clean_household) still clears all notes.

drop policy "members manage notes" on public.notes;
create policy "members read notes" on public.notes
  for select to authenticated using (public.is_member(household_id));
create policy "members add notes" on public.notes
  for insert to authenticated with check (public.is_member(household_id));
create policy "members change notes" on public.notes
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "delete your own notes" on public.notes
  for delete to authenticated using (public.is_member(household_id) and (created_by = auth.uid() or created_by is null));

-- The fresh start empties everyone's notes, not just your own, so it runs with full rights (it already checks you're
-- in the household first).
alter function public.clean_household(uuid) security definer;
