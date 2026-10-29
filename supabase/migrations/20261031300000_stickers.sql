-- Stickers (Nora, 29 Oct): send one of Nora's painted stickers in a comment or a chat message, from a
-- small sticker button next to Send. Your pack follows your avatar (onigiri people get onigiri stickers,
-- ramen people ramen ones); characters without their own sheet yet get Pichi goose stickers.
--   sticker is the sticker's name, like 'onigiri/love'. The drawings live in the app, not the database.
-- A sticker message has no text, so the text may be empty when there is a sticker.

alter table public.comments add column sticker text check (sticker ~ '^[a-z0-9-]+/[a-z0-9-]+$');
alter table public.comments alter column body set default '';
alter table public.comments drop constraint comments_body_check;
alter table public.comments add constraint comments_body_check
  check (length(body) <= 2000 and (sticker is not null or length(trim(body)) >= 1));

alter table public.messages add column sticker text check (sticker ~ '^[a-z0-9-]+/[a-z0-9-]+$');
alter table public.messages alter column body set default '';
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (length(body) <= 4000 and (sticker is not null or length(trim(body)) >= 1));
