# Fiche formation orientee conversion

## Objectif

Renforcer la page publique de detail d'une formation afin d'aider un visiteur a comprendre rapidement la valeur du parcours et a s'inscrire. La presentation s'inspire de la hierarchie de contenu de Coursera tout en conservant la charte FORGES, les donnees existantes et les regles metier actuelles.

## Perimetre

La modification cible principalement `FormationDetailPage.jsx`.

La landing page conserve sa section actuelle de six formations et ses cartes existantes. Elle continue de diriger vers les fiches detaillees, ou se trouve l'argumentaire complet.

Cette version n'ajoute ni modele de donnees, ni endpoint, ni temoignage fictif.

## Structure de la page

### Hero

Le hero existant conserve :

- le fil d'Ariane ;
- le titre et la description courte ;
- les badges de certification, de type Premium et d'inclusion dans l'abonnement ;
- la duree, le mode, le lieu et la langue.

Il reste visuellement rattache a la charte FORGES avec le bleu primaire `#1B4F72`.

### Navigation par ancres

Une barre horizontale est placee entre le hero et le contenu :

- `A propos` ;
- `Resultats` ;
- `Cours`.

`Temoignages` ne sera pas affiche tant que la gestion des temoignages n'est pas disponible.

Chaque lien fait defiler la page vers une section avec un mouvement fluide. La section visible est indiquee par un etat actif. La barre reste visible pendant le defilement sans masquer le titre de la section cible.

Sur mobile, la barre est horizontalement defilable et conserve des zones tactiles suffisantes.

### A propos

Cette section regroupe :

- la description longue, ou la description courte en repli ;
- les prerequis lorsqu'ils existent ;
- la promesse de certification lorsqu'elle s'applique ;
- les informations pratiques qui ne sont pas deja suffisamment visibles dans le hero.

La section est toujours disponible, car elle utilise au minimum la description publique de la formation.

### Resultats

Cette section presente `objectifs_pedagogiques` sous forme de grille a deux colonnes sur grand ecran et une colonne sur mobile.

Chaque objectif est accompagne d'une coche sobre. Aucun resultat commercial, taux d'emploi ou chiffre non verifie ne doit etre invente.

Si aucun objectif pedagogique n'est fourni, l'ancre et la section sont masquees.

### Cours

Cette section utilise `programme_syllabus`.

Le contenu est transforme en elements lisibles :

- les lignes non vides deviennent des modules ou etapes ;
- une numerotation visuelle clarifie l'ordre ;
- le texte original reste intact ;
- aucun module n'est genere lorsque le programme est absent.

Les sessions ouvertes sont affichees apres le programme dans la meme zone `Cours`, sous un sous-titre distinct. Si le programme est absent mais que des sessions existent, l'ancre `Cours` reste visible et conduit directement aux sessions.

Si le programme et les sessions sont tous deux absents, l'ancre et la section sont masquees.

## Colonne d'inscription

La carte laterale reste sticky sur ordinateur et devient le principal point de conversion.

Elle affiche, selon les donnees disponibles :

- l'image de la formation ou un visuel de repli FORGES ;
- le prix catalogue ou la mention d'inclusion dans l'abonnement ;
- la prochaine session ouverte ;
- la date de cloture des inscriptions ;
- le nombre de places ou la capacite connue ;
- la duree, le mode, le lieu, la langue et la certification ;
- le bouton principal `S'inscrire a cette formation`.

Le bouton respecte le comportement existant :

- visiteur non connecte : redirection vers la connexion avec retour vers la formation ;
- apprenant connecte : redirection vers le parcours d'inscription ;
- autre role : aucun contournement des protections existantes.

Lorsqu'aucune session n'est ouverte pour une formation avec session, le bouton est remplace par un etat indisponible explicite. Une formation a la demande conserve son action d'acces ou d'inscription selon les regles existantes.

## Mobile

Sur petit ecran :

- la colonne laterale rejoint le flux principal ;
- une barre d'action fixe en bas affiche le prix et le CTA lorsque l'inscription est possible ;
- un espace inferieur empeche cette barre de masquer le contenu ;
- la navigation par ancres reste utilisable au clavier et au toucher.

## Donnees et repli

La page continue d'accepter les alias de donnees existants :

- `titre` ou `intitule` ;
- `description`, `description_courte` ou `description_longue` ;
- `duree` ou `duree_jours` ;
- `tarif` ou `cout_catalogue`.

Les nouvelles lectures concernent principalement `programme_syllabus` et les informations deja exposees dans les sessions.

Une section optionnelle sans donnees est masquee. Aucun texte de remplissage ou temoignage invente n'est affiche.

## Accessibilite

- Les ancres utilisent de vrais boutons ou liens avec libelles explicites.
- L'etat actif est perceptible visuellement et expose avec `aria-current`.
- Le focus clavier reste visible.
- Le defilement respecte `prefers-reduced-motion`.
- Les titres suivent une hierarchie `h1`, `h2`, puis `h3`.
- Le CTA fixe mobile ne duplique pas une action inaccessible aux technologies d'assistance.

## Verification

Les tests doivent couvrir :

- l'affichage conditionnel des ancres ;
- la grille des resultats ;
- le rendu du programme ;
- l'absence de l'onglet Temoignages ;
- les informations de prochaine session dans la carte laterale ;
- les etats avec et sans session ;
- le comportement du CTA selon l'authentification ;
- le build et le lint frontend.

Une verification visuelle est requise aux formats ordinateur et mobile.
