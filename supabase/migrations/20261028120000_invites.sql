-- Invite someone to a household by email, from inside the app.
-- The person invited sees the invite in the app (if they have an account) and gets an email.
-- Nobody is added without saying yes.

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  -- Saved with the invite, because the person invited can't see the household until they join.
  household_name text not null,
  inviter_name text not null default '',
  invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  unique (household_id, email)
);
create index household_invites_email_idx on public.household_invites (email);

alter table public.household_invites enable row level security;

-- The household's members see its invites; the person invited sees invites to their own email.
create policy "members and the invited see invites" on public.household_invites
  for select to authenticated
  using (public.is_member(household_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Invite someone. Returns what happened, so the app can say the right thing.
create function public.invite_to_household(hid uuid, invite_email text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(trim(invite_email));
  h public.households;
  me text;
  invite_id uuid;
  existing uuid;
begin
  if auth.uid() is null or not public.is_member(hid) then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'bad email' using errcode = '22023';
  end if;
  select * into h from public.households where id = hid;
  select u.id into existing from auth.users u where lower(u.email) = e;
  if existing is not null and exists (
    select 1 from public.household_members m where m.household_id = hid and m.user_id = existing
  ) then
    return jsonb_build_object('status', 'already_member');
  end if;
  select display_name into me from public.profiles where id = auth.uid();

  insert into public.household_invites (household_id, email, household_name, inviter_name, invited_by)
  values (hid, e, h.name, coalesce(me, ''), auth.uid())
  on conflict (household_id, email) do update
    set declined_at = null, accepted_at = null, invited_by = excluded.invited_by,
        inviter_name = excluded.inviter_name, household_name = excluded.household_name, created_at = now()
  returning id into invite_id;

  return jsonb_build_object('status', 'invited', 'invite_id', invite_id, 'has_account', existing is not null);
end;
$$;

-- Say yes: join the household. Only the person the invite was sent to can do this.
create function public.accept_invite(invite uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i public.household_invites;
begin
  select * into i from public.household_invites
  where id = invite and email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if i.id is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  insert into public.household_members (household_id, user_id) values (i.household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;
  update public.household_invites set accepted_at = now(), declined_at = null where id = i.id;
  return i.household_id;
end;
$$;

-- Say no thanks.
create function public.decline_invite(invite uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.household_invites set declined_at = now()
  where id = invite and email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Joining with the address also counts as saying yes to any invite for that household.
create function public.accept_invites_on_join() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.household_invites i set accepted_at = now()
  from auth.users u
  where u.id = new.user_id and i.household_id = new.household_id and i.email = lower(u.email) and i.accepted_at is null;
  return new;
end;
$$;

create trigger on_member_joined
  after insert on public.household_members
  for each row execute function public.accept_invites_on_join();

revoke execute on function public.invite_to_household(uuid, text) from public, anon;
revoke execute on function public.accept_invite(uuid) from public, anon;
revoke execute on function public.decline_invite(uuid) from public, anon;
grant execute on function public.invite_to_household(uuid, text) to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.decline_invite(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.household_invites;
  end if;
end;
$$;

-- The invite email is written in the language of the person invited, if they already use Pichigoose.
-- Only the email function (service role) can call this.
create function public.language_for_email(e text) returns text
language sql stable security definer set search_path = '' as $$
  select p.language from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower(e) limit 1;
$$;
revoke execute on function public.language_for_email(text) from public, anon, authenticated;
grant execute on function public.language_for_email(text) to service_role;
