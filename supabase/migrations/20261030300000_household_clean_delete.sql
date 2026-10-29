-- Fresh start and delete (Nora, 30 Oct).
--   The broom (Arrange your home): clean_household empties the shopping lists, to-dos, notes and both
--   shelves. Comments go with the things they were on. The lists themselves, the chat, the people,
--   the name, address and password stay.
--   The trash can (the household's menu, danger zone): delete_household removes the household and
--   everything in it, for everyone.

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

-- Members can't delete a household row directly, so this checks membership and does it for them.
create function public.delete_household(hid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;
  delete from public.households where id = hid;
end;
$$;
revoke execute on function public.delete_household(uuid) from public, anon;
grant execute on function public.delete_household(uuid) to authenticated;
