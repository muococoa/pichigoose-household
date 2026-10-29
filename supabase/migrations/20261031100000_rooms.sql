-- Rooms and storage spots (Nora and Danko, 31 Oct). A household has rooms (Kitchen, Bathroom, ...), and
-- each room has storage spots (Pantry, Bathroom cabinet, Bathtub shelf, a second cabinet...). Every
-- pantry thing lives in one spot and can be moved to another.
--   kind decides which drawings a room offers: kitchen, bathroom, or other (all of them).
-- pantry_items.place stays, kept in step with the spot's room, so older copies of the app still work.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  kind text not null default 'other' check (kind in ('kitchen', 'bathroom', 'other')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index rooms_household on public.rooms (household_id);

create table public.storage_spots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index storage_spots_room on public.storage_spots (room_id);

alter table public.rooms enable row level security;
alter table public.storage_spots enable row level security;
create policy "members manage rooms" on public.rooms
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage storage spots" on public.storage_spots
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

-- A spot always belongs to the same household as its room.
create function public.storage_spot_household() returns trigger
language plpgsql set search_path = '' as $$
begin
  select household_id into new.household_id from public.rooms where id = new.room_id;
  return new;
end;
$$;
create trigger storage_spot_household before insert or update of room_id on public.storage_spots
  for each row execute function public.storage_spot_household();

-- The first rooms and spots of a household, named in the creator's language.
create function public.seed_storage(hid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  lang text;
  kitchen uuid;
  bathroom uuid;
begin
  if exists (select 1 from public.rooms where household_id = hid) then
    return;
  end if;
  select coalesce(p.language, 'en') into lang
    from public.households h left join public.profiles p on p.id = h.created_by where h.id = hid;
  insert into public.rooms (household_id, name, kind, position)
    values (hid, case when lang = 'sr' then 'Kuhinja' else 'Kitchen' end, 'kitchen', 0) returning id into kitchen;
  insert into public.rooms (household_id, name, kind, position)
    values (hid, case when lang = 'sr' then 'Kupatilo' else 'Bathroom' end, 'bathroom', 1) returning id into bathroom;
  insert into public.storage_spots (household_id, room_id, name, position)
    values (hid, kitchen, case when lang = 'sr' then 'Ostava' else 'Pantry' end, 0),
           (hid, bathroom, case when lang = 'sr' then 'Kupatilski ormarić' else 'Bathroom cabinet' end, 0);
end;
$$;
revoke execute on function public.seed_storage(uuid) from public, anon, authenticated;

create function public.seed_storage_on_create() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_storage(new.id);
  return new;
end;
$$;
create trigger seed_storage after insert on public.households
  for each row execute function public.seed_storage_on_create();

-- Pantry things live in a spot. Deleting a spot clears it (the app asks first).
alter table public.pantry_items add column spot_id uuid references public.storage_spots (id) on delete cascade;
create index pantry_items_spot on public.pantry_items (spot_id);

-- Keep spot and place in step: a thing added the old way (only place) goes to that room's first spot;
-- a thing in a spot gets the place of its room's kind.
create function public.pantry_item_spot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k text;
begin
  if new.spot_id is null then
    perform public.seed_storage(new.household_id);
    select s.id into new.spot_id
      from public.storage_spots s join public.rooms r on r.id = s.room_id
      where s.household_id = new.household_id and r.kind = case when new.place = 'bathroom' then 'bathroom' else 'kitchen' end
      order by r.position, s.position, s.created_at limit 1;
  end if;
  select r.kind into k from public.storage_spots s join public.rooms r on r.id = s.room_id where s.id = new.spot_id;
  new.place := case when k = 'bathroom' then 'bathroom' else 'pantry' end;
  return new;
end;
$$;
create trigger pantry_item_spot before insert or update of spot_id, place on public.pantry_items
  for each row execute function public.pantry_item_spot();

-- Existing households: their first rooms, and every thing into its spot.
do $$
declare h record;
begin
  for h in select id from public.households loop
    perform public.seed_storage(h.id);
  end loop;
end;
$$;
update public.pantry_items set spot_id = null;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms;
    alter publication supabase_realtime add table public.storage_spots;
  end if;
end;
$$;
