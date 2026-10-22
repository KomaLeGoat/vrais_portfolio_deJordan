# NOTE DE PASSATION — Portfolio Koma v4 (à donner telle quelle à une nouvelle session Claude)

> Lis TOUT ce fichier avant d'agir. Il résume 2 itérations ratées en partie, ce que l'utilisateur
> a validé, ce qu'il a refusé, et ce qu'il veut maintenant. L'utilisateur s'appelle Jordan
> (BTS SIO SLAM). Il parle français. Le portfolio sera **projeté devant un jury** : il doit
> **impressionner** (3D, animations fluides), tout en restant **lisible**.

---

## 1. Où sont les choses

| Quoi | Chemin |
|---|---|
| **Projet actif (v4)** | `C:\Users\admin\Downloads\portfolio_v4_jujutsu\` |
| Ancien site (référence de style, NE PAS MODIFIER) | `C:\Users\admin\Downloads\portfolio_v3 - Copie\portfolio_finie\` (le plus récent) et `C:\Users\admin\Downloads\portfolio_v3\portfolio_clean\` |
| Projet « marketing » à imiter pour l'interactivité 3D | `C:\Users\admin\Downloads\marketing-main\marketing-main\` (site Clipsco : `public/js/clipsco/escalier.js`, `plongee.js`, `physique.js`, `defilement.js`, `renard-ponton.js` ; scripts Blender dans `media/clipsco/`) |
| Mode d'emploi du v4 | `portfolio_v4_jujutsu\LISEZMOI.txt` |
| Lancer le site | config `portfolio-jujutsu` dans `C:\Users\admin\Downloads\.claude\launch.json` (python http.server 8777 → http://localhost:8777). Le double-clic sur `index.html` marche aussi (les modèles 3D sont dupliqués en `.glb.js` base64). |
| Navigateur de l'utilisateur | **Opera GX** (WebGL OK, la 3D s'y affiche bien). |

Structure v4 : `index.html`, `css/style.css`, `js/trois-outils.js` (rendu WebGL robuste + chargement GLB + style manga), `js/effets.js` (Black Flash, curseur, boutons magnétiques), `js/hero3d.js` (Poké Ball + compagnons), `js/slam3d.js`, `js/main.js` (sidebar, GSAP, Pokédex, cartes, stages, dialogue, formulaire), `js/vendor/` (three r128, GLTFLoader r128, GSAP 3.12.5 + ScrollTrigger, en local), `assets/3d/`, `images/`, `docs/`, `_outils/` (scripts Python/Blender, voir LISEZMOI).

Outils sur la machine : Blender 5.2 (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, GPU RTX 4050 → utiliser CUDA, pas OptiX), Python `py -3.13` (Pillow, numpy ; **pas de scipy**), Node. Poly Haven (textures/modèles CC0, l'API exige un User-Agent). Higgsfield MCP disponible mais **payant en crédits** (≈4,5 crédits restants) : ne jamais dépenser sans demander.

---

## 2. Ce que l'utilisateur a VALIDÉ (à garder)

- **Textes** : TOUS les textes de l'ancien site, mot pour mot (fautes comprises ; on peut lui proposer de les corriger). Le 2e stage « Caledonia — Application multiplateforme » (8 étapes) vient de `portfolio_finie`.
- ~~Fond clair partout~~ → **remplacé** : avec l'escalier 3D, le fond devient le décor (ciel de soirée → Backrooms), voir §3.2 et §4.1. Accent rouge conservé.
- **Barre de navigation à gauche comme l'ancien site** (sidebar repliable, icônes + libellés, SANS japonais).
- **Pas d'intro animée** au chargement.
- **Pas de caractères japonais au-dessus des titres** ; les **grands kanji en filigrane dans le fond** sont appréciés.
- **Poké Ball** dans le hero, qui fait sortir **Pyrax (Volcarona), Lugulabre (Chandelure), Mentali (Espeon) et Komasan** au clic, la balle se place **au-dessus d'eux en plus petit**, re-clic → ils rentrent. Le principe est validé (et ça marche dans Opera GX).
- **Pokédex** pour les outils (sans le texte « Fais glisser… »).
- **Cartes Pokémon pour les projets** (« c'est du génie »), **sans PV**.
- **Stages** : 2 stages avec des **flèches bien visibles**.
- **Certifications** en badges d'arène : « rien à redire ».
- **Veille** : style boîte de dialogue **Pokémon Donjon Mystère** (portraits pixel `images/portrait1-3.png`) — pas de retour négatif.
- **Contact** : simple, sans décor.

## 3. Ce que l'utilisateur a REFUSÉ / critiqué (ne pas refaire)

1. **Look « vibe coded »** : la v4 est jugée **moins propre que l'ancien site**. Trop de gimmicks (grosses bordures noires + ombres décalées partout, badges pixel partout, grain…). → Repartir du **langage visuel de l'ancien site** (`portfolio_finie/css/style.css` : fond blanc, cartes propres, typographies sobres) et n'ajouter que des effets maîtrisés.
2. **Fond** — ⚠ MIS À JOUR, cette consigne REMPLACE l'ancienne :
   - **Plus de fond blanc** dès qu'on fait l'escalier 3D (§4.1). Le fond, c'est **le décor 3D lui-même**, un peu **magique** :
     **on commence sous un beau ciel de soirée** (coucher de soleil, dégradé orange/rose/violet, nuages, premières étoiles, lumière chaude)
     et, en descendant les marches, l'ambiance glisse progressivement jusqu'à **une salle des Backrooms perdue** à la fin.
   - Le GIF de Yuji (`yuji_fond.gif`, fond du hero de l'ancien site, sous un voile sombre :
     `linear-gradient(rgba(8,8,12,.48), rgba(8,8,12,.80)), url('../images/yuji_fond.gif') center/cover`) peut rester **dans le hero du début**
     seulement s'il se marie avec le ciel de soirée ; sinon le ciel 3D passe en priorité. ⚠ Il fait **70 Mo** (1905×960, 455 images) :
     le convertir en **vidéo MP4/WebM** en boucle (`<video autoplay muted loop playsinline>`) avant tout usage.
   - Lisibilité (projection) : le texte reste sur des **panneaux** clairs ou sombres bien contrastés posés sur le décor, jamais directement sur le ciel chargé.
3. **Case « Yuji qui marche »** à côté de la Poké Ball (`.hero-panel`, `yuji_pas.webp`) : **à retirer** (fait tache quand la balle s'ouvre).
4. **Étiquettes de nom** au-dessus des créatures sorties : **à retirer**.
5. **« SLAM » 3D enfermé dans une boîte** : l'**incruster directement** dans la carte Formation (canvas transparent, sans bordure ni fond hachuré).
6. **Cartes projets** : certaines **coupent le texte** (description tronquée : `.carte` a un `aspect-ratio` fixe et `.carte-desc{overflow:hidden}`) → la carte doit s'adapter au texte.
7. **Créatures 3D** — deux échecs :
   - v1 : modélisées à la main en métaboules → « assez moches ».
   - v2 (actuelle) : illustration officielle « gonflée » en relief et animée par shader → **« leur modèle bouge bizarrement »**. Ce n'est PAS ce qu'il veut.
   - **Ce qu'il voulait** : de **vrais personnages 3D refaits dans Blender, fidèles aux officiels, et INTERACTIFS** (pas une image qui se déforme). Voir §4.2.
8. **Le portfolio « impressionne peu »** → voir la grande refonte §4.1.
9. Il trouve que Claude est fort en code mais **moins bon en graphisme/animation** → **utiliser des outils/ressources spécialisés** (voir §5) et ne faire « à la main » qu'en dernier recours.

---

## 4. CE QU'IL FAUT FAIRE MAINTENANT (par ordre de priorité)

### 4.1 Grande refonte : un portfolio **interactif en 3D**, comme le projet marketing
**Plus de fond blanc** : **un vrai décor three.js, un peu magique, qui réagit aux mouvements de l'utilisateur**. Idée de l'utilisateur :
- **Début = un beau ciel de soirée** (coucher de soleil, nuages colorés, premières étoiles, lumière chaude) en haut de l'escalier ; la Poké Ball et ses compagnons y sont mis en scène.
- **Un escalier** : plus on fait défiler, plus on **descend les marches** ; chaque section du portfolio est un palier (les contenus restent lisibles en HTML par-dessus, sur des panneaux propres et contrastés).
- **Transition progressive** : en descendant, la lumière du soir s'éteint petit à petit, l'escalier devient plus étrange (lumière froide, brouillard, néons)…
- **Fin = une salle des Backrooms perdue** (papier peint jaune, moquette humide, néons qui grésillent, couloirs à perte de vue, bourdonnement visuel), en three.js. Le Contact peut être dans cette salle.
- Ciel : skybox/HDRI de coucher de soleil CC0 (Poly Haven a des HDRI « sunset ») ou ciel procédural (shader type Shadertoy : dégradé + nuages fbm + étoiles), qu'on fait tourner/évoluer au défilement.
- Le décor **suit la souris/le doigt** (parallaxe caméra, regard), **jamais de scroll-jacking** (le défilement reste natif ; voir `defilement.js` de Clipsco qui plafonne juste la vitesse).
- **Réutiliser l'architecture Clipsco** (`escalier.js` = caméra qui descend un escalier 3D au défilement avec un palier par section via `data-palier` ; `plongee.js` = boucle de rendu + qualité adaptative ; `physique.js` = petits ressorts sur les éléments). C'était validé par l'utilisateur sur Clipsco.
- Décor : modèles/textures CC0 (Poly Haven, ambientCG) + Blender pour assembler ; Backrooms = textures papier peint jaune / moquette / dalles de plafond + néons (RectAreaLight ou émissifs) ; brouillard ; léger bruit/aberration en post-traitement.
- Lisibilité projection : texte HTML sur panneaux clairs, contrastés ; la 3D derrière.

### 4.2 Les 4 compagnons en **vraie 3D interactive** (Blender)
- Modéliser **chacun proprement** dans Blender en utilisant les illustrations officielles comme **plans de référence** (face/profil) : `_outils/officielles/*_source.png` (Pyrax=637, Lugulabre=609, Mentali=196 depuis PokeAPI official-artwork ; Komasan via `images.weserv.nl` car fandom bloque curl).
- Modélisation par **subdivision surface** (pas de métaboules), matériaux toon + contour, **rig** (os : ailes de Pyrax, bras/flammes de Lugulabre, oreilles/queue de Mentali, sourcils/queue de Komasan), **animations Blender** exportées en glTF (repos, sortie de la balle, réaction au clic, « content ») jouées par `THREE.AnimationMixer`.
- Interactif : ils **regardent le curseur**, **réagissent au clic** (animation dédiée), éventuellement suivent l'utilisateur dans le décor (comme le renard qui court/nage sur Clipsco : `renard-ponton.js`).
- Alternative plus rapide mais payante : image→3D (Higgsfield `generate_3d` / SAM 3D ≈1 crédit chacun, Meshy/Tripo trop chers). Sur Clipsco, le rendu SAM 3D avait été jugé flou/buggé. **Demander avant de dépenser des crédits.**
- Vérifier chaque modèle sous 4 angles (face, 3/4, profil, dos) avant de le montrer.

### 4.3 Retouches rapides (faciles, à faire en premier si peu de temps)
- Retirer `.hero-panel` (Yuji qui marche) et les étiquettes `.etiquette` des créatures (`hero3d.js` : création des `div.etiquette` + `classList.add('visible')`).
- Fond : voir §3.2 (plus de fond blanc ; ciel de soirée en haut → Backrooms en bas). Si la refonte 3D n'est pas encore prête, mettre au moins un ciel de soirée en fond du hero en attendant.
- SLAM : enlever le cadre `.slam3d` (bordure, fond, `aspect-ratio`), canvas transparent posé dans la carte.
- Cartes projets : hauteur automatique (retirer `aspect-ratio` de `.carte` / passer `.carte-inner` en position statique), plus de texte coupé.
- Alléger le style (§3.1).

---

## 5. Outils à utiliser (l'utilisateur les a listés)
three.js (déjà là, r128 local — passer à une version récente en module si besoin de post-processing), Babylon.js, p5.js, Shadertoy (shaders d'ambiance), Cables.gl, **GSAP** (ScrollTrigger déjà là), **Theatre.js** (chorégraphie de caméra/scènes au défilement), Anime.js, motion.dev, **Codrops** (démos/effets de référence à adapter), **LottieFiles** (petites animations vectorielles prêtes), **Blender** (modèles, rigs, animations, décors). Préférer les ressources **gratuites** (préférence de l'utilisateur).

## 6. Pièges techniques déjà rencontrés (ne pas les refaire)
- **GLSL refuse les caractères accentués**, même dans un nom de variable ou un commentaire de shader.
- Dans `Trois.manga()` : ajouter des enfants (contours) **pendant** un `traverse()` fait repasser dessus → collecter d'abord les meshes.
- Créatures : un `MeshLambert/Toon` + ACES délave les couleurs ; pour garder une texture fidèle : `toneMapped:false` et surtout émissif.
- Contexte WebGL : ne pas forcer `powerPreference:'high-performance'` ; gérer `webglcontextlost` ; prévoir une image de secours (`assets/3d/pokeball.webp`).
- En `file://`, three r128 lit les images des GLB via `fetch(blob:)` → `trois-outils.js` désactive `createImageBitmap` en file://.
- XAMPP n'existe pas dans devicon → `images/xampp.svg` (simple-icons).
- Titres coupés par `clip-path` : IntersectionObserver ne se déclenche pas → observer le parent.
- Une transition CSS `transform` sur un élément animé par GSAP le bloque (badges restés minuscules) → ne pas mélanger.
- Blender 5.2 : métaboules → bien désélectionner via `view_layer.objects` (des entrées peuvent être `None`) ; familles de métaboules = même préfixe de nom avant le point ; export glTF couleurs de sommets `export_vertex_color='ACTIVE'`.
- `scipy` absent : flou/distance en numpy/Pillow (Pillow `GaussianBlur` refuse les images float `F`).

## 7. Méthode de vérification (navigateur intégré de l'app)
- `preview_start {name:"portfolio-jujutsu"}`, puis `resize_window 1440×900` pour juger la mise en page.
- Quand le panneau navigateur est **masqué**, les images ne sont produites que pendant les captures : **prendre 2 captures** (la 1re est en retard), et lancer `gsap.ticker.lagSmoothing(0)` sinon GSAP « ralentit » les animations.
- Défiler avec `scrollTo({top, behavior:'instant'})` (le `scroll-behavior:smooth` du CSS fausse les tests).
- Changer `?v=N` dans `index.html` après chaque modif CSS/JS (cache) et recharger avec une URL différente (`?r=N`).
- L'**émulation mobile** du navigateur intégré décale les coordonnées des clics (innerWidth 597 pour une mise en page de 375) : tester les clics mobiles avec des événements synthétiques, pas avec des vrais clics.
- La vraie validation se fait dans **Opera GX** chez l'utilisateur : lui demander de regarder (Claude ne peut que voir son écran en lecture seule, et Opera est souvent réduit).

## 8. Manière de travailler avec Jordan
- Il n'aime pas les longues réflexions : **agir vite, montrer tôt, itérer**. Donner de courtes nouvelles pendant les tâches longues.
- Ne pas inventer de texte à sa place (une bulle « Je ne lâche rien » ajoutée par Claude a été retirée).
- Usage limité : commencer par les retouches rapides §4.3, montrer, puis attaquer §4.1 / §4.2 par étapes (un palier + l'escalier d'abord, puis les Backrooms, puis les compagnons riggés).

---

## 9. ÉTAT AU 2026-10-19 (3e session) — FAIT, à montrer à Jordan

- **§4.3 fait** : case Yuji retirée, étiquettes des créatures retirées (`hero3d.js`), SLAM incrusté sans cadre,
  cartes projets en hauteur automatique (plus de texte coupé), style allégé (Syne + DM Sans, cartes arrondies,
  ombres douces, boutons pilules : langage de l'ancien site ; plus de bordures noires ni d'ombres décalées).
- **§4.1 fait (1re version)** : décor three.js plein écran derrière tout le site.
  - `js/escalier.js` : la scène. Escalier de dalles de pierre **flottantes** (fil de lumière dessous : or → rose → cyan),
    paliers = disques dallés sur îlots flottants, **un torii par palier** avec plaque laquée « kanji + nom de la partie »,
    ciel du soir procédural (le soleil se couche pendant la descente, cirrus, étoiles), mer de nuages en couches,
    traversée des nuages, nuit + néons + fragments de Backrooms qui flottent, puis l'escalier perce le plafond
    d'une **salle des Backrooms** (labyrinthe de murs, papier peint, moquette, dalles de plafond, néons qui grésillent,
    brouillard jaune, panneaux d'entreprise « 漆 VEILLE », « 捌 ÉVÉNEMENTS », « CONTACT »).
  - `js/descente.js` : relie le défilement à la caméra. Chaque `[data-palier]` (accueil + 9 parties) = un arrêt ;
    la caméra s'arrête quand **l'espace libre avant la partie** (`--ecart: 64vh`) est au milieu de l'écran → on voit le torii
    et sa plaque, puis le panneau de la partie monte. Qualité adaptative. CSS : `--prof`, `--back`, `.zone-soir/nuit/back`.
  - `js/defilement.js` : vitesse de défilement plafonnée (repris de Clipsco).
  - `assets/decor/textures.js` : textures en base64 (marche aussi en double-clic) — générées par `_outils/decor_textures.py`.
  - Les sections sont des **panneaux blancs** (`.sec`) posés sur le décor ; le hero a un voile sombre à gauche, texte blanc.
  - Sauvegarde de l'état d'avant : `_sauvegarde_avant_escalier/`.
  - Le GIF de Yuji n'est **pas** utilisé (le ciel 3D passe en priorité, comme demandé).
  - Mesuré : ~12 ms/image sur la carte graphique intégrée (Radeon 760M), aucune erreur console.
- **§4.2 PAS ENCORE FAIT** (compagnons en vraie 3D riggée) : attend le choix de Jordan entre
  (a) modélisation Blender gratuite (long, résultat incertain), (b) Higgsfield `generate_3d` (≈1 crédit chacun, il en reste ≈4,5),
  (c) modèles 3D existants (fan-made sous licence libre, ou extraits des jeux : droits d'auteur à garder en tête).
- Pistes d'amélioration du décor : nuages plus « volumineux » (sprites de cumulus), toit des Backrooms plus visible
  depuis le vide, faire suivre les compagnons dans la descente (comme le renard de Clipsco).

## 10. ÉTAT AU 2026-10-19 (fin de la 3e session) — compagnons + décor visible

- **Compagnons modélisés dans Blender** (scripts dans `_outils/compagnons/` : `commun.py` = outils (tour, tubes, peau,
  motifs plaqués, squelette, animations NLA, export), un script par créature, `apercu.html?nom=…` = aperçu 4 angles
  dans three.js, `calque.py` = superposition avec l'illustration officielle).
  - Verdict de Jordan : **seul Lugulabre est réussi** → c'est le seul utilisé (`assets/3d/compagnons/lugulabre.glb`).
    Komasan, Pyrax, Mentali existent (glb + scripts) mais **ne sont pas utilisés** ; ne pas les remettre sans son accord.
- **La Poké Ball de l'accueil est retirée** (à sa demande) : `hero3d.js` n'est plus chargé (fichier gardé).
- **Lugulabre est le compagnon du décor** (`js/escalier.js`, section « Le compagnon ») : dans sa propre scène dessinée
  par-dessus le décor ; il flotte à côté de nous, descend d'île en île (ressort amorti), **regarde la souris**,
  se met près du torii quand l'écran est libre, sinon dans le couloir libre à droite du texte (jamais devant un bloc
  de texte, cf. `zonesTexte` dans `descente.js`), sinon dans le coin. Animations : repos (boucle), content (en arrivant
  sur une île), clic (clic sur lui + Black Flash). Lueur violette qui éclaire les marches dans le noir.
- **Plus de grands panneaux blancs** : le texte est posé directement sur le décor (titres blancs avec halo),
  les cartes sont en **verre sombre translucide** (bloc « DÉCOR VISIBLE » de `css/style.css`). La colonne de texte
  laisse un couloir de chaque côté (on voit les îles, Lugulabre s'y range).
- **Animations de texte** : titres lettre par lettre + trait de pinceau, paragraphes **mot par mot** (flou → net)
  à l'arrivée sur chaque île (`decouperMots` dans `main.js`), cartes distribuées, badges qui tournent, etc.
- `Trois.manga()` : ombrage d'anime à 2 tons fixe (couleurs exactes des illustrations), couleurs par sommet,
  contours des pièces qui se déforment (SkinnedMesh).

## 11. Retours suivants (2026-10-19, soir) — appliqués

- **Plus de Backrooms** : uniquement des **îles célestes** (10 îles, 5,5 m de dénivelé entre deux), du coucher de soleil
  au crépuscule violet étoilé ; la mer de nuages reste toujours sous les îles. Ancienne version gardée dans
  `_sauvegarde_avant_escalier/escalier_avec_backrooms.js`.
- **Aucune fenêtre visible** : même les cartes (À propos, Formation, étapes de stage, certifications, événements,
  formulaire) n'ont plus de fond ni de bord ; le texte a un halo sombre (`--halo`) pour rester lisible.
- **Plus de grands kanji en filigrane** (`.sec-kanji`, `.tl-kanji`, `.hero-kanji` masqués). Les plaques des torii
  gardent leur kanji de numéro (à retirer si Jordan le demande : `plaque()` dans `escalier.js`).
- **Vitesse** : la caméra suit un défilement rapide (VMAX 50 m/s) et Lugulabre se déplace **exactement avec la caméra**
  (il ne traîne plus), puis un ressort le ramène à sa place à l'écran.
- **Lisibilité** : pendant la lecture d'une partie, la caméra lève le regard vers l'horizon (ciel derrière le texte) ;
  à l'arrêt entre deux parties, elle regarde la plaque du torii. Chaque torii s'efface en fondu quand on passe dessous.
- Lancer le site : double-clic sur `Lancer le site.bat` (serveur local + navigateur), ou double-clic sur `index.html`.

## 12. Chaque partie sur son île (2026-10-19, nuit) — FAIT

Demande de Jordan : « que le fond soit en même temps le portfolio ».
- **Caméra « drone »** (`escalier.js`, `poseCamera`) : elle ne marche plus sur les marches ; elle s'arrête à côté de
  chaque île (île à droite de l'écran, texte à gauche) et vole vers la suivante au-dessus de l'escalier (courbe de Bézier).
  Îles plus grandes (rayon 5,2 m). Écran en hauteur : île centrée.
- **Défilement** (`descente.js`) : la caméra reste sur l'île tant qu'on lit la partie (de « haut de la partie à 62 % de
  l'écran » à « bas à 42 % ») et vole pendant l'espace libre (`--ecart: 70vh`).
- **`js/iles.js`** pose le contenu sur chaque île (dans le repère de l'île, tourné vers le point de vue) :
  À propos = photos sur chevalets ; Formation = lettres SLAM (slam.glb) sur un socle ; Outils = cercle de tuiles
  (logos devicon) autour d'un cristal ; Projets = 4 cartes Pokémon dessinées dans des toiles, sur socles ;
  Stages = 2 stèles gravées (la sélectionnée se soulève) ; Certifications = 5 badges extrudés (formes du CSS) sur socles ;
  Veille = Jordan en pixel art sur des dalles d'herbe (suit l'étape du dialogue) ; Événements = galerie de photos ;
  Contact = boîte aux lettres rouge + lettre qui flotte.
  Survol = l'objet se soulève ; clic = fenêtre projet (`ouvrirProjet`), certificat/photo (`ouvrirLightbox`),
  stage (`afficherStage`), dialogue, champ du formulaire. `main.js` expose `PROJETS`, `OUTILS`, `STAGES`.
- **Page** (bloc CSS « CHAQUE PARTIE SUR SON ÎLE », écrans > 900 px) : texte en colonne à gauche (≤ 500 px) ;
  masqués car montrés en 3D : photos d'À propos, SLAM HTML, Pokédex, cartes projets, scène herbe de la veille,
  photos des événements. Les certifications restent aussi en liste (le texte parle du bouton « Voir le certificat »).
  Sur téléphone, tout le HTML reste visible.
- Limite connue : en double-clic sur `index.html` (file://), les photos locales ne peuvent pas aller dans la 3D
  (sécurité du navigateur) → utiliser `Lancer le site.bat`.
- Test : `__escalier.debug.sauter()` après un `scrollTo` met la caméra directement sur l'île (le panneau navigateur
  masqué n'avance les images que pendant les captures).

## 13. Fenêtres dans le décor (2026-10-20) — FAIT, remplace la « colonne de texte à gauche » du §12

Demande de Jordan : pas de contenu au premier plan d'emblée ; des **fenêtres posées dans le décor** qui, au clic,
s'agrandissent au premier plan, et reviennent à leur place quand on clique ailleurs.
- `js/fenetres.js` : chaque partie (sauf l'accueil) est déplacée dans une couche HTML 3D (`.couche3d > .camera3d`,
  même calcul que le CSS3DRenderer de three.js) ; sa fenêtre `.fenetre-3d` (760 × 860 px, échelle 5 mm/px) flotte à
  gauche de son île, tournée vers le point de vue, et n'apparaît qu'autour de son île (fondu).
  Clic (ou Entrée) → la partie passe dans `.premier-plan` (animation depuis sa place, voile flouté derrière, croix,
  défilement interne) ; clic sur le voile, croix ou Échap → elle rapetisse vers sa place et y retourne.
- ⚠ La couche 3D doit avoir **exactement la même boîte que la toile** (100vw, barre de défilement comprise) :
  sinon les centres de perspective diffèrent et les fenêtres glissent de côté.
- `descente.js` : en mode fenêtres (`html.mode-fenetres`, écran > 900 px), un `#parcours` donne la longueur de
  défilement (75 % d'écran de vol + 60 % d'arrêt par île) ; `positionIle(id)` sert aux liens du menu ;
  événements `ile-change` (menu actif) et `ile-arrivee` (animations de la fenêtre, `entreeFenetre` dans main.js).
- Sur téléphone (≤ 900 px) : pas de fenêtres 3D, les parties restent dans la page (mode du §12).

