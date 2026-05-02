#!/usr/bin/env python3
"""
Apply seed changes for Groups C & D (11 fixes)

C1. UCS07 Créer Dossier - Re-seed cleanup (handled by --reset flag)
C2. UCS08 Retenir - Reset dos-ret-000001 state (handled by --reset flag)

D1. UCS07 Détails - Use dos-att-000001 fixed ID (OK in IDS)
D2. UCS08 Rejeter - Add fresh EN_ATTENTE_VERIFICATION dossier for reject test
D3. UCS09 Webhook - Add RETENU dossier for apprenant1
D4. UCS12 Souscrire - Remove AbonnementRetail for apprenant1 from seed
D5. UCS13 B2B - Remove B2B abonnement from seed
D6. UCS15 Répondre - Add Conversation + Message pre-seed
D7. UCS18 Valider - Reset fpa-part-00001 to EN_ATTENTE_VALIDATION + add 2nd formation
D8. UCS19 Reversement Partenaire - Add CommissionPartenaire EN_ATTENTE
D9. UCS20 Reversement Apporteur - Fix commission states (VALIDEE not EN_ATTENTE) + add 500 XOF
"""

import re
from pathlib import Path

SEED_FILE = Path("/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/seed_for_test.js")

print("=" * 80)
print("SEED MODIFICATIONS — Groups C & D (11 fixes)")
print("=" * 80)

with open(SEED_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================================
# D4: Remove AbonnementRetail for apprenant1 from seed
# ============================================================================
print("\n[D4] Removing AbonnementRetail creation for apprenant1...")

removal_pattern = r"  // ── 6\. ABONNEMENT RETAIL apprenant1 ───────────────────────\n  console\.log\('  6/11 AbonnementRetail\.\.\.'\);\n  await prisma\.abonnementRetail\.create\(\{ data: \{[^}]+apprenant_id: IDS\.apprenant1,[^}]+\}\}\);\n\n  // Mettre à jour apprenant1 avec son abonnement\n  await prisma\.apprenant\.update\(\{\n    where: \{ id: IDS\.apprenant1 \},\n    data: \{ abonnement_retail: \{ connect: \{ id: IDS\.abo_ret_01 \} \} \},\n  \}\);"

if re.search(removal_pattern, content, re.MULTILINE | re.DOTALL):
    content = re.sub(removal_pattern, "  // ── 6. ABONNEMENT RETAIL — REMOVED (D4: Subscribe test creates it) ───", content, flags=re.MULTILINE | re.DOTALL)
    print("✅ Removed AbonnementRetail section")
else:
    print("⚠️  Pattern not found, trying simpler approach...")
    # Try simpler pattern
    if "6/11 AbonnementRetail" in content:
        lines = content.split('\n')
        new_lines = []
        skip_until_blank = False
        blank_count = 0
        
        for i, line in enumerate(lines):
            if "6/11 AbonnementRetail" in line:
                skip_until_blank = True
                new_lines.append("  // ── 6. ABONNEMENT RETAIL — REMOVED (D4: Subscribe test creates it) ───")
                continue
            
            if skip_until_blank:
                # Skip until we find 2+ consecutive blank lines
                if line.strip() == "":
                    blank_count += 1
                else:
                    blank_count = 0
                
                if blank_count >= 2:
                    skip_until_blank = False
                    blank_count = 0
                    # Continue adding lines normally
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
        print("✅ Removed AbonnementRetail section (simplified)")

# ============================================================================
# D5: Remove B2B abonnement from seed
# ============================================================================
print("\n[D5] Removing B2B abonnement creation...")

if "AbonnementB2B" in content and "IDS.abo_b2b_01" in content:
    lines = content.split('\n')
    new_lines = []
    skip = False
    for i, line in enumerate(lines):
        if "await prisma.abonnementB2B.create" in line:
            skip = True
            new_lines.append("  // ── B2B ABONNEMENT — REMOVED (D5: Subscribe test creates it) ───")
            continue
        if skip:
            if line.strip() == "});" and i > 0:
                # Skip one more line to get past the closing
                skip = False
                continue
            elif line.strip().startswith("abonnement_b2b_id:"):
                # Skip the line that connects B2B to org
                continue
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    print("✅ Removed B2B abonnement section")

# ============================================================================
# D8: Add CommissionPartenaire EN_ATTENTE
# ============================================================================
print("\n[D8] Adding CommissionPartenaire EN_ATTENTE for UCS19...")

# Find where to insert (after paiement creation for D-PAYE-01)
commission_partenaire_code = """
  // ── 9b. COMMISSION PARTENAIRE EN_ATTENTE (D8: UCS19 Reversement) ───────
  console.log('  9b/11 CommissionPartenaire EN_ATTENTE...');
  const commPart1Id = uuidv4();
  const commPart2Id = uuidv4();
  
  await prisma.commissionPartenaire.createMany({ data: [
    {
      id: commPart1Id,
      partenaire_id: IDS.partenaire,
      paiement_id: paiement1Id,  // lien vers formation partenaire
      montant_base_xof: 40000,
      taux_commission_pct: 30,  // 30% commission Forges
      montant_commission_xof: 12000,
      date_generation: agoD(20),
      mois_facturation: moisCourant,
      statut: 'EN_ATTENTE',
      created_at: agoD(20),
    },
    {
      id: commPart2Id,
      partenaire_id: IDS.partenaire,
      paiement_id: paiement2Id,
      montant_base_xof: 50000,
      taux_commission_pct: 30,
      montant_commission_xof: 15000,
      date_generation: agoD(15),
      mois_facturation: moisCourant,
      statut: 'EN_ATTENTE',
      created_at: agoD(15),
    },
  ] });
"""

# Insert after the first paiement creation
insert_after = "  });\n\n  // ── 10. APPORTEUR"
if insert_after in content:
    content = content.replace(insert_after, commission_partenaire_code + "\n\n  // ── 10. APPORTEUR")
    print("✅ Added CommissionPartenaire EN_ATTENTE section")

# ============================================================================
# D9: Fix CommissionApporteur — Change to VALIDEE + add 500 XOF more
# ============================================================================
print("\n[D9] Fixing CommissionApporteur states (EN_ATTENTE → VALIDEE) + total > 5000...")

# Find and replace the CommissionApporteur section
if "CommissionsApporteur EN_ATTENTE" in content:
    old_comm_section = r"""  // CommissionsApporteur EN_ATTENTE \(cumul 4500 XOF < seuil 5000[^}]+\}\);\n  \]\}\);"""
    
    new_comm_section = """  // CommissionsApporteur VALIDEE (cumul 5500 XOF > seuil 5000 — pour test RM-147)
  // Change: VALIDEE not EN_ATTENTE (getCumulDu only counts VALIDEE)
  // Change: Add 500 XOF more to exceed 5000 threshold
  const moisCourant = new Date().toISOString().slice(0, 7); // AAAA-MM
  await prisma.commissionApporteur.createMany({ data: [
    {
      id: uuidv4(), 
      apporteur_id: IDS.apporteur,
      paiement_id: paiement1Id,
      montant_base_xof: 40000, 
      taux_commission_pct: 5, 
      montant_commission_xof: 2000,
      date_generation: agoD(20), 
      mois_facturation: moisCourant,
      statut: 'VALIDEE',  // CHANGED: was EN_ATTENTE
      created_at: agoD(20),
    },
    {
      id: uuidv4(), 
      apporteur_id: IDS.apporteur,
      paiement_id: paiement2Id,
      montant_base_xof: 50000, 
      taux_commission_pct: 5, 
      montant_commission_xof: 2500,
      date_generation: agoD(15), 
      mois_facturation: moisCourant,
      statut: 'VALIDEE',  // CHANGED: was EN_ATTENTE
      created_at: agoD(15),
    },
    {
      id: uuidv4(),
      apporteur_id: IDS.apporteur,
      paiement_id: paiement1Id,
      montant_base_xof: 10000,  // ADDED: New commission to exceed threshold
      taux_commission_pct: 5,
      montant_commission_xof: 500,
      date_generation: agoD(10),
      mois_facturation: moisCourant,
      statut: 'VALIDEE',
      created_at: agoD(10),
    },
  ] });"""
    
    if re.search(r"CommissionsApporteur EN_ATTENTE.*?\}\);", content, re.DOTALL):
        content = re.sub(r"  // CommissionsApporteur EN_ATTENTE.*?\}\);\n", new_comm_section + "\n\n", content, flags=re.DOTALL, count=1)
        print("✅ Updated CommissionApporteur to VALIDEE with increased total")

# ============================================================================
# Write back
# ============================================================================
with open(SEED_FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "=" * 80)
print("✨ Seed modifications saved")
print("=" * 80)

print("\nRemaining manual tasks (D2, D3, D6, D7):")
print("  D2. UCS08 Rejeter - Add fresh EN_ATTENTE_VERIFICATION dossier")
print("  D3. UCS09 Webhook - Add RETENU dossier for apprenant1")
print("  D6. UCS15 Répondre - Add Conversation + Message pre-seed")
print("  D7. UCS18 Valider - Reset fpa-part-00001 + add 2nd formation + ValidateurFormation")

print("\nRun:")
print("  cd forges-monorepo/backend")
print("  node seed_for_test.js --reset && node seed_for_test.js --check")
