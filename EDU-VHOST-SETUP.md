# Setup — edu.forges-group.com

Alias de `dev.forges-group.com` pointant sur le même container et la même DB dev.
Aucune nouvelle pipeline CI/CD, aucun nouvel environnement.

---

## Infos

| Champ | Valeur |
|---|---|
| Domaine cible | `edu.forges-group.com` |
| Pointe vers | Container `forges-backend-dev` (port 3001) |
| IP VPS | `92.205.164.97` |
| Identique à | `dev.forges-group.com` |

---

## Étape 1 — DNS

Chez le registrar du domaine `forges-group.com`, ajouter :

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| A | edu | 92.205.164.97 | 300 |

Attendre la propagation (quelques minutes avec TTL 300).

---

## Étape 2 — Vhost Nginx

### Option A — Via Plesk (recommandé)

1. Ouvrir `https://92.205.164.97:8443`
2. Ajouter un nouveau domaine : `edu.forges-group.com`
3. Pointer le document root vers `/var/www/vhosts/dev.forges-group.com/httpdocs`
   ou configurer un proxy pass vers `http://localhost:3001` selon la config dev existante
4. Activer SSL via Let's Encrypt dans Plesk

### Option B — Via SSH (si Nginx géré manuellement)

```bash
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97
```

```bash
# Copier la config dev
sudo cp /etc/nginx/conf.d/dev.forges-group.com.conf /etc/nginx/conf.d/edu.forges-group.com.conf

# Remplacer dev par edu
sudo sed -i 's/dev\.forges-group\.com/edu.forges-group.com/g' /etc/nginx/conf.d/edu.forges-group.com.conf

# Vérifier la syntaxe
sudo nginx -t

# Recharger
sudo systemctl reload nginx
```

---

## Étape 3 — Certificat SSL

```bash
sudo certbot --nginx -d edu.forges-group.com
```

Certbot détecte le vhost et configure HTTPS automatiquement.

> Si Plesk gère Nginx, utiliser l'option Let's Encrypt intégrée dans Plesk (étape 2 option A) — ne pas utiliser Certbot manuellement, Plesk écraserait la config.

---

## Vérification finale

```bash
curl -i https://edu.forges-group.com/api/health
```

Résultat attendu : `200 OK` identique à `https://dev.forges-group.com/api/health`.

---

## Notes

- `edu` et `dev` partagent exactement le même container, la même DB et le même `.env`.
- Toute modification sur `dev` est immédiatement visible sur `edu`.
- Aucune pipeline CI/CD à créer — les déploiements sur `develop` mettent à jour les deux domaines automatiquement.
