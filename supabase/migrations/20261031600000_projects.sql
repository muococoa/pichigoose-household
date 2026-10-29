-- Projects (Nora, 29 Oct): bigger house goals, like "Kitchen renewal" or "Living room", made of steps.
--   Steps to do are to-dos with a project (they also show in the To-dos tab, with the project's name).
--   Things to buy go on the project's own shopping list, a washi tab in Shopping named after the project.
--   Both keep the order people drag them into. A finished project keeps everything, and its list leaves Shopping.
--   Deleting a project deletes its to-dos and its shopping list (the app asks first).

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index projects_household on public.projects (household_id);

alter table public.projects enable row level security;
create policy "members manage projects" on public.projects
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

-- A to-do can be a step of a project, in its place in the project's order.
alter table public.todos add column project_id uuid references public.projects (id) on delete cascade;
alter table public.todos add column position int not null default 0;
create index todos_project on public.todos (project_id);

-- A shopping list can be a project's list.
alter table public.lists add column project_id uuid references public.projects (id) on delete cascade;
create index lists_project on public.lists (project_id);

-- A to-do or a list always belongs to the same household as its project, whatever the app sends.
create function public.project_household() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.project_id is not null then
    select p.household_id into new.household_id from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;
create trigger todo_project_household before insert or update of project_id on public.todos
  for each row execute function public.project_household();
create trigger list_project_household before insert or update of project_id on public.lists
  for each row execute function public.project_household();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.projects;
  end if;
end;
$$;
