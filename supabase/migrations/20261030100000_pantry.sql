-- The pantry (Nora, 30 Oct): drawn shelves with jars, bottles and boxes, each showing how full it is.
-- Two places in every household: the pantry (food) and the bathroom cabinet (cleaning supplies,
-- cosmetics, skincare). When something runs low, Pichi puts it on the shopping list by herself, and
-- buying it fills it back up.

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  place text not null default 'pantry' check (place in ('pantry', 'bathroom')),
  name text not null check (length(trim(name)) between 1 and 80),
  -- Which drawing it gets on the shelf.
  container text not null default 'jar' check (container in ('jar', 'bottle', 'box', 'bag', 'can', 'carton', 'tube', 'pump', 'spray')),
  -- How full it is, 0 to 100.
  level smallint not null default 100 check (level between 0 and 100),
  -- At or below this, Pichi puts it on the shopping list.
  low_at smallint not null default 20 check (low_at between 0 and 90),
  -- The list Pichi puts it on. Empty: the household's first list.
  list_id uuid references public.lists (id) on delete set null,
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index pantry_items_household on public.pantry_items (household_id);

alter table public.pantry_items enable row level security;
create policy "members manage the pantry" on public.pantry_items
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- Shopping items remember which pantry thing they're for (buying it fills it up again),
-- and whether Pichi put them on the list.
alter table public.list_items
  add column pantry_item_id uuid references public.pantry_items (id) on delete set null,
  add column added_by_pichi boolean not null default false;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.pantry_items;
  end if;
end;
$$;
