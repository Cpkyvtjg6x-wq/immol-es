-- 008_usage_counters.sql
-- Compteurs d'usage génériques :
--   • quota IA mensuel par utilisateur  (bucket "ai:<userId>:<YYYY-MM>")
--   • rate-limit par IP sur le endpoint public (bucket "rl:qa:<ip>:<fenêtre>")
-- Tout l'accès se fait côté serveur via la service_role (admin) → RLS deny-all par
-- défaut (aucune policy = personne d'autre ne peut lire/écrire).

create table if not exists public.usage_counters (
  bucket      text primary key,
  count       integer not null default 0,
  expires_at  timestamptz not null
);

alter table public.usage_counters enable row level security;
-- Volontairement AUCUNE policy : seuls les clients service_role (bypass RLS) y accèdent.

create index if not exists usage_counters_expires_idx on public.usage_counters (expires_at);

-- Incrément atomique avec fenêtre par expiration (un seul aller-retour réseau).
-- Retourne si l'appel reste autorisé (count <= limite) et la valeur courante.
create or replace function public.incr_usage(
  p_bucket       text,
  p_limit        integer,
  p_ttl_seconds  integer
)
returns table(allowed boolean, current_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.usage_counters (bucket, count, expires_at)
  values (p_bucket, 1, now() + make_interval(secs => p_ttl_seconds))
  on conflict (bucket) do update
    set count = case
                  when public.usage_counters.expires_at < now() then 1
                  else public.usage_counters.count + 1
                end,
        expires_at = case
                  when public.usage_counters.expires_at < now() then now() + make_interval(secs => p_ttl_seconds)
                  else public.usage_counters.expires_at
                end
  returning count into v_count;

  return query select (v_count <= p_limit), v_count;
end;
$$;

-- Durcissement : incr_usage ne doit être appelable QUE par la service_role
-- (le serveur l'appelle via l'admin client). On retire l'EXECUTE accordé par défaut
-- à PUBLIC/anon/authenticated pour éviter tout appel via /rest/v1/rpc.
revoke all on function public.incr_usage(text, integer, integer) from public;
revoke all on function public.incr_usage(text, integer, integer) from anon;
revoke all on function public.incr_usage(text, integer, integer) from authenticated;
grant execute on function public.incr_usage(text, integer, integer) to service_role;

-- Nettoyage manuel possible : delete from public.usage_counters where expires_at < now();
