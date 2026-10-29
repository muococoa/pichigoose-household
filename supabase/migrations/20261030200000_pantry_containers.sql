-- More bathroom containers (Nora, 30 Oct): a dropper (serums), a detergent jug (detergent,
-- fabric softener), a cream jar (moisturizer) and a lotion bottle (sunscreen, body lotion).
alter table public.pantry_items drop constraint pantry_items_container_check;
alter table public.pantry_items add constraint pantry_items_container_check
  check (container in ('jar', 'bottle', 'box', 'bag', 'can', 'carton', 'tube', 'pump', 'spray', 'dropper', 'jug', 'creamjar', 'lotion'));
