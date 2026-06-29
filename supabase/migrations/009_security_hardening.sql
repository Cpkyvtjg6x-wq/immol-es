-- 009_security_hardening.sql
-- Durcissement sécurité suite aux findings de l'advisor Supabase (juin 2026).
-- Appliqué en prod le 30 juin 2026. Aucun impact fonctionnel (vue non utilisée
-- par l'app, trigger de signup inchangé, fonctions à objets qualifiés/pg_catalog).

-- 1) Vue simulations_with_profile : SECURITY DEFINER -> SECURITY INVOKER.
--    La vue applique désormais le RLS de l'utilisateur qui interroge (et non
--    celui du créateur). Corrige le lint ERROR 0010. Les RLS de
--    simulations/profiles scopent déjà à auth.uid().
alter view public.simulations_with_profile set (security_invoker = true);

-- 2) handle_new_user : search_path fixe + retrait de l'exposition RPC.
--    Reste SECURITY DEFINER (nécessaire pour créer le profil au signup via le
--    trigger). Le trigger on_auth_user_created continue de fonctionner :
--    Postgres ne vérifie pas le privilège EXECUTE au déclenchement d'un trigger.
--    Corrige les lints 0011 (search_path) + 0028/0029 (exécutable anon/authenticated).
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3) handle_updated_at : search_path fixe (corps n'utilise que now(), pg_catalog).
--    Corrige le lint 0011.
alter function public.handle_updated_at() set search_path = '';

-- 4) usage_counters : RLS activé volontairement SANS policy = deny-all pour
--    anon/authenticated ; seul le service_role (serveur) et la RPC incr_usage
--    (security definer) y accèdent. Le lint 0008 reste en INFO (comportement
--    voulu) ; commentaire pour lever l'ambiguïté.
comment on table public.usage_counters is
  'RLS active sans policy = acces refuse aux clients (anon/authenticated). Acces uniquement via service_role (serveur) et RPC incr_usage. Intentionnel.';
