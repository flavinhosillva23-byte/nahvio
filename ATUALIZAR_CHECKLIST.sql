-- Execute uma vez no Supabase > SQL Editor antes de usar responsáveis e participantes.
alter table public.tasks add column if not exists category text;
alter table public.tasks add column if not exists responsible_guest_id uuid;
alter table public.tasks add column if not exists participant_guest_ids uuid[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_responsible_guest_id_fkey') then
    alter table public.tasks add constraint tasks_responsible_guest_id_fkey
      foreign key (responsible_guest_id) references public.guests(id) on delete set null;
  end if;
end $$;

create index if not exists tasks_responsible_guest_idx on public.tasks(responsible_guest_id);
