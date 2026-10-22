# NOTE DE PASSATION — Portfolio Koma v4 « les îles célestes »
*Mise à jour le 2026-10-19 (îles vidées, fenêtres au centre, ouverture en grand). À donner telle quelle à une nouvelle session Claude : la lire EN ENTIER avant d'agir.*
*(L'historique complet des sessions précédentes est archivé dans `_sauvegarde_avant_escalier/NOTE_PASSATION_historique_2026-10-20.md`.)*

---

## 0. FAIT le 2026-10-19 — îles vidées, fenêtres au centre, fenêtre ouverte en grand

Demande de Jordan : sur chaque île, ne garder que la fenêtre ; **exceptions : les îles Outils et Certifications
gardent leurs objets 3D et n'ont pas de fenêtre** (Certifications remise ainsi plus tard le même jour).

- `js/iles.js` ne construit plus que l'île **Outils** (cercle de tuiles d'outils + cristal rouge + pilier).
  Tous les autres objets (cadres, SLAM, cartes, stèles, badges, Jordan pixel, galerie, boîte aux lettres) sont
  retirés ; l'ancien fichier complet est dans `_sauvegarde_avant_escalier/js/iles_complet_2026-10-19.js`
  (copies d'avant ces changements de tous les fichiers touchés : `_sauvegarde_avant_escalier/…_2026-10-19.*`).
- **Pas de fenêtre pour Outils** : la section porte `data-sans-fenetre` (index.html) → `fenetres.js` la saute et
  le CSS la cache en mode fenêtres (`.mode-fenetres .sec.sans-fenetre`). Sur téléphone (< 900 px), la section
  Outils (Pokédex) reste dans la page comme avant.
- Retirés de `main.js` (plus utilisés) : `window.PROJETS`, `window.ouvrirProjet`, `window.STAGES`,
  `window.afficherStage`, l'événement `stage-change`. `window.OUTILS` reste (sert aux tuiles 3D).
- Fenêtres **au centre de leur île** et plus grandes : `fenetres.js` `POSITION = (0, 2.95, 1.2)`, `ECHELLE = 0.0062`.
  Caméra recentrée (`escalier.js`, `vues`) : en face de l'île, `-8.8` en arrière, `+3.6` en hauteur, visée à `+2.6`.
  Revers : le torii est derrière la fenêtre sur certaines îles (sa plaque peut être cachée).
- **Fenêtre ouverte agrandie, sans prendre tout l'écran** (Jordan trouvait le plein écran trop grand) : au plus
  72 % × 80 % de l'écran (`PART_ECRAN` dans `fenetres.js`). `enGrand()` garde la mise en page de 1060 px et
  l'agrandit avec `zoom`, au plus ×1,3 (`ZOOM_MAX`) : ×1,3 sur 1920 px, ×1 sur 1440 px. Texte, cartes, grilles,
  timeline, dialogue, formulaire grossissent ensemble. Toutes les parties vérifiées ouvertes.
- **Bug corrigé** : le clic sur une fenêtre dans le décor ne marchait pas dans Chrome (`overflow: hidden` sur un
  élément en 3D casse la détection du clic). La découpe est maintenant sur la section à l'intérieur.

**Ensuite (même jour)** — Jordan : « certaines fenêtres sont buggées » + **fenêtres blanches (fond blanc, texte noir)** :
- Fenêtres **blanches** (dans le décor et ouvertes). Le style « texte blanc + halo sur le décor » (bloc CSS
  « DÉCOR VISIBLE ») ne s'applique plus qu'**hors mode fenêtres** (`html:not(.mode-fenetres) …`, téléphone) :
  dans les fenêtres, c'est le style clair d'origine du site (cartes blanches, texte `--texte`, accent rouge).
  ⚠ Cela remplace le refus « fond blanc » du §5 pour les fenêtres : c'est sa demande du 2026-10-19.
- Bug 1 : dans le décor, les titres longs (« certifications. », « technologique », « Contacter », titre de
  Formation) dépassaient de la fenêtre (tailles en `vw`). Tailles fixes en px dans les fenêtres (fin du CSS).
- Bug 2 : fenêtre ouverte, le contenu défilé débordait au-dessus/au-dessous du cadre (transformation GSAP restée
  après l'ouverture). L'ouverture efface maintenant sa transformation + `clip-path` sur la fenêtre ouverte.

**Ensuite (même jour)** — Jordan : descente pas fluide, retirer le pied de page, Lugulabre doit nous regarder au clic :
- **Pied de page retiré** (`<footer>` supprimé de index.html ; ses règles CSS restent, inutilisées).
- **Descente fluide** (`escalier.js`) : la caméra suit le défilement avec **deux ressorts amortis en chaîne**
  (`amortir()`, `DOUCEUR = 0.32` s chacun, `VMAX = 1.6` îles/s) au lieu de « vitesse + accélération plafonnées »
  qui accélérait/freinait à chaque cran de molette. Mesuré : vitesse en cloche, sans arrêt entre les crans.
  Plus doux encore : augmenter `DOUCEUR` (mais la caméra traîne plus).
- Gains de perf : `--prof` n'est plus écrit à chaque image (ne sert qu'au mode sans 3D ; il recalculait le style de
  toute la page) ; les fenêtres des autres îles sont cachées par `visibility` et non `display: none` (plus de
  recalcul de mise en page quand la suivante apparaît en plein vol). `zonesTexte` (descente.js) ignore les fenêtres cachées.
- **Lugulabre au clic** : animation « clic » + **un tour complet sur lui-même** (0,9 s)
  puis **il se tourne vers nous et nous regarde** 3,5 s (`comp.tour`, `comp.nousRegarde`), avant de reprendre la souris.
- Copies d'avant : `_sauvegarde_avant_escalier/*_avant-fluide_2026-10-19.*`.
- **Black Flash retiré au clic** (demande de Jordan) : plus d'éclair au clic sur Lugulabre ni sur les lettres SLAM
  (appels retirés de `descente.js` et `slam3d.js` ; la fonction `blackFlash` reste dans `effets.js`, inutilisée).

**Ensuite (même jour)** — Jordan : cartes Projets qui se chevauchent + « remets les certifications comme avant, pas dans une fenêtre » :
- **Certifications = badges 3D sur l'île, sans fenêtre** (comme Outils) : `certifications()` remise dans `iles.js`
  (5 badges d'arène sur socles + étiquettes « Validé » ; survol = un tour, clic = le certificat en grand).
  La section porte `data-sans-fenetre` ; elle reste dans la page sur téléphone.
- **Cartes Projets** : après un survol, une carte restait affichée agrandie et chevauchait sa voisine. Cause : le
  `clip-path` mis sur la fenêtre ouverte (Chrome figeait l'affichage des cartes 3D). Retiré ; à la place, la fenêtre
  ne défile pas pendant les 0,7 s de l'animation d'ouverture (c'est ce qui faisait déborder le contenu).
  ⚠ Ne pas remettre de `clip-path` sur `.premier-plan > .sec`.

**Ensuite (même jour) — DÉCOR RÉALISTE** (Jordan : « repenser la map… je veux une belle 3D réaliste » ; choix validé :
garder les îles célestes, en photo-réaliste) :
- Nouveau module **`js/decor-reel.js`** (les briques) ; `js/escalier.js` garde le tracé, la caméra, Lugulabre et
  appelle ces briques. Ancien décor stylisé sauvegardé : `_sauvegarde_avant_escalier/js/escalier_stylise_2026-10-19.js`.
- **Ciel** : deux vrais ciels photographiés Poly Haven (CC0) — `belfast_sunset_puresky` (coucher, en haut) et
  `qwantani_dusk_2_puresky` (crépuscule, en bas), en fondu selon la profondeur, + étoiles en bas. Convertis par
  `_outils/decor_ciel.py` (HDR 4K -> `assets/decor/ciel/*.jpg`, + `ciels.js` : direction/couleur du soleil, horizon).
  Chaque photo est tournée pour que son soleil soit à droite devant la descente (`SOLEIL_AZ` dans escalier.js).
- **Îles** : falaises de roche en strates générées (`geometriesIle`), mousse au bord, herbe dessus, esplanade de dalles
  (dessus à y = 0, rien ne change pour les fenêtres) ; pas de débord d'herbe là où l'escalier arrive/repart.
  **Herbe 3D** : touffes de 7 brins instanciées qui ondulent au vent (`creerHerbe`). 16 petites îles sauvages au loin.
- **Textures** PBR 2K Poly Haven (`_outils/decor_textures_reel.py` -> `assets/decor/reel/`) : `cliff_side` (falaise),
  `rocky_terrain_03` (mousse), `sparse_grass` (sol), `stone_tiles_02` (esplanades et marches). ~12 Mo.
- **Mer de nuages** : grand relief de cumulus calculé sur la carte graphique (`creerNuages`) : masses + « choux »,
  ombres portées entre nuages (soleil rasant), lumière qui traverse face au soleil, et fondu dans le ciel photo au loin.
- **Lumière** : soleil qui se couche (ombres douces PCF, suivent ce que regarde la caméra), ambiance + reflets
  capturés depuis le ciel lui-même (PMREM, une version par ciel), brume = couleur de l'horizon des photos.
- Accueil : nouvelle vue, en retrait derrière la première île (on la voit flotter au-dessus des nuages).
- Perf mesurée ici (Radeon 760M, 1440×900) : ~12-15 ms par image. Plus léger sur téléphone (pas d'ombres, moins d'herbe).
- ⚠ Pièges : `atan(0,0)` au zénith = NaN (corrigé) ; la version du ciel qui sert à capturer l'éclairage doit passer par
  `#include <encodings_fragment>` (cible RGBE), sinon tout devient noir. En double-clic (file://), pas de textures
  (couleurs de secours), le ciel marche (copies base64 `*.jpg.js`).
- Pistes : quelques arbres (pins/érables) et lanternes de pierre allumées au crépuscule ; rochers plus variés.

**Correctif** — certificat PIX qui ne s'affichait pas : le PDF n'avait jamais été copié dans la v4. Il est maintenant dans
`docs/`, et sa page est rendue en image (`images/cert_pix.webp`, via pypdfium2) : le badge PIX ouvre cette image comme
les autres (plus fiable qu'un PDF intégré). L'image Cisco est petite d'origine (167×141, comme dans l'ancien site).

**2026-10-20 — Veille avec Lugulabre, navigation par la barre seulement, cartes Projets** (demandes de Jordan) :
- **Navigation** : en mode fenêtres, on ne passe d'île en île **que par la barre de gauche** (et les liens, ex. boutons
  de l'accueil). La molette et le clavier ne déplacent plus la caméra (`js/defilement.js`, `parLaNavSeulement`) ;
  barre de défilement et invitation « Scroll » masquées. La souris sert à cliquer sur le décor (fenêtres, badges, outils).
- **Veille sans fenêtre** (`data-sans-fenetre`) : en arrivant sur son île (et seulement si on s'y arrête), **Lugulabre
  vient au milieu de l'île**, en plus grand, face à nous (`escalier.compagnonAuMilieu(i)`), et la boîte de dialogue façon
  Donjon Mystère apparaît en bas de l'écran (titre + sous-titre de la partie, portrait de Lugulabre rendu depuis son
  modèle 3D `portraitCompagnon()`, nom « Lugulabre », mêmes 3 étapes de texte et le bouton de téléchargement).
- **Au revoir** : si on clique sur une autre partie depuis la veille, Lugulabre dit « Au revoir ! » (et fait un tour),
  la boîte se ferme, il reprend sa place, puis la caméra part (`window.Veille.partir(suite)` dans main.js).
- **Cartes Projets** : écart de 34 px ; plus d'inclinaison 3D dans les fenêtres (Chrome figeait une carte agrandie qui
  chevauchait sa voisine) : la carte survolée se soulève simplement.
- Le texte de la veille reste celui de Jordan, à la première personne (« J'ai commencé… ») mais dit par Lugulabre :
  à lui de dire s'il veut l'adapter.

**Correctif cartes Projets** (elles se touchaient encore) : la vraie cause était l'image carrée du projet Roblox (900×900)
qui élargissait le cadre doré de la carte au-delà de sa colonne (élément flex, `min-width: auto`). Corrigé avec
`min-width: 0` sur `.carte-inner / .carte-face / .carte-image` ; fenêtre ouverte = 4 colonnes égales, écart 46 px ;
en-tête de carte façon Pokémon : « PROJET » en haut, titre dessous, badge à droite.

**2026-10-20 — TRADUCTION FR/EN + VERSION MOBILE** :
- **Traduction** : `js/i18n.js` (chargé avant tous les scripts) + `lang/fr.js` (français d'origine, mot pour mot) +
  `lang/en.js` (traduction, mêmes clés). Langue : choix mémorisé (`localStorage` « portfolio-langue ») sinon langue du
  navigateur (« fr… » → français, sinon anglais) ; `<html lang>` mis à jour. Dans index.html, plus de texte : des clés
  `data-i18n` / `data-i18n-html` / `data-i18n-attr` (alt, placeholder, aria-label, data-palier = plaques des torii…).
  Dans le JS : `I18N.t('cle')` (projets, stages, dialogues de la veille, formulaire, fenêtres). Bouton FR/EN en bas de la
  barre de navigation ; changer de langue recharge la page. Outil d'extraction : `_outils/i18n_extraire.py` (déjà lancé).
  **Pour modifier un texte : le changer dans lang/fr.js ET lang/en.js.** L'anglais est à faire relire par Jordan.
- **Mobile** (tout en `@media (max-width: 900px)`, bloc « MOBILE ET TABLETTE » en fin de CSS ; le bureau ne change pas) :
  plus de défilement horizontal (la page faisait 610 px sur un écran de 390), titres à la bonne taille, zones tactiles
  ≥ 44 px, certifications et projets qui tiennent dans l'écran ; ≤ 700 px : barre de navigation en haut (menu, logo,
  FR/EN) qui se déroule en menu plein écran ; écran bas (paysage) : la liste défile dans la barre ; sur écran étroit,
  pas d'objets 3D sur les îles Outils/Certifications (ces parties sont déjà dans la page). Vérifié à 360, 390, 430,
  768×1024 et 844×390.

**Retours de Jordan sur téléphone (2026-10-20)** :
- **Outils et Certifications** : sur téléphone aussi dans le décor, sur leur île (tuiles et badges 3D, touchables :
  la tuile vient devant, le badge ouvre le certificat). Les versions HTML (Pokédex, liste de badges) sont masquées
  quand la 3D marche (`.avec-3d`, ≤ 900 px). Sur écran vertical, cercle et rangée resserrés (`ETROIT` dans iles.js).
- **Lugulabre** sur téléphone : en haut à droite (`HAUT_TEL` dans escalier.js), dans sa **propre couche au-dessus du
  contenu** (`canvas.compagnon-dessus`, rendu en pleine définition de l'écran) : plus caché par le texte, plus net.
  Le décor du téléphone est aussi rendu un peu plus fin (×1,5 au lieu de ×1, la qualité baisse seule si c'est lourd).
- **Contact** : « Contacter » ne déborde plus ; plus de marge réservée à l'ancienne barre latérale (`--sw: 0` ≤ 700 px),
  le contenu prend toute la largeur. Audit refait EN FRANÇAIS (mots plus longs) à 360 et 390 px : rien ne dépasse.
- **Veille** sur téléphone : la nouvelle version aussi (Lugulabre au milieu de l'île + boîte de dialogue), plus
  l'ancien dialogue dans la page. Classe `.veille-lugulabre` sur `<html>` (main.js, dès que la 3D marche). Comme on
  défile avec le doigt, `surveiller()` repère qu'on quitte l'île : « Au revoir ! », la boîte se ferme et Lugulabre
  reprend tout de suite sa place (`partir(suite, true)`). Sur écran vertical, il se pose plus haut (y 5,3 dans
  `compagnonAuMilieu`) pour ne pas cacher le titre ; boîte compacte en bas ≤ 700 px (portrait 64 px, 34 vh max).
- **Tester sur téléphone** : http://192.168.178.79:8777 (même Wi-Fi). Le Wi-Fi est en profil « public » : le serveur
  doit tourner avec **Python 3.13** (autorisé par le pare-feu), pas 3.14 — le .bat et launch.json le font.

À faire ensuite : faire vérifier à Jordan dans **Opera GX** (Ctrl+F5), surtout la taille des fenêtres sur son
écran / le projecteur, et si le torii caché derrière les fenêtres le gêne.

---

## 1. Le projet en bref

- Portfolio de **Jordan Bourgine**, étudiant en BTS SIO option SLAM. Il parle français ; ne pas l'appeler autrement.
- Il sera **projeté devant un jury** : il doit **impressionner** (3D, animations fluides) **et rester lisible**.
- Thème : Jujutsu Kaisen (accent rouge, torii, Black Flash) + clins d'œil Pokémon (cartes, Pokédex, badges,
  dialogue façon Pokémon Donjon Mystère).
- Concept actuel : **des îles célestes** reliées par un escalier de pierres flottantes, au-dessus d'une mer de
  nuages ; on part au coucher de soleil et on descend jusqu'au crépuscule étoilé. **Chaque partie du site a son île**
  (un torii avec une plaque à son nom) et **sa fenêtre posée dans le décor**. La caméra vole d'île en île au défilement.
  **Lugulabre** (modélisé dans Blender) nous accompagne, se range à côté du texte et regarde la souris.

## 2. Où sont les choses, comment lancer

| Quoi | Où |
|---|---|
| Projet actif | `C:\Users\admin\Downloads\portfolio_v4_jujutsu\` |
| Lancer le site | double-clic sur **`Lancer le site.bat`** (serveur Python sur http://localhost:8777 + ouverture du navigateur). Recharger avec **Ctrl+F5**. |
| Config de l'aperçu (Claude) | `portfolio-jujutsu` dans `C:\Users\admin\Downloads\.claude\launch.json` (python http.server 8777). **Le serveur s'arrête quand la session Claude redémarre** : le relancer (preview_start) ou utiliser le .bat. |
| Double-clic sur `index.html` | marche aussi, mais les photos locales ne peuvent pas aller dans la 3D (sécurité file://) → préférer le .bat |
| Navigateur de Jordan | **Opera GX** |
| Ancien site (référence de textes, NE PAS MODIFIER) | `Downloads/portfolio_v3 - Copie/portfolio_finie/` et `Downloads/portfolio_v3/portfolio_clean/` |
| Projet Clipsco (architecture 3D d'origine) | `Downloads/marketing-main/marketing-main/public/js/clipsco/` |
| Outils | Blender 5.2 (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`), Python `py -3.13` (Pillow, numpy, pas de scipy), Node |

## 3. Les fichiers (site)

| Fichier | Rôle |
|---|---|
| `index.html` | la page : barre latérale, accueil (hero), puis les 9 parties (`<section data-palier="…">`) |
| `css/style.css` | tout le style ; blocs importants en fin de fichier : « DÉCOR VISIBLE », « CHAQUE PARTIE SUR SON ÎLE » (mode téléphone), « FENÊTRES DANS LE DÉCOR » |
| `js/trois-outils.js` | outils three.js : rendu robuste, chargement des GLB (avec copies `.glb.js` base64 pour file://), style manga (ombrage 2 tons fixe + contour, os/skinning) |
| `js/decor-reel.js` | **briques du décor réaliste** : îles de roche + herbe, ciel photo, mer de nuages (voir §0) |
| `js/escalier.js` | **le décor 3D** : îles, escalier, torii + plaques, ciel du soir procédural, mer de nuages, rochers, lucioles, **caméra « drone »** (`vues`, `poseCamera`), **Lugulabre** (sa propre scène, dessinée par-dessus) |
| `js/fenetres.js` | **les fenêtres dans le décor** : chaque partie est placée en 3D (calcul du CSS3DRenderer de three.js) dans `.couche3d > .camera3d` ; clic → premier plan (`.premier-plan` + `.voile-fenetre`), clic ailleurs/Échap/croix → retour |
| `js/iles.js` | objets 3D posés sur les îles : seulement **Outils** (cercle de tuiles) et **Certifications** (badges), voir §0 |
| `js/descente.js` | relie le défilement à la caméra : mode fenêtres (`html.mode-fenetres`, écran > 900 px) avec `#parcours` (longueur de défilement), `positionIle(id)` pour le menu, événements `ile-change` / `ile-arrivee` ; charge Lugulabre ; clics/survols du décor |
| `js/defilement.js` | vitesse de défilement plafonnée (repris de Clipsco) ; les liens du menu descendent jusqu'à l'île |
| `js/main.js` | barre latérale, découpage des titres/mots, animations GSAP (en mode fenêtres : `entreeFenetre` à l'arrivée sur l'île), Pokédex, cartes projets + fenêtre de code, stages, dialogue Donjon Mystère, lightbox, formulaire |
| `js/effets.js` | Black Flash (éclairs), curseur, boutons magnétiques |
| `js/slam3d.js` | le mot SLAM 3D **dans la fenêtre** Formation (pas sur l'île) |
| `js/hero3d.js` | plus chargé (ancienne Poké Ball) — gardé pour mémoire |
| `assets/3d/compagnons/lugulabre.glb` (+ `.glb.js`) | Lugulabre (os + animations repos / clic / content) |
| `assets/decor/textures.js` | textures du décor en base64 (pierre et dalles Poly Haven, CC0) |
| `_outils/` | scripts de fabrication : `decor_textures.py`, `compagnons/` (Blender : `commun.py`, `lugulabre.py`, essais komasan/pyrax/mentali, `apercu.html?nom=…` pour voir un modèle sous 4 angles) |
| `_sauvegarde_avant_escalier/` | anciennes versions (CSS/JS d'avant l'escalier, escalier avec Backrooms, escalier « marche », ancienne note) |

## 4. Ce que Jordan a VALIDÉ (à garder)

- **Textes** : tous ceux de l'ancien site, mot pour mot (fautes comprises ; on peut lui proposer de les corriger). Ne jamais inventer de texte à sa place.
- **Barre de navigation à gauche** (repliable, icônes + libellés, sans japonais). **Pas d'intro animée** au chargement.
- **Îles célestes**, du coucher de soleil au crépuscule étoilé (« comme ça c'est parfait »).
- **Lugulabre** : le seul compagnon réussi ; il suit **exactement** la vitesse de défilement (il ne traîne plus), regarde la souris, réagit au clic (animation + tour sur lui-même, puis il nous regarde ; plus de Black Flash).
- **Cartes Pokémon** pour les projets (« c'est du génie », sans PV), **Pokédex** pour les outils, **badges d'arène** pour les certifications, **dialogue Donjon Mystère** pour la veille, **2 stages avec flèches bien visibles**, **contact simple** — tout cela **dans les fenêtres**.
- **Fenêtres dans le décor** : clic = premier plan, clic ailleurs = retour (sa propre idée, 2026-10-20).

## 5. Ce que Jordan a REFUSÉ (ne pas refaire)

- Look « vibe coded » (grosses bordures noires, ombres décalées, badges pixel partout, grain).
- Fond blanc / grands panneaux blancs **posés sur la page** ; texte posé d'emblée au premier plan (il veut des fenêtres dans le décor). (Les **fenêtres**, elles, sont blanches à sa demande, 2026-10-19.)
- **Grands kanji en filigrane** derrière les titres (retirés ; les plaques des torii gardent un kanji de numéro).
- **Les Backrooms** (retirées) — uniquement des îles célestes.
- La **Poké Ball** de l'accueil qui s'ouvre (retirée).
- Les compagnons **Komasan, Pyrax, Mentali** refaits dans Blender (pas assez réussis ; fichiers gardés mais non utilisés) ; avant ça, les versions métaboules et « illustration gonflée » aussi.
- **Les objets 3D posés sur les îles** (cadres, SLAM, cartes, stèles, badges, standee, galerie, boîte aux lettres) → retirés (§0) ; seules les tuiles d'outils restent, et l'île Outils n'a pas de fenêtre.
- Lugulabre trop lent par rapport au défilement (corrigé).

## 6. Pièges techniques déjà rencontrés

- **GLSL refuse les accents**, même dans les commentaires de shader.
- La couche HTML 3D (`.couche3d`) doit avoir **exactement la même boîte que la toile du décor** (`100vw`, barre de défilement comprise) ; sinon les centres de perspective diffèrent et les fenêtres glissent de côté.
- three r128 : `Matrix4.invert()` ; `InstancedMesh.setColorAt` ; pour les maillages avec os, `material.skinning = true`.
- Couleurs « officielles » : l'éclairage ACES + toon délavait tout → ombrage d'anime à 2 tons fixe dans `Trois.manga()` (`toneMapped: false`).
- En file://, les images locales ne vont pas dans WebGL (toile « salie ») → utiliser le serveur.
- Blender 5.2 : fusion de pièces avec `bpy.ops.object.join` (via `temp_override`) ; animations exportées en pistes NLA (`export_animation_mode='NLA_TRACKS'`) ; les objets parentés à un os deviennent enfants du nœud de l'os dans le glTF.
- Les animations GSAP liées au défilement (ScrollTrigger) ne marchent pas pour des éléments placés dans la couche 3D → en mode fenêtres, elles sont jouées à l'arrivée sur l'île (`ile-arrivee` → `entreeFenetre`).
- Une transition CSS `transform` sur un élément animé par GSAP le bloque → ne pas mélanger.
- **Pas d'`overflow: hidden` sur `.fenetre-3d`** (élément en 3D) : Chrome ne détecte plus le clic dessus. Découper l'intérieur (`.fenetre-3d > .sec`).
- `iles.js` lit l'ordre des sections **au chargement** : `fenetres.js` déplace ensuite les sections dans la couche 3D, ce qui change l'ordre dans la page.

## 7. Vérifier (navigateur intégré de l'app Claude)

- `preview_start {name:"portfolio-jujutsu"}` (port 8777) ; si ce port est déjà pris par une autre session : `portfolio-v4-apercu` (port 8779). Puis `resize_window 1440×900`.
- **Le panneau navigateur masqué n'avance les images que pendant les captures** : prendre plusieurs captures d'affilée, et `gsap.ticker.lagSmoothing(0)`.
- Aller directement sur une île : 
  `window.aller = (i) => { scrollTo({top: window.__ancres[i], behavior:'instant'}); __escalier.debug.sauter(); }; aller(4)`
  (0 = accueil, 1 = À propos … 9 = Contact). Ouvrir une fenêtre : `Fenetres.ouvrir('Projets')` ; fermer : `Fenetres.fermer()`.
- Changer le `?v=N` dans `index.html` après chaque modification CSS/JS (cache).
- La vraie validation se fait dans **Opera GX** chez Jordan.

## 8. Manière de travailler avec Jordan

- Il n'aime pas les longues réflexions : **agir vite, montrer tôt, itérer**, donner de courtes nouvelles pendant les tâches longues.
- Il préfère les ressources **gratuites** (Higgsfield est payant en crédits : ne jamais dépenser sans demander).
- Lui montrer des captures (ou lui demander de regarder dans Opera GX) après chaque étape.
