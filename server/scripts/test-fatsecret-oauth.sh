#!/usr/bin/env bash
# ทดสอบปิด R-01: ยืนยันว่า VPS นี้ (static IP) ผ่าน FatSecret IP whitelist
# และขอ OAuth2 access token + เรียก API จริงได้สำเร็จ
#
# Usage: server/scripts/test-fatsecret-oauth.sh
# ต้องมี server/.env (คัดลอกจาก server/.env.example แล้วเติมค่าจริง)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy server/.env.example to server/.env and fill in credentials." >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${FATSECRET_CLIENT_ID:?FATSECRET_CLIENT_ID not set in .env}"
: "${FATSECRET_CLIENT_SECRET:?FATSECRET_CLIENT_SECRET not set in .env}"
FATSECRET_SCOPE="${FATSECRET_SCOPE:-premier}"

echo "== Step 1: requesting OAuth2 token (grant_type=client_credentials, scope=${FATSECRET_SCOPE}) =="

TOKEN_RESPONSE=$(curl -sS -X POST https://oauth.fatsecret.com/connect/token \
  -u "${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}" \
  -d "grant_type=client_credentials&scope=${FATSECRET_SCOPE}")

echo "Raw response:"
echo "$TOKEN_RESPONSE"
echo

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null || true)

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "FAIL: no access_token in response above. R-01 NOT closed — check IP whitelist / credentials on FatSecret dashboard." >&2
  exit 1
fi

echo "OK: got access_token (length=${#ACCESS_TOKEN})"
echo

echo "== Step 2: test API call (foods.search) to confirm IP-whitelisted access works =="

API_RESPONSE=$(curl -sS "https://platform.fatsecret.com/rest/foods/search/v1?search_expression=chicken&format=json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Raw response:"
echo "$API_RESPONSE"
echo

if echo "$API_RESPONSE" | grep -q '"error"'; then
  echo "FAIL: API call returned an error — see raw response above. R-01 NOT closed." >&2
  exit 1
fi

echo "PASS: OAuth2 + IP whitelist confirmed working from this VPS. R-01 can be closed."
