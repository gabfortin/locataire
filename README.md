# Aide aux locataires

Site d'information pour les locataires de Montréal : leurs droits, les étapes
habituelles face à un logement insalubre ou à un problème grave, et un
générateur de modèle de lettre de mise en demeure, en 8 langues.

**En ligne :** [locataire.gabfortin.com](https://locataire.gabfortin.com)

> Le contenu est de l'information juridique générale, pas un avis juridique.
> Le site est rédigé sur un ton informatif plutôt que sous forme de conseils,
> et toute modification du contenu doit conserver ce ton.

## Contenu

| Partie | Ce qu'elle fait |
|---|---|
| **Information** | Définitions (logement insalubre, relation avec le locateur), étapes habituelles, droits en bref, ressources et bloc « Sources » |
| **Générateur de lettre** | 15 étapes : 13 questions une à la fois, la lettre (lire, écouter, modifier), puis l'envoi (courriel, PDF, poste recommandée) ; première lettre d'avis ou mise en demeure |
| **Lecteur de bail** | Photo du bail lue **sur l'appareil** (Tesseract.js) pour pré-remplir les coordonnées ; la photo n'est envoyée nulle part |
| **À propos et avis légal** | À lire et accepter avant d'ouvrir le générateur ; aussi ouvert par le bouton « i » |
| **Langues** | Français, anglais, espagnol, créole haïtien, arabe, italien, pendjabi, ourdou (arabe et ourdou de droite à gauche) |
| **Accessibilité** | Lecture à voix haute des questions, dictée vocale des réponses, mode clair et sombre selon l'appareil |

Détail de chaque partie (étapes du générateur, contenu de la lettre, règles
du lecteur de bail, envoi) : [ARCHITECTURE.md](ARCHITECTURE.md).

## Utilisation locale

```bash
python3 -m http.server 8000   # http://localhost:8000
```

Un serveur est nécessaire (les tuiles de carte ne se chargent pas depuis
`file://`). En cas de doute, faire un rechargement forcé pour éviter les
anciennes versions gardées en cache.

## Architecture

| Fichier | Rôle |
|---|---|
| `index.html` | Toutes les pages (accueil, information, générateur, avis légal) |
| `css/style.css` | Styles : variables de couleur (clair/sombre), composants, icônes en CSS |
| `css/raffinements.css` | Raffinements chargés après style.css : police Inter, touches « sceau » vertes, lisibilité, formulaire, harmonisation avec le style A |
| `css/formulaire.css` | Chargé en dernier : style C en sarcelle, mise en page « formulaire informatif » du générateur, fenêtre d'avis légal, bouton rond de la voix, étapes 14 et 15, lecteur de bail ; en fin de fichier, touches de verre (fond discret, verre léger, ombres douces ; fenêtres modales opaques) |
| `assets/icon.svg` | Logo (maison contenant une lettre) : barre du haut et favicon ; apple-touch-icon.png en est la version 180 px |
| `fonts/` | Inter (woff2) et Great Vibes (signature électronique, réduite aux caractères latins), hébergées localement, avec leurs licences OFL |
| `js/i18n.js` | Textes de l'interface dans les 8 langues |
| `js/letter.js` | Modèle de la lettre (français et anglais) |
| `js/pdf.js` | Création du PDF de la lettre |
| `js/main.js` | Navigation, formulaire, actions sur la lettre |
| `js/printmap.js` | Cartes des lieux pour imprimer et des bureaux de poste |
| `js/speech.js` | Lecture à voix haute des questions |
| `js/dictation.js` | Dictée vocale des réponses |
| `js/scan.js` | Lecteur de bail : photo → texte (sur l'appareil) → champs pré-remplis |
| `js/vendor/` | jsPDF (et sa licence) ; tesseract/ : Tesseract.js 5.1.1, son moteur WebAssembly et les données de langue fra et eng (chargés seulement au clic) |
| `CNAME` | Domaine personnalisé pour GitHub Pages |

Aucune étape de compilation : les fichiers sont servis tels quels. Style C de [DESIGN-PAGES.md](../DESIGN-PAGES.md) (référence),
mise en page « formulaire informatif ». Composants communs : `.communs.json`.

### Modifier le contenu

- **Textes de l'interface** : dans `js/i18n.js`. Chaque clé doit exister dans les 8 langues ; une clé manquante s'affiche en français. Le texte français est aussi écrit directement dans `index.html` (attribut `data-i18n`), pour l'affichage avant le chargement du JavaScript : garder les deux identiques.
- **Lettre** : dans `js/letter.js`, en français et en anglais. Les articles du Code civil du Québec cités doivent être vérifiés.
- **Date de mise à jour** : penser à changer la clé `legal.updated` quand le contenu juridique change.
- **Icônes** : définies à la fin de `css/style.css` ; on les utilise avec l'attribut `data-icon="nom"`.

Les traductions autres que le français et l'anglais ont été produites sans relecture par des locuteurs natifs : une relecture est la bienvenue.

## Publication

GitHub Pages, branche `main`, domaine dans `CNAME`. Version x.y.z et `?v=` des
balises CSS et JS de `index.html` écrits par le hook de commit (`version.txt`,
`.version.json`) : sans ce changement, les navigateurs pourraient garder
l'ancienne version des fichiers en cache.

### Accès restreint pendant les essais (Cloudflare Access)

GitHub Pages ne sait pas restreindre l'accès. Pour réserver le site à quelques personnes (par courriel), mettre Cloudflare Access devant le domaine, sans changer le code :

1. Faire gérer le DNS de `gabfortin.com` par Cloudflare (gratuit), ou au minimum celui du sous-domaine `locataire.gabfortin.com`, en gardant l'enregistrement CNAME vers GitHub Pages **proxifié** (nuage orange).
2. Cloudflare Zero Trust → Access → Applications → *Self-hosted* : domaine `locataire.gabfortin.com`.
3. Politique *Allow* → *Emails* : la liste des courriels autorisés. Méthode de connexion : *One-time PIN* (un code est envoyé par courriel, aucun compte requis).
4. Vérifier dans une fenêtre privée que le site demande le courriel, puis qu'un courriel autorisé y accède.

Pour ouvrir le site à tous : supprimer l'application Access. Le forfait gratuit couvre jusqu'à 50 personnes.

## Confidentialité

Le site est entièrement statique : il n'a ni serveur, ni base de données, ni compte. Les visites sont comptées de façon anonyme avec [GoatCounter](https://www.goatcounter.com) (sans cookies, sans conserver l'adresse IP), qui ne voit jamais les réponses ni la lettre.

- Les réponses et la lettre restent dans le navigateur. Le brouillon, la langue choisie, la préférence de lecture et dictée et l'acceptation de l'avis légal sont enregistrés dans le `localStorage` de l'appareil.
- Le PDF est créé dans le navigateur (jsPDF, inclus dans le dépôt).
- La lecture à voix haute utilise les voix installées sur l'appareil.
- Le lecteur de bail lit la photo sur l'appareil (Tesseract.js et ses données de langue sont hébergés dans le dépôt) : ni la photo ni son texte ne sont envoyés.

Trois fonctions envoient des données à un tiers, toujours après une action de la personne et avec une mention ou une demande de consentement. S'y ajoute la mesure d'audience anonyme, décrite dans la même section de la page :

| Fonction | Ce qui est envoyé | À qui |
|---|---|---|
| Mesure d'audience (chaque visite) | La page consultée, le site d'origine, le type d'appareil, le pays (déduit de l'adresse IP, qui n'est pas conservée) | GoatCounter |
| Cartes des lieux | L'adresse du logement | OpenStreetMap (Nominatim), puis tuiles de carte d'OpenStreetMap et Leaflet depuis cdnjs |
| Dictée vocale | L'enregistrement de la voix | Google, Apple ou Microsoft, selon le navigateur |
| Envoi par courriel | La lettre | L'application de courriel choisie par la personne |

Toute nouvelle fonction qui envoie des données doit suivre le même principe et être ajoutée à la section « Confidentialité » de la page « À propos et avis légal ».

## Crédits

- [jsPDF](https://github.com/parallax/jsPDF) (MIT), inclus dans `js/vendor/`
- [Tesseract.js](https://github.com/naptha/tesseract.js) et [tesseract.js-core](https://github.com/naptha/tesseract.js-core) (Apache 2.0), inclus dans `js/vendor/tesseract/` avec leurs licences ; données de langue `fra` et `eng` du projet [tessdata](https://github.com/tesseract-ocr/tessdata) (Apache 2.0), version « best_int » distribuée par tesseract.js-data
- [Inter](https://rsms.me/inter/) (SIL OFL 1.1), hébergée dans `fonts/` (aucune requête externe), même police que gabfortin.com
- [Leaflet](https://leafletjs.com) (BSD-2-Clause), chargé depuis cdnjs à l'ouverture d'une carte
- Données cartographiques © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), recherche par [Nominatim](https://nominatim.org)

## Auteurs

Conçu par [Elvira Carhuallanqui](https://elvirac.ca/), conseillère de la ville
(district de Parc-Extension), et [Gabriel Fortin](https://gabfortin.com),
conseiller d'arrondissement du Plateau-Mont-Royal (district de Jeanne-Mance) :
seule exception à « Développé par », voir
[SIGNATURE-ET-CONFIDENTIALITE.md](../SIGNATURE-ET-CONFIDENTIALITE.md). Projet
personnel et gratuit : ce n'est pas un service de la Ville de Montréal ni d'un
arrondissement.

## Documentation détaillée

| Fichier | Contenu |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Fonctionnement détaillé : générateur, lettre, lecteur de bail, envoi, accessibilité |
| [A-FAIRE.md](A-FAIRE.md) | Relecture des traductions, contenu attendu d'Elvira, idées pour plus tard |
