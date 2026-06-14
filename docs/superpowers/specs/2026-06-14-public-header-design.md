# Header public FORGES

## Objectif

Renforcer la navigation des pages publiques avec un header plus visible et plus proche des standards des plateformes de formation, sans reproduire Coursera ni ajouter de recherche.

## Structure

Le header public partagé affiche :

- le logo FORGES et le nom `FORGES`, liés à l'accueil ;
- un lien `Parcourir les formations` vers `/catalogue` ;
- un lien `Connexion` vers `/login` ;
- un bouton encadré `Inscrivez-vous gratuitement` vers `/register`.

Une bordure bleu primaire souligne le header et le sépare clairement du contenu.

## Comportement responsive

Sur ordinateur, les éléments sont alignés sur une seule ligne dans un conteneur centré.

Sur mobile :

- le nom FORGES peut être masqué pour préserver l'espace ;
- le lien catalogue utilise le libellé court `Parcourir` ;
- les deux actions de compte restent visibles ;
- le bouton d'inscription utilise le libellé court `S'inscrire`.

Il n'y a ni menu déroulant, ni icône, ni champ de recherche.

## Périmètre

La modification concerne uniquement la variante publique de `Navbar.jsx`. Les headers privés, le statut backend, l'horloge et les actions de déconnexion ne changent pas.

Le header s'applique automatiquement à la landing, au catalogue, aux fiches formation et aux pages publiques d'authentification via `PublicLayout`.

## Accessibilité

- Le lien du logo conserve le nom accessible `Accueil FORGES`.
- Les liens ont un focus visible.
- Les zones tactiles ont une hauteur minimale de 44 px.
- Les libellés complets restent disponibles avec `aria-label` lorsque le texte mobile est raccourci.

## Vérification

- Tests de la variante publique de `Navbar`.
- Non-régression des tests de la variante privée.
- Lint et build frontend.
- Vérification visuelle desktop et mobile sur la fiche formation, le catalogue et la landing.
