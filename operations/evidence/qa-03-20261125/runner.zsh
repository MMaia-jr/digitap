set -eu
export QA03_MODE=$1
if [[ "$QA03_MODE" != red && "$QA03_MODE" != green ]]; then exit 2; fi
umask 077
round=$(date -u +%Y%m%dT%H%M%SZ)
export A_PRACA_EVIDENCE_DIR=operations/evidence/g4-03b-recovery-qa03-$round
export DIGITAP_G4_03B_GATEWAY_MOCK=1 A_PRACA_ALLOW_FIXTURE_CLEANUP=1 AI_GATEWAY_API_KEY=g4-03b-synthetic-only AI_GATEWAY_MODEL=moonshotai/kimi-k2.6
export G4_03B_CONTEXT_MARKER=G4-03B-PRIVATE-SYNTHETIC-20261123-01 APP_ORIGIN=http://127.0.0.1:3215 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56151
export SUPABASE_PRIVATE_EVIDENCE_BUCKET=oss01d-private-qa03-${round:l}
export PLAYWRIGHT_BROWSERS_PATH="$PWD/../a-praca-v1-5/.playwright-browsers"
export AI_BETA_AUTH_USER_ID=$(node -e 'process.stdout.write(require("node:crypto").randomUUID())')
printf '%s\n' "$A_PRACA_EVIDENCE_DIR" > /private/tmp/digitap-qa-03/qa03-$QA03_MODE-harness-path
node scripts/e2e-server.mjs &
server_pid=$!
trap 'kill -TERM "$server_pid" 2>/dev/null || true; wait "$server_pid" || true' EXIT
for attempt in {1..40}; do
  kill -0 "$server_pid" 2>/dev/null || exit 1
  if curl -fsS --max-time 3 http://127.0.0.1:3215/login >/dev/null 2>&1; then
    node /private/tmp/digitap-qa-03/check.cjs
    exit $?
  fi
  sleep 1
done
printf 'O servidor local não ficou pronto.\n'
exit 1
