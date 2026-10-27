-- Pichigoose: phase 1 and 2 tables (see docs/DATA.md).
-- Profiles, households, members, shopping lists, to-dos and notes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar jsonb not null default '{"character": "onigiri", "color": "blush", "accessory": null}',
  language text not null default 'en' check (language in ('en', 'sr')),
  theme text not null default 'pichigoose',
  track_money boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null unique,
  kind text not null default 'home' check (kind in ('home', 'event')),
  event_date date,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  home_layout jsonb not null default '[
    {"section": "news", "visible": true},
    {"section": "shopping", "visible": true},
    {"section": "todos", "visible": true},
    {"section": "money", "visible": true},
    {"section": "notes", "visible": true}
  ]',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index lists_household_idx on public.lists (household_id);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  name text not null,
  note text,
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  position int not null default 0
);
create index list_items_list_idx on public.list_items (list_id);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  repeat text check (repeat in ('daily', 'weekly', 'monthly')),
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index todos_household_idx on public.todos (household_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index notes_household_idx on public.notes (household_id);

-- ---------------------------------------------------------------------------
-- Helpers for the access rules
-- ---------------------------------------------------------------------------

create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create function public.can_access_list(lid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lists l
    join public.household_members m on m.household_id = l.household_id
    where l.id = lid and m.user_id = auth.uid()
  );
$$;

create function public.shares_household(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.todos enable row level security;
alter table public.notes enable row level security;

create policy "see yourself and housemates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_household(id));
create policy "edit only yourself" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Households are created and joined only through the functions below.
create policy "members see the household" on public.households
  for select to authenticated using (public.is_member(id));
create policy "members edit the household" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members see each other" on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy "change only your own row" on public.household_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave on your own" on public.household_members
  for delete to authenticated using (user_id = auth.uid());

create policy "members manage lists" on public.lists
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "members manage items" on public.list_items
  for all to authenticated
  using (public.can_access_list(list_id)) with check (public.can_access_list(list_id));

create policy "members manage to-dos" on public.todos
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "members manage notes" on public.notes
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ---------------------------------------------------------------------------
-- A profile for every new account
-- ---------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  characters text[] := array['onigiri', 'lemon', 'mug', 'marshmallow'];
  colors text[] := array['blush', 'mint', 'mist', 'sage', 'peach', 'butter', 'lilac', 'sand'];
  lang text := coalesce(new.raw_user_meta_data ->> 'language', 'en');
begin
  insert into public.profiles (id, display_name, language, avatar)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      initcap(split_part(coalesce(new.email, ''), '@', 1))
    ),
    case when lang in ('en', 'sr') then lang else 'en' end,
    jsonb_build_object(
      'character', characters[1 + floor(random() * array_length(characters, 1))::int],
      'color', colors[1 + floor(random() * array_length(colors, 1))::int],
      'accessory', null
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Three-word addresses
-- ---------------------------------------------------------------------------

-- Short, friendly words only. No two words look alike.
create function public.address_words() returns text[]
language sql immutable as $$
  select array[
    'acorn','apple','apricot','attic','autumn','bagel','bakery','balloon','bamboo','banana',
    'banjo','basket','beach','beanie','berry','biscuit','blossom','blueberry','bonnet',
    'breeze','brook','bubble','button','cabin','cactus','caramel','carrot','castle',
    'chestnut','chime','cinnamon','clover','cocoa','coconut','comet','compass','cookie',
    'cozy','crayon','crumpet','cupcake','daisy','dandelion','dewdrop','dimple','dolphin',
    'donut','dragonfly','drizzle','dumpling','echo','elbow','ember','feather','fern','fig',
    'firefly','flannel','flute','fox','freckle','frosty','fudge','garden','glitter','goose',
    'gravy','hammock','harbor','hedgehog','honey','iris','island','ivy','jam','jigsaw',
    'jolly','juniper','kettle','kiwi','koala','lagoon','lantern','lavender','lemon','lilac',
    'llama','lobster','lollipop','lotus','lucky','lullaby','mango','marble','marigold',
    'meadow','mint','mitten','mochi','moon','muffin','mushroom','nectar','noodle','nugget',
    'nutmeg','ocean','olive','orange','orchid','otter','owl','pancake','panda','paper',
    'parsley','peanut','pecan','pickle','picnic','pillow','pinwheel','pistachio','plum',
    'pocket','potato','pretzel','pumpkin','quilt','rabbit','radish','rainbow','raisin',
    'raspberry','ribbon','saffron','sage','sailor','salsa','sesame','shell','sherbet',
    'slipper','snail','snowy','sparrow','spoon','sprout','squash','sugar','summer','sunny',
    'swan','sweater','tadpole','teacup','thistle','tiger','toast','toffee','tulip','umbrella',
    'velvet','violet','waffle','walnut','whisker','winter','wren','yogurt','yolk','zebra',
    'zinnia'
  ];
$$;

-- People type addresses with dots, spaces or dashes. "Lemon Sunny-Goose" becomes "lemon.sunny.goose".
create function public.normalize_address(raw text) returns text
language sql immutable as $$
  select trim(both '.' from regexp_replace(lower(coalesce(raw, '')), '[^a-z]+', '.', 'g'));
$$;

create function public.random_address() returns text
language sql volatile as $$
  select string_agg(word, '.')
  from (
    select w.word from unnest(public.address_words()) as w (word)
    order by random() limit 3
  ) picked;
$$;

-- ---------------------------------------------------------------------------
-- Create, join and leave
-- ---------------------------------------------------------------------------

-- first_list_name comes from the app in the person's language ("Groceries", "Namirnice").
create function public.create_household(household_name text, first_list_name text)
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
      insert into public.households (name, address, created_by)
      values (trim(household_name), public.random_address(), auth.uid())
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

-- Returns the household id. Joining twice only updates your label.
create function public.join_household(address text, label text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select h.id into hid from public.households h
  where h.address = public.normalize_address(join_household.address);
  if hid is null then
    raise exception 'address_not_found' using errcode = 'P0002';
  end if;

  insert into public.household_members (household_id, user_id, label)
  values (hid, auth.uid(), nullif(trim(join_household.label), ''))
  on conflict (household_id, user_id)
  do update set label = coalesce(excluded.label, public.household_members.label);
  return hid;
end;
$$;

-- When the last member leaves, the household and everything in it is deleted.
create function public.delete_empty_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.households h
  where h.id = old.household_id
    and not exists (select 1 from public.household_members m where m.household_id = old.household_id);
  return null;
end;
$$;

create trigger on_member_left
  after delete on public.household_members
  for each row execute function public.delete_empty_household();

-- Notes remember who changed them last.
create function public.touch_note() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger on_note_changed
  before update on public.notes
  for each row execute function public.touch_note();

revoke execute on function public.create_household(text, text) from public, anon;
revoke execute on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Live updates
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.lists, public.list_items, public.todos, public.notes, public.household_members, public.households;
  end if;
end;
$$;
