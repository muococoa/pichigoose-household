-- A flat box, half the height of the box, for daily liners (Nora, 30 Oct).
alter table public.pantry_items drop constraint pantry_items_container_check;
alter table public.pantry_items add constraint pantry_items_container_check
  check (container in ('jar', 'bottle', 'box', 'bag', 'can', 'carton', 'tube', 'pump', 'spray', 'dropper', 'jug', 'creamjar', 'lotion', 'perfume', 'mist', 'flatbox'));
