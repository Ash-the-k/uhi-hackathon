#!/usr/bin/env bash
# integration_tests_full.sh
# Full RBAC/integration smoke tests for consultations & prescriptions
# Requirements: bash, curl, jq, node (for JWT decoding)

# Run this script after starting the server locally (assumes localhost:4000)
# chmod +x integration_tests.sh
# ./integration_tests.sh

set -euo pipefail
BASE="http://localhost:4000/api"

echo "=== Acquire tokens ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"admin123"}' | jq -r .token)
DOC_A_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"doctor1@test.com","password":"password123"}' | jq -r .token)
DOC_B_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"doctor2@test.com","password":"password123"}' | jq -r .token)
STAFF_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"staff1@test.com","password":"password123"}' | jq -r .token)

for v in ADMIN_TOKEN DOC_A_TOKEN DOC_B_TOKEN STAFF_TOKEN; do
  eval val=\$$v
  if [ -z "$val" ] || [ "$val" = "null" ]; then
    echo "ERROR: $v missing; aborting"; exit 1
  fi
done
echo "Tokens OK"
echo

# helper: call with token, return "code|body"
_call() {
  local method=$1 url=$2 token=$3 data=${4-}
  if [ -z "$data" ]; then
    res=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -X "$method" "$url")
  else
    res=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -X "$method" "$url" -d "$data")
  fi
  http=$(echo "$res" | tail -n1)
  body=$(echo "$res" | sed '$d')
  echo "${http}|${body}"
}

echo "=== Admin: list prescriptions to find UNVERIFIED ones ==="
p_res=$(_call GET "$BASE/prescriptions" "$ADMIN_TOKEN")
p_code=${p_res%%|*}; p_body=${p_res#*|}
echo "HTTP $p_code"
echo "$p_body" | jq -C . || echo "$p_body"

# extract first UNVERIFIED prescription (if any)
UNVERIFIED_ID=$(echo "$p_body" | jq -r '.data[] | select(.status=="UNVERIFIED") | ._id' | head -n1)
UNVERIFIED_DOC=$(echo "$p_body" | jq -r --arg id "$UNVERIFIED_ID" '.data[] | select(._id==$id) | .doctorId' 2>/dev/null || echo "")

if [ -z "$UNVERIFIED_ID" ] || [ "$UNVERIFIED_ID" = "null" ]; then
  echo "No UNVERIFIED prescription found. If you expect one (seed), run seed then retry."
else
  echo "Found unverified prescription: $UNVERIFIED_ID (doctorId: $UNVERIFIED_DOC)"
fi
echo

# decode doctorId from tokens (node used to decode JWT payload)
decode_jwt_field() {
  local token=$1 field=$2
  node -e "const t=process.argv[1]; const f=process.argv[2]; const p=JSON.parse(Buffer.from(t.split('.')[1],'base64').toString()); console.log(p[f]||'');" "$token" "$field"
}

DOC_A_DOCTORID=$(decode_jwt_field "$DOC_A_TOKEN" doctorId)
DOC_B_DOCTORID=$(decode_jwt_field "$DOC_B_TOKEN" doctorId)

echo "DOC_A doctorId = $DOC_A_DOCTORID"
echo "DOC_B doctorId = $DOC_B_DOCTORID"
echo

# 1) If we have an unverified prescription, test wrong doctor cannot verify (403)
if [ -n "$UNVERIFIED_ID" ] && [ "$UNVERIFIED_ID" != "null" ]; then
  # decide which doctor is NOT the owner
  if [ "$UNVERIFIED_DOC" = "$DOC_A_DOCTORID" ]; then
    WRONG_TOKEN="$DOC_B_TOKEN"
    RIGHT_TOKEN="$DOC_A_TOKEN"
    RIGHT_DOCTOR="$DOC_A_DOCTORID"
  elif [ "$UNVERIFIED_DOC" = "$DOC_B_DOCTORID" ]; then
    WRONG_TOKEN="$DOC_A_TOKEN"
    RIGHT_TOKEN="$DOC_B_TOKEN"
    RIGHT_DOCTOR="$DOC_B_DOCTORID"
  else
    # owner is some other seeded doctor -> use DOC_A as wrong and STAFF as alternate
    WRONG_TOKEN="$DOC_A_TOKEN"
    RIGHT_TOKEN="$STAFF_TOKEN"   # staff can verify too (different flow)
    RIGHT_DOCTOR="$UNVERIFIED_DOC"
  fi

  echo "=== Test: wrong doctor tries to verify (expect 403) ==="
  res=$(_call PATCH "$BASE/prescriptions/$UNVERIFIED_ID/verify" "$WRONG_TOKEN" '{}')
  code=${res%%|*}; body=${res#*|}
  echo "HTTP $code"
  echo "$body" | jq -C . || echo "$body"
  if [ "$code" -eq 403 ]; then echo "PASS: wrong doctor blocked"; else echo "FAIL: expected 403 but got $code"; fi
  echo

  # 2) Test correct verifier: if RIGHT_TOKEN is doctor -> expect VERIFIED_DOCTOR; if staff -> VERIFIED_STAFF
  echo "=== Test: correct verifier attempts verify (expect 200) ==="
  res=$(_call PATCH "$BASE/prescriptions/$UNVERIFIED_ID/verify" "$RIGHT_TOKEN" '{}')
  code=${res%%|*}; body=${res#*|}
  echo "HTTP $code"
  echo "$body" | jq -C . || echo "$body"
  if [ "$code" -ne 200 ]; then
    echo "FAIL: expected 200 for correct verifier (got $code)"; exit 1
  else
    new_status=$(echo "$body" | jq -r '.data.status')
    echo "OK new status: $new_status"
    if [ "$new_status" = "VERIFIED_DOCTOR" ] || [ "$new_status" = "VERIFIED_STAFF" ] || [ "$new_status" = "VERIFIED_ADMIN" ]; then
      echo "PASS: verification resulted in $new_status"
    else
      echo "WARN: unexpected status after verify: $new_status"
    fi
  fi
  echo

  # 3) Staff verify behavior (if not already verified by staff). Re-seed or test on different pres if needed.
  echo "=== Test: staff verifying (should set VERIFIED_STAFF) ==="
  # If prescription already VERIFIED_DOCTOR, we will attempt to re-verify to check behavior (allowed in code)
  res=$(_call PATCH "$BASE/prescriptions/$UNVERIFIED_ID/verify" "$STAFF_TOKEN" '{}')
  code=${res%%|*}; body=${res#*|}
  echo "HTTP $code"
  echo "$body" | jq -C . || echo "$body"
  if [ "$code" -eq 200 ]; then
    echo "PASS: staff verify ok -> status: $(echo "$body" | jq -r '.data.status')"
  else
    echo "WARN: staff verify returned $code"
  fi
  echo
else
  echo "Skipping prescription verify tests (no UNVERIFIED prescription found)."
  echo
fi

# 4) List prescriptions as a doctor (doctor's JWT filters)
echo "=== Doctor-specific prescription listing (DOC_A) ==="
r=$(_call GET "$BASE/prescriptions" "$DOC_A_TOKEN")
echo "HTTP ${r%%|*}"
echo "${r#*|}" | jq -C . || echo "${r#*|}"
echo

echo "=== Doctor-specific prescription listing (DOC_B) ==="
r=$(_call GET "$BASE/prescriptions" "$DOC_B_TOKEN")
echo "HTTP ${r%%|*}"
echo "${r#*|}" | jq -C . || echo "${r#*|}"
echo

# 5) Test SOAP verification flows:
echo "=== Find a consultation that is UNVERIFIED or create a new one as admin ==="
# Prefer an existing UNVERIFIED consultation
c_res=$(_call GET "$BASE/consultations" "$ADMIN_TOKEN")
c_body=${c_res#*|}
CONS_UNVERIFIED_ID=$(echo "$c_body" | jq -r '.data[] | select(.status=="UNVERIFIED") | ._id' | head -n1 || true)
CONS_UNVERIFIED_DOC=$(echo "$c_body" | jq -r --arg id "$CONS_UNVERIFIED_ID" '.data[] | select(._id==$id) | .doctorId' 2>/dev/null || echo "")

if [ -z "$CONS_UNVERIFIED_ID" ] || [ "$CONS_UNVERIFIED_ID" = "null" ]; then
  echo "No UNVERIFIED consultation found; creating a test consultation via admin..."
  # get sample patient & doctor from existing consultations
  sample_doctor=$(echo "$c_body" | jq -r '.data[0].doctorId')
  sample_patient=$(echo "$c_body" | jq -r '.data[0].patientId')
  if [ -z "$sample_doctor" ] || [ -z "$sample_patient" ] || [ "$sample_doctor" = "null" ] || [ "$sample_patient" = "null" ]; then
    echo "Cannot find seeded patient/doctor ids; aborting consultation SOAP tests"; exit 1
  fi
  payload='{"patientId":"'"$sample_patient"'","doctorId":"'"$sample_doctor"'"}'
  create_res=$(_call POST "$BASE/consultations" "$ADMIN_TOKEN" "$payload")
  create_code=${create_res%%|*}; create_body=${create_res#*|}
  echo "Create HTTP $create_code"
  echo "$create_body" | jq -C . || echo "$create_body"
  if [ "$create_code" -ne 201 ]; then echo "FAIL to create consultation"; exit 1; fi
  CONS_UNVERIFIED_ID=$(echo "$create_body" | jq -r '.data._id')
  CONS_UNVERIFIED_DOC=$(echo "$create_body" | jq -r '.data.doctorId')
  echo "Created consultation $CONS_UNVERIFIED_ID (doctor $CONS_UNVERIFIED_DOC)"
else
  echo "Using existing unverified consultation $CONS_UNVERIFIED_ID (doctor $CONS_UNVERIFIED_DOC)"
fi
echo

# choose which doctor is owner and which is wrong
if [ "$CONS_UNVERIFIED_DOC" = "$DOC_A_DOCTORID" ]; then
  OWNER_TOKEN="$DOC_A_TOKEN"
  OTHER_TOKEN="$DOC_B_TOKEN"
elif [ "$CONS_UNVERIFIED_DOC" = "$DOC_B_DOCTORID" ]; then
  OWNER_TOKEN="$DOC_B_TOKEN"
  OTHER_TOKEN="$DOC_A_TOKEN"
else
  OWNER_TOKEN="$DOC_A_TOKEN"
  OTHER_TOKEN="$DOC_B_TOKEN"
fi

# Wrong doctor attempt -> should be 403
echo "=== SOAP verify: wrong doctor attempt (expect 403) ==="
res=$(_call PUT "$BASE/consultations/$CONS_UNVERIFIED_ID/verify" "$OTHER_TOKEN" '{"soap":{"subjective":"X"}}')
code=${res%%|*}; body=${res#*|}
echo "HTTP $code"
echo "$body" | jq -C . || echo "$body"
if [ "$code" -eq 403 ]; then echo "PASS: wrong doctor blocked"; else echo "FAIL: expected 403 for wrong doctor (got $code)"; fi
echo

# Correct doctor attempt -> should be 200
echo "=== SOAP verify: correct doctor attempt (expect 200) ==="
soap_payload='{"soap":{"subjective":"Test subj","objective":"Test obj","assessment":"Test A","plan":"Test P"}}'
res=$(_call PUT "$BASE/consultations/$CONS_UNVERIFIED_ID/verify" "$OWNER_TOKEN" "$soap_payload")
code=${res%%|*}; body=${res#*|}
echo "HTTP $code"
echo "$body" | jq -C . || echo "$body"
if [ "$code" -eq 200 ]; then echo "PASS: consultation verified by owner doctor"; else echo "FAIL: expected 200 for owner doctor verify (got $code)"; fi
echo

echo "=== All tests done ==="
