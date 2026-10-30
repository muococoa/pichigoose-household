-- Pinned to-dos (Nora, 30 Oct): swipe a to-do right to pin it, like a chat in WhatsApp. Pinned ones stay at the top
-- of the list for everyone in the household until they're done. Same idea as notes.pinned.
alter table public.todos add column if not exists pinned boolean not null default false;
