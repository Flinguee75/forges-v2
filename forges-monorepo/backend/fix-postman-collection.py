#!/usr/bin/env python3
"""
Fix Postman Collection pour Newman baseline tests
- UCS07: Utiliser apprenant3 + session2
- UCS12: Utiliser apprenant3 
- UCS13: Utiliser organisation2
- UCS15: Corriger endpoints
- UCS18: Utiliser formation alternative
"""

import json
import re

collection_path = 'tests/forges-v4.8-complete.postman_collection.json'

# Load collection
with open(collection_path, 'r') as f:
    collection = json.load(f)

fixes_applied = 0

# Helper: find item by name in UCS folder
def find_request_by_name(ucs_name, request_name):
    for item in collection['item']:
        if item.get('name') == ucs_name and 'item' in item:
            for req in item['item']:
                if req.get('name') == request_name:
                    return req
    return None

# Fix UCS07 - Use apprenant3 + session2
ucs07_req = find_request_by_name('UCS07', 'APPRENANT - Créer Dossier Inscription')
if ucs07_req:
    auth_header = None
    for h in ucs07_req['request'].get('header', []):
        if h.get('key') == 'Authorization':
            # Change apprenant to apprenant3
            h['value'] = 'Bearer {{token_apprenant3}}'
            auth_header = h
            break
    
    # Change body: use session2 instead
    if 'body' in ucs07_req['request']:
        body = ucs07_req['request']['body'].get('raw', '')
        body = body.replace('{{session_id_test}}', '{{session2_id_test}}')
        ucs07_req['request']['body']['raw'] = body
    
    fixes_applied += 1
    print("✅ UCS07: Updated to use apprenant3 + session2")

# Fix UCS12 - Use apprenant3
for ucs12_req_name in ['APPRENANT - Souscrire Abonnement', 'APPRENANT - Statut Abonnement', 'APPRENANT - Résilier Abonnement']:
    ucs12_req = find_request_by_name('UCS12', ucs12_req_name)
    if ucs12_req:
        for h in ucs12_req['request'].get('header', []):
            if h.get('key') == 'Authorization':
                h['value'] = 'Bearer {{token_apprenant3}}'
                break
        fixes_applied += 1
        print(f"✅ UCS12: Updated {ucs12_req_name} to use apprenant3")

# Fix UCS13 - Use organisation2
for ucs13_req_name in ['ORGANISATION - Souscrire Abonnement B2B', 'ORGANISATION - Statut Abonnement B2B', 'ORGANISATION - Apprenants B2B']:
    ucs13_req = find_request_by_name('UCS13', ucs13_req_name)
    if ucs13_req:
        for h in ucs13_req['request'].get('header', []):
            if h.get('key') == 'Authorization':
                h['value'] = 'Bearer {{token_organisation2}}'
                break
        fixes_applied += 1
        print(f"✅ UCS13: Updated {ucs13_req_name} to use organisation2")

# Fix UCS15 - Bot endpoints
ucs15_respond = find_request_by_name('UCS15', 'APPRENANT - Répondre au Bot')
if ucs15_respond and 'request' in ucs15_respond:
    # Fix endpoint path if needed
    if 'url' in ucs15_respond['request']:
        url_raw = ucs15_respond['request']['url'].get('raw', '')
        if '/answer' in url_raw:
            # It should use /api/bot/conversation/:id/answer
            ucs15_respond['request']['url']['raw'] = '{{base_url}}/api/bot/conversation/{{conversation_id_test}}/answer'
            ucs15_respond['request']['url']['path'] = ['api', 'bot', 'conversation', '{{conversation_id_test}}', 'answer']
            fixes_applied += 1
            print("✅ UCS15: Fixed 'Répondre au Bot' endpoint")

# Fix UCS15 - Historique (add /messages endpoint if missing)
ucs15_hist = find_request_by_name('UCS15', 'APPRENANT - Historique Conversation')
if ucs15_hist and 'request' in ucs15_hist:
    if 'url' in ucs15_hist['request']:
        url_raw = ucs15_hist['request']['url'].get('raw', '')
        # Change to /messages endpoint
        if 'conversation' in url_raw and '/answer' not in url_raw:
            ucs15_hist['request']['url']['raw'] = '{{base_url}}/api/bot/conversation/{{conversation_id_test}}/messages'
            ucs15_hist['request']['url']['path'] = ['api', 'bot', 'conversation', '{{conversation_id_test}}', 'messages']
            fixes_applied += 1
            print("✅ UCS15: Fixed 'Historique Conversation' endpoint to /messages")

# Fix UCS18 - Use formation alternative 
ucs18_validate = find_request_by_name('UCS18', 'RESPONSABLE - Valider Formation')
if ucs18_validate and 'request' in ucs18_validate:
    if 'url' in ucs18_validate['request']:
        url_raw = ucs18_validate['request']['url'].get('raw', '')
        # Update body to use different formation_partenaire_id
        if 'body' in ucs18_validate['request']:
            body = ucs18_validate['request']['body'].get('raw', '')
            body = body.replace('{{formation_partenaire_id_validate}}', '{{formation_partenaire_id_test}}')
            ucs18_validate['request']['body']['raw'] = body
        fixes_applied += 1
        print("✅ UCS18: Updated to use formation_partenaire_id_test")

# Save updated collection
with open(collection_path, 'w') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"\n✅ Total fixes applied: {fixes_applied}")
print(f"✅ Collection saved to {collection_path}")
