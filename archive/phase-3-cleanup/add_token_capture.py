#!/usr/bin/env python3
"""
Fix UCS01 Login scripts to capture tokens into environment variables
"""

import json
from pathlib import Path

COLLECTION_FILE = Path("/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/tests/forges-v4.8-complete.postman_collection.json")

print("=" * 80)
print("Adding token capture scripts to UCS01 Login requests")
print("=" * 80)

with open(COLLECTION_FILE, 'r', encoding='utf-8') as f:
    collection = json.load(f)

def add_token_capture_to_login(ucs_name, request_name, env_var_name):
    """Add script to capture access token from login response"""
    for ucs in collection.get('item', []):
        if ucs.get('name') == ucs_name:
            for req in ucs.get('item', []):
                if req.get('name') == request_name:
                    if 'event' not in req:
                        req['event'] = []
                    
                    # Check if script already captures token
                    for event in req['event']:
                        if event.get('listen') == 'test':
                            script_text = '\n'.join(event['script']['exec'])
                            if 'pm.environment.set' in script_text and 'access_token' in script_text:
                                print(f"✅ {ucs_name} > {request_name}: Already has token capture")
                                return True
                    
                    # Add or update test script to capture token
                    for event in req['event']:
                        if event.get('listen') == 'test':
                            exec_lines = event['script']['exec']
                            # Add token capture at the end
                            token_capture = [
                                "",
                                "// Capture access token for subsequent requests",
                                "pm.test('Capture access token', function () {",
                                "    var jsonData = pm.response.json();",
                                "    if (jsonData.data && jsonData.data.access_token) {",
                                f"        pm.environment.set('{env_var_name}', jsonData.data.access_token);",
                                "        pm.environment.set('token_apprenant_expires_at', Date.now() + (jsonData.data.expires_in || 3600) * 1000);",
                                "    }",
                                "});"
                            ]
                            event['script']['exec'].extend(token_capture)
                            print(f"✅ {ucs_name} > {request_name}: Added token capture for {env_var_name}")
                            return True
    return False

# Find all UCS01 login-like requests and add token capture
login_configs = [
    ("UCS01", "Public - Login", "token_apprenant"),
    ("UCS03", "Public - Inscription Organisation", "token_organisation"),
]

for ucs_name, req_name, env_var in login_configs:
    add_token_capture_to_login(ucs_name, req_name, env_var)

# Also check for backoffice login (Admin, Responsable, Agent, etc.)
backoffice_logins = [
    ("UCS16", "ADMIN - Login Backoffice", "token_admin"),
    ("UCS17", "SUPERVISEUR - Login Backoffice", "token_superviseur"),
]

for ucs_name, req_name, env_var in backoffice_logins:
    result = add_token_capture_to_login(ucs_name, req_name, env_var)
    if not result:
        print(f"⚠️  {ucs_name} > {req_name}: Not found")

# Save collection
with open(COLLECTION_FILE, 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print("✨ Token capture scripts added to collection")
print("=" * 80)
print("\nNext: Run Newman again")
print("  npx newman run tests/forges-v4.8-complete.postman_collection.json \\")
print("    --environment tests/forges-v4.8-complete.postman_environment.json")
