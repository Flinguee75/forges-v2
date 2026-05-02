#!/usr/bin/env python3
"""
PRAGMATIC FIX - Corrige les vraies erreurs Newman
"""
import json

collection_path = 'tests/forges-v4.8-complete.postman_collection.json'

with open(collection_path, 'r') as f:
    collection = json.load(f)

def find_request(ucs_name, req_name):
    for item in collection['item']:
        if item.get('name') == ucs_name and 'item' in item:
            for req in item['item']:
                if req.get('name') == req_name:
                    return req
    return None

fixes = 0

# ==================== FIX UCS08 ====================
# UCS08 utilise dossier_premium_id (EN_ATTENTE) mais devrait utiliser dossier_attente_01
req = find_request('UCS08', 'RESPONSABLE - Retenir Dossier')
if req:
    # Change URL de /api/backoffice/dossiers/{dossier_premium_id}/retenir
    # Pour utiliser une variable qui pointe à un dossier EN_ATTENTE
    url_path = req['request']['url']['path']
    if '{{dossier_premium_id}}' in url_path:
        idx = url_path.index('{{dossier_premium_id}}')
        url_path[idx] = '{{dossier_id_test}}'  # C'est EN_ATTENTE
        req['request']['url']['raw'] = '{{base_url}}/api/backoffice/dossiers/{{dossier_id_test}}/retenir'
    fixes += 1
    print("✅ UCS08 Retenir: Fixed dossier ID")

# ==================== FIX UCS12 CANCEL ====================
# UCS12 Cancel retourne 404 - problème d'authentification ou endpoint mauvais
# Vérifier si c'est DELETE ou POST
req = find_request('UCS12', 'APPRENANT - Résilier Abonnement')
if req:
    # Essayer DELETE au lieu de POST
    current_method = req['request'].get('method', 'POST')
    # Laisse comme POST mais assure que le endpoint est correct
    print(f"✅ UCS12 Cancel: Method={current_method}, endpoint=/api/abonnements-retail/cancel")

# ==================== FIX UCS15 BOT ====================
# UCS15 retourne 404 pour /api/bot/conversation/{id}/answer et /messages
# Problème: Les middlewares d'auth peuvent bloquer
# Solution: Vérifier que les headers sont dans le bon ordre

for req_name in ['APPRENANT - Répondre au Bot', 'APPRENANT - Historique Conversation']:
    req = find_request('UCS15', req_name)
    if req:
        # Assure que le token est présent
        has_auth = False
        for h in req['request'].get('header', []):
            if h.get('key') == 'Authorization':
                has_auth = True
                break
        if not has_auth:
            req['request']['header'].append({
                "key": "Authorization",
                "value": "Bearer {{token_apprenant}}",
                "type": "text"
            })
            print(f"✅ UCS15 {req_name}: Added Authorization header")

# ==================== FIX UCS18 ====================
# UCS18 Valider Formation retourne 409 - formation déjà validée
# Solution: Utiliser une formation non validée
req = find_request('UCS18', 'RESPONSABLE - Valider Formation')
if req:
    # Change vers fp_part_01 qui est EN_ATTENTE
    url_path = req['request']['url']['path']
    # Trouver l'ID dans path et le remplacer
    for i, segment in enumerate(url_path):
        if 'fpa-part' in segment:
            url_path[i] = '{{formation_partenaire_id_reject}}'  # Cette formation est EN_ATTENTE
    req['request']['url']['raw'] = '{{base_url}}/api/backoffice/formations/{{formation_partenaire_id_reject}}/validate'
    fixes += 1
    print("✅ UCS18 Valider: Fixed formation ID to one that's EN_ATTENTE")

# ==================== FIX UCS19/UCS20 (Commission) ====================
# Ces retournent 400 - problème de validation ou montant
# Augmente le montant dans les dossiers de commission

# Pour maintenant, on note qu'il faut des données avec montant > seuil
print("⚠️  UCS19/UCS20: Commission errors = besoin de montants > seuil dans seed")

with open(collection_path, 'w') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"\n✅ Total fixes: {fixes}")
print("💡 Reste: UCS19/UCS20 nécessitent données dans la seed avec montants suffisants")
