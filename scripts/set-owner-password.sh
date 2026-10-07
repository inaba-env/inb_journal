#!/usr/bin/env bash
# 本人（OWNER_EMAIL）の Supabase ユーザーにログイン用のパスワードを付ける。
# .env.local の接続先（本番か、ローカルか）に対して実行される。
# パスワードは画面に出さず、コマンドの引数にも載せない。
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

read -rsp "新しいパスワード（12文字以上）: " PASSWORD; echo
read -rsp "もう一度: " CONFIRM; echo
[ "$PASSWORD" = "$CONFIRM" ] || { echo "一致しません"; exit 1; }
[ ${#PASSWORD} -ge 12 ] || { echo "12文字以上にしてください"; exit 1; }

AUTH="$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users"
KEY=(-H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")

USER_ID=$(curl -fsS "$AUTH?per_page=1000" "${KEY[@]}" | OWNER_EMAIL="$OWNER_EMAIL" python3 -c '
import json, os, sys
owner = os.environ["OWNER_EMAIL"].lower()
print(next((u["id"] for u in json.load(sys.stdin)["users"] if (u.get("email") or "").lower() == owner), ""))')
[ -n "$USER_ID" ] || { echo "${OWNER_EMAIL} のユーザーが見つかりません"; exit 1; }

PASSWORD="$PASSWORD" python3 -c 'import json, os; print(json.dumps({"password": os.environ["PASSWORD"]}))' |
  curl -fsS -o /dev/null -X PUT "$AUTH/$USER_ID" "${KEY[@]}" -H "Content-Type: application/json" --data @-
echo "${OWNER_EMAIL} にパスワードを設定しました（${NEXT_PUBLIC_SUPABASE_URL}）"
