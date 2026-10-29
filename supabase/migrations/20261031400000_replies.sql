-- Replies (Nora, 29 Oct): answer one message in the chat (swipe it, like WhatsApp), or one comment (Reply under
-- it, like Instagram). The reply keeps a link to what it answers; if that's deleted, the reply stays and shows
-- "Message deleted" where the quote was.

alter table public.messages add column reply_to uuid references public.messages (id) on delete set null;
alter table public.comments add column reply_to uuid references public.comments (id) on delete set null;
