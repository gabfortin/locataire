# Aide aux locataires

Site d'information pour les locataires de Montréal : leurs droits, les étapes habituelles face à un logement insalubre ou à un problème grave, et un générateur de modèle de lettre de mise en demeure.

**En ligne :** [locataire.gabfortin.com](https://locataire.gabfortin.com)

Projet personnel et gratuit de Gabriel Fortin, conseiller d'arrondissement du Plateau-Mont-Royal (district de Jeanne-Mance), et d'Elvira Carhuallanqui, conseillère de la ville (district de Parc-Extension). Ce n'est pas un service de la Ville de Montréal ni d'un arrondissement.

> Le contenu est de l'information juridique générale, pas un avis juridique. Le site est rédigé sur un ton informatif plutôt que sous forme de conseils, et toute modification du contenu devrait conserver ce ton.

## Fonctionnalités

- **Information** : définitions (logement insalubre, problème grave), étapes habituelles, droits en bref (visites, travaux, serrures, modification du bail) et ressources (TAL, Éducaloi, RCLALQ, 311).
- **Générateur de lettre** en 5 étapes : la personne répond dans sa langue, et la lettre est rédigée dans la langue du bail (français ou anglais).
- **Lettre générée** : copie, téléchargement en PDF, impression, envoi par courriel (fichier joint via le menu de partage du système, sinon lien `mailto:`).
- **Imprimer et envoyer** : informations sur l'impression et le courrier recommandé, avec des cartes des lieux à proximité (imprimeries, Bureau en Gros, bibliothèques, bureaux de Postes Canada).
- **8 langues d'interface** : français, anglais, espagnol, créole haïtien, arabe, italien, pendjabi, ourdou (arabe et ourdou affichés de droite à gauche).
- **Accessibilité** : lecture à voix haute des questions avec surlignage du choix lu, et dictée vocale des réponses.
- **Mode clair et sombre** selon le réglage de l'appareil.

## Confidentialité

Le site est entièrement statique : il n'a ni serveur, ni base de données, ni compte, ni statistiques de visite.

- Les réponses et la lettre restent dans le navigateur. Le brouillon et la langue choisie sont enregistrés dans le `localStorage` de l'appareil.
- Le PDF est créé dans le navigateur (jsPDF, inclus dans le dépôt).
- La lecture à voix haute utilise les voix installées sur l'appareil.

Trois fonctions envoient des données à un tiers, toujours après une action de la personne et avec une mention ou une demande de consentement :

| Fonction | Ce qui est envoyé | À qui |
|---|---|---|
| Cartes des lieux | L'adresse du logement | OpenStreetMap (Nominatim), puis tuiles de carte d'OpenStreetMap et Leaflet depuis cdnjs |
| Dictée vocale | L'enregistrement de la voix | Google, Apple ou Microsoft, selon le navigateur |
| Envoi par courriel | La lettre | L'application de courriel choisie par la personne |

Toute nouvelle fonction qui envoie des données doit suivre le même principe et être ajoutée à la section « Confidentialité » de la page « À propos et avis légal ».

## Structure

```
index.html            Toutes les pages (accueil, information, générateur, avis légal)
css/style.css         Styles : variables de couleur (clair/sombre), composants, icônes en CSS
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

**À chaque mise en ligne**, changer le numéro de version `?v=` des balises CSS et JS au bas de `index.html` (et dans la balise du CSS en haut). Sans ce changement, les navigateurs des visiteurs peuvent garder l'ancienne version des fichiers en cache.

## Modifier le contenu

- **Textes de l'interface** : dans `js/i18n.js`. Chaque clé doit exister dans les 8 langues ; une clé manquante s'affiche en français. Le texte français est aussi écrit directement dans `index.html` (attribut `data-i18n`), pour l'affichage avant le chargement du JavaScript : garder les deux identiques.
- **Lettre** : dans `js/letter.js`, en français et en anglais. Les articles du Code civil du Québec cités doivent être vérifiés.
- **Date de mise à jour** : penser à changer la clé `legal.updated` quand le contenu juridique change.
- **Icônes** : définies à la fin de `css/style.css` ; on les utilise avec l'attribut `data-icon="nom"`.

Les traductions autres que le français et l'anglais ont été produites sans relecture par des locuteurs natifs : une relecture est la bienvenue.

## Crédits

- [jsPDF](https://github.com/parallax/jsPDF) (MIT), inclus dans `js/vendor/`
- [Leaflet](https://leafletjs.com) (BSD-2-Clause), chargé depuis cdnjs à l'ouverture d'une carte
- Données cartographiques © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), recherche par [Nominatim](https://nominatim.org)
