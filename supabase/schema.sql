-- Agenda del maestro: una fila por usuario con todos los datos en JSON.
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run.
create table if not exists public.agenda (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  version    integer     not null default 1,
  updated_at timestamptz not null default now()
);

-- Seguridad por fila: cada usuario solo ve y modifica su propia fila.
alter table public.agenda enable row level security;

drop policy if exists "agenda_select_own" on public.agenda;
drop policy if exists "agenda_insert_own" on public.agenda;	
drop policy if exists "agenda_update_own" on public.agenda;

create policy "agenda_select_own" on public.agenda for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "agenda_insert_own" on public.agenda for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "agenda_update_own" on public.agenda for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Sin política de DELETE: nadie puede borrar la fila desde el navegador.

-- Sin sesión (rol anon) no hay acceso alguno a la tabla.
revoke all on public.agenda from anon;
grant select, insert, update on public.agenda to authenticated;

-- Preferencias de uso (favoritos y abiertos recientemente): una fila por usuario.
create table if not exists public.preferencias (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.preferencias enable row level security;

drop policy if exists "pref_select_own" on public.preferencias;
drop policy if exists "pref_insert_own" on public.preferencias;
drop policy if exists "pref_update_own" on public.preferencias;

create policy "pref_select_own" on public.preferencias for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "pref_insert_own" on public.preferencias for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "pref_update_own" on public.preferencias for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.preferencias from anon;
grant select, insert, update on public.preferencias to authenticated;
