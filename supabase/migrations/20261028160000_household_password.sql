-- Every household has a secret password (Nora, 28 Oct).
-- Typing the three-word address isn't enough to join anymore: the app asks "Knock knock!
-- What's the household's secret password?". Email invites skip it, because they're tied to
-- the invited email. The join link carries the password, so people who get the link just tap.
-- Members can see and change it (the "members edit the household" policy already covers it).

create function public.random_word() returns text
language sql volatile as $$
  select w from unnest(public.address_words()) as w order by random() limit 1;
$$;

alter table public.households add column secret text;
update public.households set secret = public.random_word() where secret is null;
alter table public.households alter column secret set not null;
alter table public.households add constraint households_secret_length check (length(trim(secret)) between 1 and 60);

-- Passwords are compared without caring about capitals or spaces at the ends.
create function public.same_secret(a text, b text) returns boolean
language sql immutable as $$
  select lower(trim(coalesce(a, ''))) = lower(trim(coalesce(b, '')));
$$;

-- Lets the app say "That's not it" before asking the person's name.
-- Returns 'ok', 'wrong' or 'not_found'.
create function public.check_household_secret(address text, secret text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into h from public.households x where x.address = public.normalize_address(check_household_secret.address);
  if h.id is null then return 'not_found'; end if;
  if public.same_secret(h.secret, check_household_secret.secret) then return 'ok'; end if;
  return 'wrong';
end;
$$;

-- Creating a household: the creator picks the password (the app suggests a word).
drop function public.create_household(text, text);
create function public.create_household(household_name text, first_list_name text, secret text default null)
returns public.households
language plpgsql security definer set search_path = '' as $$
declare
  created public.households;
  tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  loop
    begin
      insert into public.households (name, address, created_by, secret)
      values (
        trim(household_name),
        public.random_address(),
        auth.uid(),
        coalesce(nullif(trim(create_household.secret), ''), public.random_word())
      )
      returning * into created;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise; end if;
    end;
  end loop;

  insert into public.household_members (household_id, user_id) values (created.id, auth.uid());
  insert into public.lists (household_id, name, position, created_by)
  values (created.id, trim(first_list_name), 0, auth.uid());
  return created;
end;
$$;

-- Joining by address now needs the password. Someone already in the household gets back in without it.
drop function public.join_household(text, text);
create function public.join_household(address text, label text, secret text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into h from public.households x where x.address = public.normalize_address(join_household.address);
  if h.id is null then
    raise exception 'address_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.household_members m where m.household_id = h.id and m.user_id = auth.uid()) then
    return h.id;
  end if;
  if not public.same_secret(h.secret, join_household.secret) then
    raise exception 'wrong_password' using errcode = '28P01';
  end if;

  insert into public.household_members (household_id, user_id, label)
  values (h.id, auth.uid(), nullif(trim(join_household.label), ''));
  return h.id;
end;
$$;

revoke execute on function public.check_household_secret(text, text) from public, anon;
revoke execute on function public.create_household(text, text, text) from public, anon;
revoke execute on function public.join_household(text, text, text) from public, anon;
grant execute on function public.check_household_secret(text, text) to authenticated;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.join_household(text, text, text) to authenticated;
