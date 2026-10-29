-- Categories inside a shopping list (Nora, 29 Oct): items can sit under small headings, like "skin care" and "hair"
-- inside DM. Free text, picked or typed in the item's pop-up; items without one sit under "other".

alter table public.list_items add column category text check (category is null or length(trim(category)) between 1 and 40);
