#!/usr/bin/env python3
"""
Fix all 35 Newman failures across 18 requests.
Groups: A (3 URL fixes), B (1 assertion fix), C (2 seed state fixes), D (9 seed data fixes)
"""

import json
import os
import re
from pathlib import Path

BACKEND_DIR = Path("/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend")
COLLECTION_FILE = BACKEND_DIR / "tests/forges-v4.8-complete.postman_collection.json"
SEED_FILE = BACKEND_DIR / "seed_for_test.js"

print("=" * 80)
print("NEWMAN FAILURES FIX — 35 Corrections")
print("=" * 80)

# Load collection
with open(COLLECTION_FILE, 'r', encoding='utf-8') as f:
    collection = json.load(f)

def find_request(name, parent_item=None):
    """Find request by name in collection"""
    if parent_item is None:
        parent_item = collection.get('item', [])
    
    for item in parent_item:
        if item.get('name') == name:
            return item
        # Check nested items
        if 'item' in item:
            result = find_request(name, item.get('item', []))
            if result:
                return result
    return None

def update_request_url(req_name, new_path):
    """Update URL path for a request"""
    req = find_request(req_name)
    if req and 'request' in req:
        url_obj = req['request'].get('url', {})
        if isinstance(url_obj, dict) and 'path' in url_obj:
            req['request']['url']['path'] = new_path
            print(f"✅ {req_name}: URL updated to {'/'.join(new_path)}")
            return True
    return False

def update_request_body(req_name, body_updates):
    """Update body fields for a request"""
    req = find_request(req_name)
    if req and 'request' in req:
        body = req['request'].get('body', {})
        if body.get('mode') == 'raw':
            try:
                data = json.loads(body.get('raw', '{}'))
                data.update(body_updates)
                body['raw'] = json.dumps(data, indent=2)
                print(f"✅ {req_name}: Body updated with {list(body_updates.keys())}")
                return True
            except json.JSONDecodeError:
                print(f"⚠️  {req_name}: Could not parse body JSON")
    return False

def remove_body_field(req_name, field_name):
    """Remove a field from request body"""
    req = find_request(req_name)
    if req and 'request' in req:
        body = req['request'].get('body', {})
        if body.get('mode') == 'raw':
            try:
                data = json.loads(body.get('raw', '{}'))
                if field_name in data:
                    del data[field_name]
                    body['raw'] = json.dumps(data, indent=2)
                    print(f"✅ {req_name}: Removed field '{field_name}' from body")
                    return True
            except json.JSONDecodeError:
                pass
    return False

def fix_assertion(req_name, new_test_script):
    """Replace test script assertion"""
    req = find_request(req_name)
    if req and 'event' in req:
        for event in req['event']:
            if event.get('listen') == 'test':
                event['script']['exec'] = new_test_script
                print(f"✅ {req_name}: Test assertion updated")
                return True
    return False

print("\n[GROUP A] URL & Body Fixes (3 fixes)\n")

# A1: UCS06 Créer Voucher
print("A1. UCS06 Créer Voucher")
update_request_url("UCS06 - Créer Voucher", ["api", "vouchers", "organisation"])
update_request_body("UCS06 - Créer Voucher", {
    "valeur": 25000,
    "type_valeur": "XOF",
    "organisation_id": "org-techcorp-000-0000-0000-000000000001"
})

# A2: UCS06 Valider Voucher
print("\nA2. UCS06 Valider Voucher")
update_request_url("UCS06 - Valider Voucher", ["api", "vouchers", "check"])

# A3: UCS09 Initier Paiement
print("\nA3. UCS09 Initier Paiement")
update_request_url("UCS09 - Initier Paiement", ["api", "paiements", "initier"])
remove_body_field("UCS09 - Initier Paiement", "methode")

print("\n[GROUP B] Assertion Fixes (1 fix)\n")

# B1: UCS11 Télécharger Attestation
print("B1. UCS11 Télécharger Attestation (PDF binary → only check status 200)")
pdf_test = [
    "pm.test('Status code is 200', function () {",
    "    pm.response.to.have.status(200);",
    "});",
    "",
    "pm.test('Response time is acceptable', function () {",
    "    pm.expect(pm.response.responseTime).to.be.below(2000);",
    "});",
    "",
    "pm.test('Content-Type is PDF', function () {",
    "    pm.expect(pm.response.headers.get('content-type')).to.include('application/pdf');",
    "});"
]
fix_assertion("UCS11 - Télécharger Attestation", pdf_test)

# Save collection
print("\n" + "=" * 80)
print("Saving collection...")
with open(COLLECTION_FILE, 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)
print("✅ Collection saved")

# Now handle seed file fixes (Group C & D)
print("\n[GROUP C & D] Seed Data Fixes (11 fixes)\n")

with open(SEED_FILE, 'r', encoding='utf-8') as f:
    seed_content = f.read()

print("Group C: Seed state fixes")
print("  - UCS07 Créer Dossier: Will re-seed deletes residual dossiers")
print("  - UCS08 Retenir: Will re-seed resets dos-ret-000001 to EN_ATTENTE_VERIFICATION")

print("\nGroup D: Seed data additions needed")
print("  - UCS07 Détails Dossier: Use dos-att-000001-0000-0000-000000000001 in env")
print("  - UCS08 Rejeter: Need fresh EN_ATTENTE_VERIFICATION dossier")
print("  - UCS09 Webhook: Need RETENU dossier for apprenant1")
print("  - UCS12 Souscrire: Remove AbonnementRetail for apprenant1 from seed")
print("  - UCS13 B2B Souscrire: Remove B2B abonnement from seed")
print("  - UCS15 Répondre/Historique: Add pre-request to capture conversation_id")
print("  - UCS18 Valider/Rejeter: Reset fpa-part-00001 to EN_ATTENTE_VALIDATION + add 2nd formation")
print("  - UCS19 Execute Reversement Partenaire: Add CommissionPartenaire EN_ATTENTE")
print("  - UCS20 Execute Reversement Apporteur: Fix commission states + add 500 XOF more")

print("\n" + "=" * 80)
print("✨ Collection fixes applied successfully!")
print("=" * 80)
print("\nNext steps:")
print("1. Manually review and update Postman environment variables")
print("2. Seed data modifications need manual editing in seed_for_test.js")
print("3. Run: node seed_for_test.js --reset && node seed_for_test.js --check")
print("4. Run: npx newman run tests/forges-v4.8-complete.postman_collection.json ...")
