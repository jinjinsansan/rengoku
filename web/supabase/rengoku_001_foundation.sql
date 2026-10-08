-- Rengoku (田辺チーム専用会員サイト) の土台 — 2026-10-09
-- bafather.uk と同じ Supabase に「rg_ で始まる表」を足すだけ。既存の表 (profiles / billing / receiver_* /
-- daily_pnl_log など) は変えない。何度流しても壊れないように IF NOT EXISTS / OR REPLACE で書く。
--
-- 課金の考え方:
--   Rengoku の会員は bafather.uk 側では billing.is_free = true・profit_share_rate = 0 にしておく。
--   → bafather.uk の 0:05 の締めは daily_pnl_log に「マスターが数えた正しい損益」を記録するだけ
--     (日次の残高引き落とし・自動停止・週次の請求書は起きない)。
--   → Rengoku の締め (0:15) が daily_pnl_log から rg_daily_charges を作る (期限 24 時間・期限後は案内だけ)。

-- ── 会員 (チームの印) ─────────────────────────────────────────────────────
create table if not exists public.rg_members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('member', 'staff', 'owner')),
  staff_label  text,                      -- 運営の肩書き (例: 師範 / 運営 / 技術)
  display_name text,
  bio          text,
  avatar_url   text,
  title        text,                      -- チーム内の称号 (段階)
  joined_at    timestamptz not null default now(),
  salon_seen_at timestamptz,              -- サロンを最後に見た時刻 (未読の数の基準)
  settings     jsonb not null default '{}'::jsonb,   -- 音・振動・動き・通知
  updated_at   timestamptz not null default now()
);

create or replace function public.rg_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rg_members where user_id = auth.uid());
$$;

create or replace function public.rg_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rg_members where user_id = auth.uid() and role in ('staff', 'owner'));
$$;

-- ── 設定 (率など・あとで決める値) ─────────────────────────────────────────
create table if not exists public.rg_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.rg_settings(key, value) values
  ('charge_rate', '0.30'::jsonb),            -- その日の利益に対するチャージの率
  ('charge_due_hours', '24'::jsonb),         -- 支払いの期限 (締めから何時間)
  ('referral', '{"mode": "off", "rate": 0}'::jsonb)   -- 紹介報酬: mode = off / charge_pct (紹介した人のチャージの rate)
on conflict (key) do nothing;

-- ── サロン ───────────────────────────────────────────────────────────────
create table if not exists public.rg_salons (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
insert into public.rg_salons(slug, name, description)
values ('rengoku', 'Rengoku サロン', '運営からの活動報告・懇親会・メンテナンスのお知らせ')
on conflict (slug) do nothing;

create table if not exists public.rg_posts (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.rg_salons(id) on delete cascade,
  author_id     uuid not null references auth.users(id),
  kind          text not null default 'report' check (kind in ('report', 'event', 'maintenance', 'general')),
  title         text not null,
  body          text not null default '',
  images        jsonb not null default '[]'::jsonb,   -- [{url, w, h}] (Storage の rg-salon バケット)
  pinned        boolean not null default false,
  event_at      timestamptz,             -- 懇親会の日時
  event_capacity integer,                -- 懇親会の定員
  starts_at     timestamptz,             -- メンテナンスの開始
  ends_at       timestamptz,             -- メンテナンスの終了
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists rg_posts_salon_pub on public.rg_posts(salon_id, published_at desc);

create table if not exists public.rg_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.rg_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  body       text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists rg_comments_post on public.rg_comments(post_id, created_at);

create table if not exists public.rg_reactions (
  post_id    uuid not null references public.rg_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  emoji      text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table if not exists public.rg_event_rsvps (
  post_id    uuid not null references public.rg_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  status     text not null check (status in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── 通知 (サイト内のみ・メールは送らない) ─────────────────────────────────
create table if not exists public.rg_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,             -- post / event / maintenance / charge_due / charge_paid / referral
  ref_id     uuid,
  title      text not null,
  body       text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists rg_notifications_user on public.rg_notifications(user_id, created_at desc);

-- ── チャージ (0:00 締め・24 時間以内に送金) ───────────────────────────────
create table if not exists public.rg_daily_charges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  settle_date   date not null,            -- 日本時間の対象日
  daily_pnl     numeric(14,2) not null,   -- その日の利益 (daily_pnl_log.bet_pnl = マスターが数えた値)
  pnl_source    text,
  rate          numeric(6,4) not null,
  charge_amount numeric(14,2) not null,   -- 利益がプラスの時だけ > 0
  status        text not null default 'due' check (status in ('none', 'due', 'paid', 'waived')),
  due_at        timestamptz,              -- 期限 (締め + 24 時間)。過ぎても自動で止めない (案内だけ)
  paid_at       timestamptz,
  payment_ref   text,                     -- 入金の照合 (crypto_payments.id など)
  note          text,
  created_at    timestamptz not null default now(),
  unique (user_id, settle_date)
);
create index if not exists rg_daily_charges_status on public.rg_daily_charges(status, due_at);

-- ── 紹介報酬の土台 (率と方式は rg_settings.referral で後から決める) ───────
create table if not exists public.rg_referral_rewards (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id),
  referred_id uuid not null references auth.users(id),
  charge_id   uuid references public.rg_daily_charges(id) on delete set null,
  base_amount numeric(14,2) not null,     -- 元になったチャージの額
  rate        numeric(6,4) not null,
  amount      numeric(14,2) not null,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique (charge_id, referrer_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.rg_members          enable row level security;
alter table public.rg_settings         enable row level security;
alter table public.rg_salons           enable row level security;
alter table public.rg_posts            enable row level security;
alter table public.rg_comments         enable row level security;
alter table public.rg_reactions        enable row level security;
alter table public.rg_event_rsvps      enable row level security;
alter table public.rg_notifications    enable row level security;
alter table public.rg_daily_charges    enable row level security;
alter table public.rg_referral_rewards enable row level security;

-- 会員: チームの人は互いの公開プロフィールを読める・自分の行だけ直せる (role は直せない = サーバー側で管理)
drop policy if exists rg_members_read on public.rg_members;
create policy rg_members_read on public.rg_members for select using (public.rg_is_member());
drop policy if exists rg_members_update_self on public.rg_members;
create policy rg_members_update_self on public.rg_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = (select m.role from public.rg_members m where m.user_id = auth.uid()));

drop policy if exists rg_settings_read on public.rg_settings;
create policy rg_settings_read on public.rg_settings for select using (public.rg_is_member());

drop policy if exists rg_salons_read on public.rg_salons;
create policy rg_salons_read on public.rg_salons for select using (public.rg_is_member());

-- 投稿: 会員は読む・運営だけ書く
drop policy if exists rg_posts_read on public.rg_posts;
create policy rg_posts_read on public.rg_posts for select using (public.rg_is_member() and deleted_at is null);
drop policy if exists rg_posts_staff_write on public.rg_posts;
create policy rg_posts_staff_write on public.rg_posts for all using (public.rg_is_staff()) with check (public.rg_is_staff());

-- コメント: 会員は読む・自分の分を書く/消す。運営は全部消せる
drop policy if exists rg_comments_read on public.rg_comments;
create policy rg_comments_read on public.rg_comments for select using (public.rg_is_member() and deleted_at is null);
drop policy if exists rg_comments_insert on public.rg_comments;
create policy rg_comments_insert on public.rg_comments for insert with check (public.rg_is_member() and user_id = auth.uid());
drop policy if exists rg_comments_update on public.rg_comments;
create policy rg_comments_update on public.rg_comments for update using (user_id = auth.uid() or public.rg_is_staff());

drop policy if exists rg_reactions_read on public.rg_reactions;
create policy rg_reactions_read on public.rg_reactions for select using (public.rg_is_member());
drop policy if exists rg_reactions_write on public.rg_reactions;
create policy rg_reactions_write on public.rg_reactions for all
  using (user_id = auth.uid()) with check (public.rg_is_member() and user_id = auth.uid());

drop policy if exists rg_rsvps_read on public.rg_event_rsvps;
create policy rg_rsvps_read on public.rg_event_rsvps for select using (public.rg_is_member());
drop policy if exists rg_rsvps_write on public.rg_event_rsvps;
create policy rg_rsvps_write on public.rg_event_rsvps for all
  using (user_id = auth.uid()) with check (public.rg_is_member() and user_id = auth.uid());

-- 通知・チャージ・紹介報酬: 自分の分だけ読む (書くのはサーバー = service role)
drop policy if exists rg_notifications_own on public.rg_notifications;
create policy rg_notifications_own on public.rg_notifications for select using (user_id = auth.uid());
drop policy if exists rg_notifications_mark_read on public.rg_notifications;
create policy rg_notifications_mark_read on public.rg_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rg_charges_own on public.rg_daily_charges;
create policy rg_charges_own on public.rg_daily_charges for select using (user_id = auth.uid() or public.rg_is_staff());
drop policy if exists rg_referral_own on public.rg_referral_rewards;
create policy rg_referral_own on public.rg_referral_rewards for select using (referrer_id = auth.uid() or public.rg_is_staff());

-- ── 運営 3 名と既存の会員の登録 (メールアドレスは SQL エディタで書き換えてから流す) ──
-- insert into public.rg_members(user_id, role, staff_label, display_name)
-- select id, 'owner', '運営', 'オーナー' from public.profiles where email = 'OWNER_EMAIL'
-- on conflict (user_id) do update set role = excluded.role, staff_label = excluded.staff_label;
-- (田辺さん = 'staff' / '師範'、山口さん = 'staff' / '技術' も同じ形で)
--
-- ★既存の bafather.uk の会員を Rengoku の一般会員にする時は、bafather.uk 側の課金を必ず「無料・0%」にする
--   (初期値の「有料・30%」のままだと bafather.uk の 0:05 の締めが残高から引き、足りないと停止 = 受け子が止まる):
-- insert into public.billing(user_id, is_free, profit_share_rate) select id, true, 0 from public.profiles where email = 'MEMBER_EMAIL'
-- on conflict (user_id) do update set is_free = true, profit_share_rate = 0, updated_at = now();
