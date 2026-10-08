# Rengoku web (会員アプリ)

Next.js 15 (App Router) + Supabase。**bafather.uk と同じ Supabase** を使い、Rengoku 専用の表 (`rg_*`) を足している。
見た目は仮 (brief のトークンだけ)。Claude Design のデザインが届いたら作り込む。

## 画面
| 道 | 中身 |
|---|---|
| `/` | TOP (ログイン前・ボタン 2 つ) |
| `/login` `/signup` | ログイン・登録 (招待コード必須・紹介コード `?ref=`) |
| `/home` | ダッシュボード (今日の利益・受け子・精算・サロン新着・今週・紹介) |
| `/salon` `/salon/[id]` | サロン (運営だけ投稿・コメント・リアクション・懇親会の出欠) |
| `/bets` | BET 履歴 (今日 / 7 日 / 今月 / 日ごと / 1 回ずつ) |
| `/settlement` | 精算 (0:00 締め・24 時間以内・送金の手順・これまで) |
| `/me` `/referral` `/notifications` | マイページ・紹介・通知 |
| `/api/cron/charges` | Rengoku の締め (毎日 0:15 JST) |

## お金の流れ
1. 受け子の BET → マスター (VPS) が受け子ごとの 1 日の損益を数える (`/api/mirror/daily-pnl`)
2. bafather.uk の締め (0:05) がそれを `daily_pnl_log` に記録する (Rengoku の会員は bafather.uk 側を「無料・0%」にしておくので、記録だけ)
3. Rengoku の締め (0:15) が `rg_daily_charges` を作る (利益 × 率・期限 24 時間・期限後も案内だけ)

## はじめて動かす時の手順
1. Supabase の SQL エディタで `supabase/rengoku_001_foundation.sql` を流す (表を足すだけ・既存の表は変えない)
2. 同じファイルの末尾の例のとおり、運営 3 名を `rg_members` に登録する (role = owner / staff)
3. Vercel に新しいプロジェクトを作る: リポジトリ `jinjinsansan/rengoku`・Root Directory = `web`
4. 環境変数 (`.env.example` の名前): Supabase の 3 つ (SUPABASE_URL・SUPABASE_ANON_KEY・SUPABASE_SERVICE_ROLE_KEY。NEXT_PUBLIC_ は付けない)・`CRON_SECRET`・`PAYMENT_USDT_TRC20_ADDRESS`
5. ドメインをつなぐ。Supabase の Authentication → URL Configuration の Redirect URLs に `https://<ドメイン>/auth/callback` を足す
6. 運営の誰かでログインして、サロンに最初の投稿をする

## まだのもの
- デザイン (Claude Design の完成待ち)・PWA のアイコン (`public/icons/`)
- 入金の自動照合 (今は送金の手順を表示するだけ。支払い済みにするのは運営)。bafather.uk の USDT の照合と同じ仕組みを足す
- 紹介報酬の率と方式 (`rg_settings.referral` を決めれば動く)
- 画像つきの投稿 (Storage の `rg-salon` バケット)
- 運営の管理画面 (会員の一覧・チャージの支払い済み・免除)
