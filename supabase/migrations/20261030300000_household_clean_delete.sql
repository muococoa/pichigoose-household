-- Fresh start and delete (Nora, 30 Oct).
--   The broom (Arrange your home): clean_household empties the shopping lists, to-dos, notes and both
--   shelves. Comments go with the things they were on. The lists themselves, the chat, the people,
--   the name, address and password stay.
--   Delete (the household's menu, danger zone): delete_household removes the household and everything
--   in it, for everyone. Only the person who created it can, after typing its name in the app. They're
--   the household's admin, so they can't leave it (everyone else can leave, but not delete).

create function public.clean_household(hid uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;
  delete from public.list_items where list_id in (select id from public.lists where household_id = hid);
  delete from public.todos where household_id = hid;
  delete from public.notes where household_id = hid;
  delete from public.pantry_items where household_id = hid;
end;
$$;
revoke execute on function public.clean_household(uuid) from public, anon;
grant execute on function public.clean_household(uuid) to authenticated;

-- Members can't delete a household row directly, so this checks and does it for them: the creator only.
-- (If the creator is somehow no longer in it, anyone still in it can, so it never gets stuck.)
create function public.delete_household(hid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  creator uuid;
begin
  select created_by into creator from public.households where id = hid;
  if not public.is_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;
  if creator is distinct from auth.uid()
     and exists (select 1 from public.household_members m where m.household_id = hid and m.user_id = creator) then
    raise exception 'only the person who created the household can delete it' using errcode = '42501';
  end if;
  delete from public.households where id = hid;
end;
$$;
revoke execute on function public.delete_household(uuid) from public, anon;
grant execute on function public.delete_household(uuid) to authenticated;

-- The creator can't leave their own household (they delete it instead).
drop policy "leave on your own" on public.household_members;
create policy "leave on your own" on public.household_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    and not exists (select 1 from public.households h where h.id = household_id and h.created_by = auth.uid())
  );
