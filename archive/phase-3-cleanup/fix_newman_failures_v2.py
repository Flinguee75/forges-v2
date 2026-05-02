#!/usr/bin/env python3
"""
Fix all 35 Newman failures — Version 2 avec navigation correcte des requêtes imbriquées
"""

import json
from pathlib import Path

BACKEND_DIR = Path("/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend")
COLLECTION_FILE = BACKEND_DIR / "tests/forges-v4.8-complete.postman_collection.json"

print("=" * 80)
print("NEWMAN FAILURES FIX v2 — Naviguant la structure imbriquée")
print("=" * 80)

# Load collection
with open(COLLECTION_FILE, 'r', encoding='utf-8') as f:
    collection = json.load(f)

def find_and_update_url(ucs_name, request_name, new_path):
    """Find request by UCS and name, update URL path"""
    for ucs in collection.get('item', []):
        if ucs.get('name') == ucs_name:
            for req in ucs.get('item', []):
                if req.get('name') == request_name:
                    if 'request' in req and 'url' in req['request']:
                        req['request']['url']['path'] = new_path
                        print(f"✅ {ucs_name} > {request_name}")
                        print(f"   URL updated: /{'/'.join(new_path)}")
                        return True
    return False

def find_and_update_body(ucs_name, request_name, body_updates):
    """Find request and update body JSON fields"""
    for ucs in collection.get('item', []):
        if ucs.get('name') == ucs_name:
            for req in ucs.get('item', []):
                if req.get('name') == request_name:
                    body = req.get('request', {}).get('body', {})
                    if body.get('mode') == 'raw':
                        try:
                            data = json.loads(body.get('raw', '{}'))
                            data.update(body_updates)
                            body['raw'] = json.dumps(data, indent=2)
                            print(f"✅ {ucs_name} > {request_name}")
                            print(f"   Body updated: {list(body_updates.keys())}")
                            return True
                        except:
                            pass
    return False

def find_and_remove_body_field(ucs_name, request_name, field_name):
    """Find request and remove a body field"""
    for ucs in collection.get('item', []):
        if ucs.get('name') == ucs_name:
            for req in ucs.get('item', []):
                if req.get('name') == request_name:
                    body = req.get('request', {}).get('body', {})
                    if body.get('mode') == 'raw':
                        try:
                            data = json.loads(body.get('raw', '{}'))
                            if field_name in data:
                                del data[field_name]
                                body['raw'] = json.dumps(data, indent=2)
                                print(f"✅ {ucs_name} > {request_name}")
                                print(f"   Removed field: {field_name}")
                                return True
                        except:
                            pass
    return False

def find_and_update_test(ucs_name, request_name, new_test_script):
    """Find request and replace test script"""
    for ucs in collection.get('item', []):
        if ucs.get('name') == ucs_name:
            for req in ucs.get('item', []):
                if req.get('name') == request_name:
                    if 'event' in req:
                        for event in req['event']:
                            if event.get('listen') == 'test':
                                event['script']['exec'] = new_test_script
                                print(f"✅ {ucs_name} > {request_name}")
                                print(f"   Test assertion updated")
                                return True
    return False

print("\n[GROUP A] URL & Body Fixes (3 fixes)\n")

# A1: UCS06 Créer Voucher
print("A1. UCS06 - Créer Voucher")
find_and_update_url("UCS06", "ORGANISATION - Créer Voucher", ["api", "vouchers", "organisation"])
find_and_update_body("UCS06", "ORGANISATION - Créer Voucher", {
    "valeur": 25000,
    "type_valeur": "XOF",
    "organisation_id": "org-techcorp-000-0000-0000-000000000001"
})

# A2: UCS06 Valider Voucher
print("\nA2. UCS06 - Valider Voucher")
find_and_update_url("UCS06", "Public - Valider Voucher", ["api", "vouchers", "check"])

# A3: UCS09 Initier Paiement
print("\nA3. UCS09 - Initier Paiement")
find_and_update_url("UCS09", "APPRENANT - Initier Paiement", ["api", "paiements", "initier"])
find_and_remove_body_field("UCS09", "APPRENANT - Initier Paiement", "methode")

print("\n[GROUP B] Assertion Fixes (1 fix)\n")

# B1: UCS11 Télécharger Attestation
print("B1. UCS11 - Télécharger Attestation (PDF binary → only check status 200)")
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
find_and_update_test("UCS11", "APPRENANT - Télécharger Attestation", pdf_test)

# Save collection
print("\n" + "=" * 80)
print("Saving collection...")
with open(COLLECTION_FILE, 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)
print("✅ Collection saved successfully")

print("\n" + "=" * 80)
print("✨ GROUP A & B Fixes Applied (4 corrections)")
print("=" * 80)

print("\n[GROUP C & D] Seed Data Modifications Needed\n")
print("⚠️  Manual seed changes required (11 fixes):")
print("  C1. UCS07 Créer Dossier - residual cleanup (re-seed with --reset)")
print("  C2. UCS08 Retenir - reset dos-ret-000001 state (re-seed with --reset)")
print("  D1. UCS07 Détails - use dos-att-000001-0000-0000-000000000001")
print("  D2. UCS08 Rejeter - add fresh EN_ATTENTE_VERIFICATION dossier")
print("  D3. UCS09 Webhook - add RETENU dossier for apprenant1")
print("  D4. UCS12 Souscrire - remove AbonnementRetail for apprenant1")
print("  D5. UCS13 B2B - remove B2B abonnement from seed")
print("  D6. UCS15 Répondre - add pre-request to capture conversation_id")
print("  D7. UCS18 Valider - reset fpa-part-00001 + add 2nd formation")
print("  D8. UCS19 Reversement Partenaire - add CommissionPartenaire EN_ATTENTE")
print("  D9. UCS20 Reversement Apporteur - fix commission states + add 500 XOF")

print("\n" + "=" * 80)
print("Next: Edit seed_for_test.js manually or run fix_seed.py")
print("=" * 80)
