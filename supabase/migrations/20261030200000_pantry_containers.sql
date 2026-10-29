-- More bathroom containers (Nora, 30 Oct): a dropper (serums), a detergent jug (detergent,
-- fabric softener), a cream jar (moisturizer), a lotion bottle (sunscreen, body lotion), a perfume
-- bottle and a body mist bottle.
alter table public.pantry_items drop constraint pantry_items_container_check;
alter table public.pantry_items add constraint pantry_items_container_check
  check (container in ('jar', 'bottle', 'box', 'bag', 'can', 'carton', 'tube', 'pump', 'spray', 'dropper', 'jug', 'creamjar', 'lotion', 'perfume', 'mist'));
