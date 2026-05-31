-- ============================================================
-- IMMORA — Migration 005 : Idempotence webhook Stripe
-- ============================================================
-- Stripe peut renvoyer le même event plusieurs fois en cas de
-- timeout/retry. Cette table journalise les events traités pour
-- bloquer les doublons (insertion avec event_id en PK).
--
-- Sert aussi de traçabilité pour debug en cas de souci paiement.
-- ============================================================

create table if not exists public.billing_events (
  event_id   text        primary key,
  type       text        not null,
  livemode   boolean     not null default true,
  user_id    uuid        references public.profiles(id) on delete set null,
  customer   text,
  payload    jsonb       not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_idx     on public.billing_events(user_id);
create index if not exists billing_events_customer_idx on public.billing_events(customer);
create index if not exists billing_events_created_idx  on public.billing_events(created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────
-- Seul le service role (webhook) écrit. Les users peuvent lire
-- leurs propres events (utile pour debug côté client).
alter table public.billing_events enable row level security;

drop policy if exists "billing_events_read_own"   on public.billing_events;
drop policy if exists "billing_events_admin_all"  on public.billing_events;

create policy "billing_events_read_own"
  on public.billing_events for select
  using (auth.uid() = user_id);
