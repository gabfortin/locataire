# Aide aux locataires

Site d'information pour les locataires de Montréal : leurs droits, les étapes habituelles face à un logement insalubre ou à un problème grave, et un générateur de modèle de lettre de mise en demeure.

**En ligne :** [locataire.gabfortin.com](https://locataire.gabfortin.com)

Projet personnel et gratuit de [Gabriel Fortin](https://gabfortin.com), conseiller d'arrondissement du Plateau-Mont-Royal (district de Jeanne-Mance), et d'[Elvira Carhuallanqui](https://elvirac.ca/), conseillère de la ville (district de Parc-Extension). Ce n'est pas un service de la Ville de Montréal ni d'un arrondissement.

> Le contenu est de l'information juridique générale, pas un avis juridique. Le site est rédigé sur un ton informatif plutôt que sous forme de conseils, et toute modification du contenu devrait conserver ce ton.

## Fonctionnalités

- **Fenêtre « À propos et avis légal »** au premier clic sur « Générer ma lettre » (ou « Générer cette lettre ») : elle s'affiche dans la langue choisie sur le site à ce moment ; le texte doit être lu jusqu'au bout (défilement) puis accepté (« J'ai lu et j'accepte »), et le générateur s'ouvre ensuite. Échap la ferme sans accepter. L'acceptation est gardée dans le `localStorage`.
- **Information** : définitions (logement insalubre, relation avec le locateur), étapes habituelles (dont le lien vers la demande d'inspection de la Ville, l'avis d'abandon du logement du TAL et le numéro du TAL), droits en bref (visites, travaux, serrures, modification du bail, quitter un logement insalubre), ressources et bloc « Sources ».
- **Générateur de lettre** en 13 étapes, une question à la fois (mise en page « formulaire informatif ») : colonne de gauche avec la progression en pourcentage, les informations et la base légale de l'étape ; champs obligatoires marqués d'un astérisque ; dates futures refusées ; description limitée à 250 mots.
  1. Locateur déjà informé ? (oui → mise en demeure ; non → **première lettre d'avis** ; non → mise en demeure tout de même)
  2. Type de problème (salubrité, relation avec le locateur) · 3. Langue du bail · 4. Nom et adresse · 5. Coordonnées · 6. Locateur
  7. Problèmes (liste qui devient verte une fois cochée) · 8. Description · 9. Dates · 10. Préjudice · 11. Délai (10 jours ouvrables recommandés, à titre informatif) · 12. Ce que je demande (dont « Autre chose ») · 13. Ton (neutre, cordial, ferme)
- **Lettre générée** (`js/letter.js`) : « MISE EN DEMEURE / SOUS TOUTES RÉSERVES » en grosses capitales, puis la situation, « je vous ai informé… », le préjudice, la base légale, la mise en demeure et le délai, les demandes et la suite (TAL). La mention « sous toutes réserves » est voulue : « sans préjudice » marquerait la lettre comme une offre de négociation, qu'on ne pourrait pas déposer en preuve.
- **Après la lettre** : écoute de la lettre (voix de l'appareil, langue du bail), signature électronique (« J'accepte » : le nom s'ajoute sur la ligne de signature en écriture manuscrite, police Great Vibes), PDF, impression, courriel prérempli (objet « Mise en demeure – nom », message d'accusé de réception daté, lettre jointe), copie du texte ; puis « Bravo » et le guide pour imprimer et envoyer (cartes des lieux à proximité).
- **8 langues d'interface** : français, anglais, espagnol, créole haïtien, arabe, italien, pendjabi, ourdou (arabe et ourdou affichés de droite à gauche).
- **Accessibilité** : pastille flottante « Lecture et dictée » (lecture à voix haute des questions avec surlignage, dictée vocale des réponses), écoute de la description écrite.
- **Mode clair et sombre** selon le réglage de l'appareil.

## À faire (novembre 2026)

- **Relecture des traductions** : les textes ajoutés en novembre 2026 (générateur `wz.*`, fenêtre `terms.*`, ajouts d'Elvira dans la page d'information) ont été traduits dans les 6 autres langues le 4 novembre 2026, en brouillon, sans relecture : à faire relire par Elvira et, idéalement, par des locuteurs natifs. Liens officiels : versions françaises pour l'espagnol, le créole, l'arabe et l'italien ; versions anglaises pour le pendjabi et l'ourdou (même règle que les liens existants).
- **Contenu attendu d'Elvira** : jurisprudence à ajouter ; étape 2 de la page d'information (sans consigne) et étape 4 (« trouver page »).
- **Accès restreint** à quelques personnes pendant les essais : Cloudflare Access (voir « Mise en ligne »).
- **Plus tard** : reformulation et correction de la description par une IA (exige un petit serveur qui garde la clé d'API, un consentement explicite et une mise à jour de la confidentialité) ; essai d'un lecteur de bail (photo → noms et langue du bail).

## Confidentialité

Le site est entièrement statique : il n'a ni serveur, ni base de données, ni compte. Les visites sont comptées de façon anonyme avec [GoatCounter](https://www.goatcounter.com) (sans cookies, sans conserver l'adresse IP), qui ne voit jamais les réponses ni la lettre.

- Les réponses et la lettre restent dans le navigateur. Le brouillon, la langue choisie, la préférence de lecture et dictée et l'acceptation de l'avis légal sont enregistrés dans le `localStorage` de l'appareil.
- Le PDF est créé dans le navigateur (jsPDF, inclus dans le dépôt).
- La lecture à voix haute utilise les voix installées sur l'appareil.

Trois fonctions envoient des données à un tiers, toujours après une action de la personne et avec une mention ou une demande de consentement. S'y ajoute la mesure d'audience anonyme, décrite dans la même section de la page :

| Fonction | Ce qui est envoyé | À qui |
|---|---|---|
| Mesure d'audience (chaque visite) | La page consultée, le site d'origine, le type d'appareil, le pays (déduit de l'adresse IP, qui n'est pas conservée) | GoatCounter |
| Cartes des lieux | L'adresse du logement | OpenStreetMap (Nominatim), puis tuiles de carte d'OpenStreetMap et Leaflet depuis cdnjs |
| Dictée vocale | L'enregistrement de la voix | Google, Apple ou Microsoft, selon le navigateur |
| Envoi par courriel | La lettre | L'application de courriel choisie par la personne |

Toute nouvelle fonction qui envoie des données doit suivre le même principe et être ajoutée à la section « Confidentialité » de la page « À propos et avis légal ».

## Structure

```
index.html            Toutes les pages (accueil, information, générateur, avis légal)
css/style.css         Styles : variables de couleur (clair/sombre), composants, icônes en CSS
css/raffinements.css  Raffinements chargés après style.css : police Inter, touches « sceau » vertes, lisibilité, formulaire, harmonisation avec le style A
css/formulaire.css    Chargé en dernier : style C en sarcelle, mise en page « formulaire informatif » du générateur, fenêtre d'avis légal, pastille de la voix ; en fin de fichier, touches de verre (fond discret, verre léger, ombres douces ; fenêtres modales opaques)
assets/icon.svg       Logo (maison contenant une lettre) : barre du haut et favicon ; apple-touch-icon.png en est la version 180 px
fonts/                Inter (woff2) et Great Vibes (signature électronique, réduite aux caractères latins), hébergées localement, avec leurs licences OFL
js/i18n.js            Textes de l'interface dans les 8 langues
js/letter.js          Modèle de la lettre (français et anglais)
js/pdf.js             Création du PDF de la lettre
js/main.js            Navigation, formulaire, actions sur la lettre
js/printmap.js        Cartes des lieux pour imprimer et des bureaux de poste
js/speech.js          Lecture à voix haute des questions
js/dictation.js       Dictée vocale des réponses
js/vendor/            jsPDF (et sa licence)
CNAME                 Domaine personnalisé pour GitHub Pages
```

Aucune étape de compilation : les fichiers sont servis tels quels.

## Développement local

Un serveur local est nécessaire (les tuiles de carte ne se chargent pas depuis `file://`) :

```sh
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. En cas de doute, faire un rechargement forcé pour éviter les anciennes versions gardées en cache.

## Mise en ligne

Le site est publié par GitHub Pages depuis la branche `main`, sur le domaine défini dans `CNAME`.

**À chaque mise en ligne**, changer le numéro de version `?v=` des balises CSS et JS au bas de `index.html` (et dans les trois balises CSS en haut : `style.css`, `raffinements.css` et `formulaire.css`). Sans ce changement, les navigateurs des visiteurs peuvent garder l'ancienne version des fichiers en cache.

### Accès restreint pendant les essais (Cloudflare Access)

GitHub Pages ne sait pas restreindre l'accès. Pour réserver le site à quelques personnes (par courriel), mettre Cloudflare Access devant le domaine, sans changer le code :

1. Faire gérer le DNS de `gabfortin.com` par Cloudflare (gratuit), ou au minimum celui du sous-domaine `locataire.gabfortin.com`, en gardant l'enregistrement CNAME vers GitHub Pages **proxifié** (nuage orange).
2. Cloudflare Zero Trust → Access → Applications → *Self-hosted* : domaine `locataire.gabfortin.com`.
3. Politique *Allow* → *Emails* : la liste des courriels autorisés. Méthode de connexion : *One-time PIN* (un code est envoyé par courriel, aucun compte requis).
4. Vérifier dans une fenêtre privée que le site demande le courriel, puis qu'un courriel autorisé y accède.

Pour ouvrir le site à tous : supprimer l'application Access. Le forfait gratuit couvre jusqu'à 50 personnes.

## Modifier le contenu

- **Textes de l'interface** : dans `js/i18n.js`. Chaque clé doit exister dans les 8 langues ; une clé manquante s'affiche en français. Le texte français est aussi écrit directement dans `index.html` (attribut `data-i18n`), pour l'affichage avant le chargement du JavaScript : garder les deux identiques.
- **Lettre** : dans `js/letter.js`, en français et en anglais. Les articles du Code civil du Québec cités doivent être vérifiés.
- **Date de mise à jour** : penser à changer la clé `legal.updated` quand le contenu juridique change.
- **Icônes** : définies à la fin de `css/style.css` ; on les utilise avec l'attribut `data-icon="nom"`.

Les traductions autres que le français et l'anglais ont été produites sans relecture par des locuteurs natifs : une relecture est la bienvenue.

## Crédits

- [jsPDF](https://github.com/parallax/jsPDF) (MIT), inclus dans `js/vendor/`
- [Inter](https://rsms.me/inter/) (SIL OFL 1.1), hébergée dans `fonts/` (aucune requête externe), même police que gabfortin.com
- [Leaflet](https://leafletjs.com) (BSD-2-Clause), chargé depuis cdnjs à l'ouverture d'une carte
- Données cartographiques © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), recherche par [Nominatim](https://nominatim.org)
