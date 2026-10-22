/* ══════════════════════════════════════════════════════════════
   ESCALIER — le décor 3D derrière tout le portfolio (three.js r128, global THREE)
   Des îles célestes reliées par un escalier de pierres flottantes, au-dessus d'une mer de nuages.
   Chaque partie du site a son île, avec un torii et une plaque à son nom. En descendant, le soleil
   se couche doucement : on finit au crépuscule, sous les premières étoiles, les torii éclairés.
   Lugulabre (modélisé dans Blender) nous accompagne d'île en île et regarde la souris.
   Architecture reprise de Clipsco (escalier.js / plongee.js), validée par Jordan.
   Décor photo-réaliste (2026-10-19) : roche, herbe, dalles et ciels Poly Haven (CC0), voir js/decor-reel.js.
══════════════════════════════════════════════════════════════ */
window.Escalier = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;

  /* ── Dimensions (mètres) ── */
  const LARGEUR = 2.2, MARCHE_H = 0.2, MARCHE_P = 0.33, OEIL = 1.65, RAYON = 5.2;
  const NUAGES_HAUT = -66, NUAGES_BAS = -80;   // la mer de nuages reste toujours sous les îles
  const FOND = -49.5;                           // hauteur de la dernière île
  // Hauteur et cap (direction de la volée qui part) de chaque île
  const PLAN = [
    { y: 0, cap: 0 },
    { y: -5.5, cap: 0.5 },
    { y: -11, cap: -0.35 },
    { y: -16.5, cap: 0.42 },
    { y: -22, cap: -0.38 },
    { y: -27.5, cap: 0.3 },
    { y: -33, cap: -0.32 },
    { y: -38.5, cap: 0.36 },
    { y: -44, cap: -0.25 },
    { y: FOND, cap: 0 }
  ];
  // La caméra vole d'île en île en douceur : deux ressorts amortis en chaîne (DOUCEUR = temps de réponse de
  // chacun, en s) — elle démarre et s'arrête sans à-coup, et les crans de la molette se fondent en un seul
  // mouvement. Vitesse plafonnée à VMAX îles par seconde ; au-delà de SAUT îles d'écart (lien du menu), elle saute.
  const VMAX = 1.6, DOUCEUR = 0.32, SAUT = 2.5;

  /** Ressort amorti critique (x suit cible, vitesse v), stable quel que soit dt ; vmax : vitesse maximale. */
  function amortir(etat, cible, temps, dt, vmax) {
    const w = 2 / temps, k = w * dt;
    const e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
    let d = etat.x - cible;
    if (vmax) { const m = vmax * temps; d = Math.max(-m, Math.min(m, d)); }
    const c = etat.x - d;
    const tmp = (etat.v + w * d) * dt;
    etat.v = (etat.v - w * tmp) * e;
    etat.x = c + (d + tmp) * e;
  }

  /* ── Petits outils ── */
  const lerp = (a, b, k) => a + (b - a) * k;
  const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lisse = (a, b, x) => { const t = borne((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function hasard(graine) { let s = graine; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
  const dir = (h) => new THREE.Vector3(-Math.sin(h), 0, -Math.cos(h));

  /* ── Plaque d'un palier : kanji + nom, peints sur un panneau ── */
  function plaque(kanji, nom, style) {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 512;
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    const dessiner = () => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 1024, 512);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (style === 'bureau') {
        // Panneau d'entreprise des Backrooms : plaque blanche, lettres noires
        g.fillStyle = '#efeadb';
        g.fillRect(40, 70, 944, 372);
        g.strokeStyle = '#2b2a26';
        g.lineWidth = 10;
        g.strokeRect(58, 88, 908, 336);
        g.fillStyle = '#c4161c';
        g.font = '150px "Yuji Boku", serif';
        g.fillText(kanji || '', 230, 256);
        g.fillStyle = '#1d1c19';
        g.font = '800 104px Syne, sans-serif';
        g.fillText(nom.toUpperCase(), 610, 260, 640);
      } else {
        // Plaque de torii : laque noire, kanji et nom dorés
        const d = g.createLinearGradient(0, 0, 0, 512);
        d.addColorStop(0, '#1b1414');
        d.addColorStop(1, '#0c0909');
        g.fillStyle = d;
        g.fillRect(24, 24, 976, 464);
        g.strokeStyle = '#d9b25c';
        g.lineWidth = 12;
        g.strokeRect(46, 46, 932, 420);
        g.shadowColor = 'rgba(255, 190, 90, .55)';
        g.shadowBlur = 24;
        g.fillStyle = '#f2cf7a';
        g.font = '170px "Yuji Boku", serif';
        g.fillText(kanji || '', 512, 190);
        g.font = '800 92px Syne, sans-serif';
        g.fillStyle = '#fff3dc';
        g.fillText(nom.toUpperCase(), 512, 380, 880);
      }
      tex.needsUpdate = true;
    };
    dessiner();
    if (document.fonts) Promise.all([document.fonts.load('150px "Yuji Boku"'), document.fonts.load('800 92px Syne')]).then(dessiner, () => {});
    return tex;
  }

  /**
   * Crée la scène dans `canvas`. `plaques` : [{ nom, kanji }] pour chaque palier (le premier est l'accueil).
   * Renvoie null sans WebGL.
   */
  function creer(canvas, { plaques = [], telephone = false, zonesTexte = () => [] } = {}) {
    let renderer;
    for (const o of [{ antialias: !telephone }, { antialias: false }]) {
      try { renderer = new THREE.WebGLRenderer(Object.assign({ canvas, alpha: false }, o)); if (renderer.getContext()) break; } catch (e) { renderer = null; }
    }
    if (!renderer) return null;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = false;
    renderer.shadowMap.enabled = !telephone;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Téléphone : Lugulabre a sa propre couche, AU-DESSUS du contenu de la page (sinon le texte et les cartes
    // défilent par-dessus lui) et en pleine définition de l'écran (plus de pixels qu'au décor : il reste net)
    let rendComp = null;
    if (telephone) {
      try {
        const cv = document.createElement('canvas');
        cv.className = 'compagnon-dessus';
        cv.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cv);
        rendComp = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
        rendComp.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        rendComp.outputEncoding = renderer.outputEncoding;
        rendComp.toneMapping = renderer.toneMapping;
        rendComp.setClearColor(0x000000, 0);
      } catch (e) { rendComp = null; }
    }
    // téléphone : un peu plus de pixels (écrans très denses) ; la qualité baisse toute seule si c'est trop lourd
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telephone ? 1.5 : 1));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
    const al = hasard(1977);
    const U = { uT: { value: 0 } };
    const nb = Math.min(PLAN.length, Math.max(2, plaques.length || PLAN.length));
    const plan = PLAN.slice(0, nb);

    /* ── Le tracé : paliers ronds reliés par des volées de marches ── */
    const paliers = [], volees = [];
    const r = () => RAYON;
    paliers.push({ c: new THREE.Vector3(0, 0, 0) });
    for (let i = 0; i < nb - 1; i++) {
      const h = plan[i].cap, d = dir(h);
      const chute = plan[i].y - plan[i + 1].y;
      const n = Math.round(chute / MARCHE_H);
      const horiz = n * MARCHE_P;
      const debut = paliers[i].c.clone().addScaledVector(d, r(i));
      const fin = debut.clone().addScaledVector(d, horiz);
      fin.y = plan[i + 1].y;
      volees.push({ i, h, d, n, debut, fin, chute });
      paliers.push({ c: fin.clone().addScaledVector(d, r(i + 1)) });
    }
    paliers.forEach((p, i) => { p.c.y = plan[i].y; p.cap = plan[i].cap; });

    // Point de vue de chaque île : en face, un peu en retrait et en hauteur ; l'île (et sa fenêtre) est au centre
    // de l'écran. L'accueil, lui, est vu depuis le haut de l'escalier, vers le couchant.
    const HAUT = new THREE.Vector3(0, 1, 0);
    const vues = paliers.map((p, i) => {
      const dEntree = dir(i === 0 ? plan[0].cap : plan[i - 1].cap);
      const gauche = new THREE.Vector3(dEntree.z, 0, -dEntree.x);
      let pos, cible;
      if (i === 0) {
        // l'accueil : en retrait derrière la première île, un peu au-dessus ; on voit l'île flotter,
        // l'escalier plonger vers les autres îles et la mer de nuages
        pos = p.c.clone().addScaledVector(dEntree, -17).addScaledVector(gauche, 6).addScaledVector(HAUT, 4.5);
        cible = p.c.clone().addScaledVector(dEntree, 16).addScaledVector(gauche, 3).addScaledVector(HAUT, -8);
      } else {
        pos = p.c.clone().addScaledVector(dEntree, -8.8).addScaledVector(HAUT, 3.6);
        cible = p.c.clone().addScaledVector(HAUT, 2.6);
      }
      // écran en hauteur (téléphone) : l'île est centrée, vue d'un peu plus loin
      const posEtroit = i === 0 ? pos : p.c.clone().addScaledVector(dEntree, -12).addScaledVector(HAUT, 5.5);
      const cibleEtroit = i === 0 ? cible : p.c.clone().addScaledVector(HAUT, 1.6);
      // le contenu de l'île regarde ce point de vue
      const lacet = Math.atan2(pos.x - p.c.x, pos.z - p.c.z);
      return { pos, cible, gauche, lacet, posEtroit, cibleEtroit };
    });
    // Entre deux îles, la caméra passe au-dessus de l'escalier (courbe de Bézier par le milieu de la volée)
    const controles = volees.map((v, i) => {
      const g = new THREE.Vector3(v.d.z, 0, -v.d.x);
      return v.debut.clone().lerp(v.fin, 0.5).addScaledVector(HAUT, i === 0 ? 4 : 6.5).addScaledVector(g, 3.5);
    });
    const bez = (a, b, c, k, out) => out.copy(a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(b, 2 * k * (1 - k)).addScaledVector(c, k * k);
    let etroit = false;
    function poseCamera(u, pos, cible) {
      const i = Math.max(0, Math.min(nb - 2, Math.floor(u))), x = borne(u - i);
      const k = x * x * x * (x * (x * 6 - 15) + 10);
      const a = vues[i], b = vues[i + 1];
      bez(etroit ? a.posEtroit : a.pos, controles[i], etroit ? b.posEtroit : b.pos, k, pos);
      cible.copy(etroit ? a.cibleEtroit : a.cible).lerp(etroit ? b.cibleEtroit : b.cible, lisse(0.12, 0.88, x));
    }

    /* ── Matières réalistes : textures Poly Haven 2K (js/decor-reel.js) ── */
    const DR = window.DecorReel;
    DR.init(renderer);
    const mats = {
      falaise: DR.materiau('falaise'),
      mousse: DR.materiau('mousse'),
      herbe: DR.materiau('herbe', { color: new THREE.Color(DR.fichier ? '#3f4a26' : '#7f9a5a') }),   // sol teinté vert sous l'herbe
      dalles: DR.materiau('dalles', { color: new THREE.Color(DR.fichier ? '#8d8d88' : '#b8b0a4') }),
      uT: U.uT
    };
    for (const m of Object.values(mats)) if (m.isMaterial) m.envMapIntensity = 0.75;

    /* ── Les marches : dalles de pierre taillée qui flottent ── */
    const geoMarche = DR.geometrieDalle(LARGEUR, 0.22, MARCHE_P - 0.03);
    const marches = [];
    for (const v of volees) {
      for (let k = 0; k < v.n; k++) {
        const p = v.debut.clone().addScaledVector(v.d, (k + 0.5) * MARCHE_P);
        p.y = plan[v.i].y - (k + 1) * MARCHE_H - 0.11;
        marches.push({ p, h: v.h, ph: al() * 6.28 });
      }
    }
    const imMarches = new THREE.InstancedMesh(geoMarche, mats.dalles, marches.length);
    imMarches.castShadow = imMarches.receiveShadow = true;
    imMarches.frustumCulled = false;
    scene.add(imMarches);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
    function placerMarches(t, camPos) {
      for (let i = 0; i < marches.length; i++) {
        const m = marches[i];
        // Les marches éloignées flottent doucement ; sous les pieds, elles restent stables
        const loin = 0.7 + 0.3 * lisse(4, 14, m.p.distanceTo(camPos));
        const dy = Math.sin(t * 1.1 + m.ph) * 0.06 * loin;
        e.set(Math.sin(t * 0.7 + m.ph) * 0.025 * loin, m.h, Math.cos(t * 0.8 + m.ph) * 0.035 * loin);
        q.setFromEuler(e);
        p3.set(m.p.x, m.p.y + dy, m.p.z);
        m4.compose(p3, q, s3.set(1, 1, 1));
        imMarches.setMatrixAt(i, m4);
      }
      imMarches.instanceMatrix.needsUpdate = true;
    }

    /* ── Les îles : falaises de roche en strates sous une esplanade de dalles et une couronne d'herbe ── */
    const angle = (v) => Math.atan2(v.z, v.x);
    const ilots = [];
    paliers.forEach((p, i) => {
      // pas de débord d'herbe là où l'escalier arrive et repart
      const sorties = [];
      if (i > 0) sorties.push(angle(volees[i - 1].d.clone().negate()));
      if (i < volees.length) sorties.push(angle(volees[i].d));
      const ile = DR.creerIle({ rayon: RAYON, large: 2.4, profondeur: 12 + al() * 6, graine: i + 1, sorties, esplanade: true, herbe: true, densiteHerbe: telephone ? 9 : 22 }, mats);
      ile.position.copy(p.c);
      scene.add(ile);
      ilots.push({ g: ile });
    });
    // De petites îles sauvages, plus loin dans le ciel, pour la profondeur
    const petites = [];
    for (let n = 0; n < (telephone ? 8 : 16); n++) {
      const v = volees[Math.floor(al() * volees.length)];
      const base = v.debut.clone().lerp(v.fin, al());
      const cote = al() < 0.5 ? -1 : 1;
      base.add(new THREE.Vector3(-v.d.z, 0, v.d.x).multiplyScalar(cote * (18 + al() * 45)));
      base.addScaledVector(v.d, (al() - 0.3) * 40).add(new THREE.Vector3(0, -3 - al() * 18, 0));
      const r = 1.4 + al() * 3;
      const ile = DR.creerIle({ rayon: r, large: r * 0.6, profondeur: r * (2.4 + al() * 1.6), graine: 100 + n, segments: 56, anneaux: 20 }, mats);
      ile.position.copy(base);
      ile.rotation.y = al() * 6.28;
      ile.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      scene.add(ile);
      petites.push({ g: ile, y0: base.y, ph: al() * 6.28 });
    }

    /* ── Torii : bois laqué vermillon, linteau noir, avec la plaque de la partie ── */
    const matTorii = new THREE.MeshStandardMaterial({ color: new THREE.Color('#a8261a'), roughness: 0.42, metalness: 0, emissive: new THREE.Color('#ff3a1a'), emissiveIntensity: 0, envMapIntensity: 0.8 });
    const matNoir = new THREE.MeshStandardMaterial({ color: new THREE.Color('#100d0d'), roughness: 0.3, envMapIntensity: 0.9 });
    const geoPilier = new THREE.CylinderGeometry(0.15, 0.18, 4.2, 24);
    const geoKasagi = new THREE.BoxGeometry(5.4, 0.24, 0.42, 24, 1, 1);
    {
      // Le linteau du haut se relève aux deux bouts
      const pos = geoKasagi.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setY(i, pos.getY(i) + Math.pow(Math.abs(x) / 2.7, 2.4) * 0.32); }
      geoKasagi.computeVertexNormals();
    }
    const geoShimaki = new THREE.BoxGeometry(4.6, 0.2, 0.34);
    const geoNuki = new THREE.BoxGeometry(4.2, 0.17, 0.2);
    const toriis = [];
    paliers.forEach((p, i) => {
      if (i === 0) return;
      const g = new THREE.Group();
      const sortie = dir(p.cap);
      g.position.copy(p.c).addScaledVector(sortie, RAYON - 0.5);
      g.rotation.y = p.cap;
      // matières propres à chaque torii : il s'efface quand on passe dessous
      const mRouge = matTorii.clone(), mNoir = matNoir.clone();
      for (const m of [mRouge, mNoir]) m.transparent = true;
      for (const cote of [-1, 1]) {
        const pil = new THREE.Mesh(geoPilier, mRouge);
        pil.position.set(cote * 1.75, 2.1, 0);
        pil.rotation.z = -cote * 0.035;
        g.add(pil);
        const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.4, 24), mNoir);
        pied.position.set(cote * 1.76, 0.2, 0);
        g.add(pied);
      }
      const kasagi = new THREE.Mesh(geoKasagi, mNoir);
      kasagi.position.y = 4.42;
      const shimaki = new THREE.Mesh(geoShimaki, mRouge);
      shimaki.position.y = 4.2;
      const nuki = new THREE.Mesh(geoNuki, mRouge);
      nuki.position.y = 3.45;
      g.add(kasagi, shimaki, nuki);
      // La plaque pend sous le linteau, entre les piliers
      const pl = plaques[i] || {};
      const panneau = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({ map: plaque(pl.kanji, pl.nom || '', 'torii'), transparent: true, toneMapped: false }));
      panneau.position.set(0, 2.78, 0.12);
      g.add(panneau);
      for (const cote of [-1, 1]) {
        const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 4), mNoir);
        fil.position.set(cote * 0.7, 3.32, 0.1);
        g.add(fil);
      }
      g.traverse((o) => { if (o.isMesh && o !== panneau) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      toriis.push({ g, panneau, y: p.c.y, i, mats: [mRouge, mNoir], centre: g.position.clone().add(new THREE.Vector3(0, 2.2, 0)) });
    });

    /* ── Rochers qui flottent autour de l'escalier, dans le ciel (trois formes de roche) ── */
    const rochers = [1, 2, 3].map((k) => {
      const im = new THREE.InstancedMesh(DR.geometrieRocher(k), mats.falaise, telephone ? 14 : 28);
      im.frustumCulled = false;
      im.receiveShadow = true;
      scene.add(im);
      return im;
    });
    const cailloux = [];
    rochers.forEach((im) => {
      for (let n = 0; n < im.count; n++) {
        const v = volees[Math.floor(al() * volees.length)];
        const base = v.debut.clone().lerp(v.fin, al());
        const cote = al() < 0.5 ? -1 : 1;
        const lat = new THREE.Vector3(-v.d.z, 0, v.d.x).multiplyScalar(cote * (7 + al() * 26));
        cailloux.push({ im, n, p: base.add(lat).add(new THREE.Vector3(0, -2 - al() * 14, 0)), s: 0.25 + al() * al() * 2.4, ph: al() * 6, v: 0.05 + al() * 0.15 });
      }
    });

    /* ── Le ciel : deux vrais ciels photographiés (coucher de soleil -> crépuscule), en fondu ── */
    const CI = window.CIELS || {};
    // direction du soleil dans la scène (à droite, devant la descente) ; chaque photo est tournée pour que son soleil y soit
    const SOLEIL_AZ = new THREE.Vector3(0.866, 0, -0.5);
    const azCible = angle(SOLEIL_AZ);
    const azDe = (c) => (c && c.soleil ? Math.atan2(c.soleil[2], c.soleil[0]) : azCible);
    let cielsCharges = 0;
    const quandCharge = () => { if (++cielsCharges === 2) capturerEnv(); };
    const uCommun = {
      uT: U.uT,
      uCoucher: { value: DR.texCiel('coucher', quandCharge) },
      uCrepuscule: { value: DR.texCiel('crepuscule', quandCharge) },
      uDecal: { value: new THREE.Vector2(azDe(CI.coucher) - azCible, azDe(CI.crepuscule) - azCible) },
      uMelange: { value: 0 }
    };
    const cielR = DR.creerCiel(uCommun);
    const ciel = cielR.mesh;
    scene.add(ciel);
    const uCiel = { uSoleil: { value: new THREE.Vector3(0, 0.1, -1) }, uNuit: cielR.uniforms.uNuit };

    // Éclairage d'ambiance et reflets : le ciel lui-même (PMREM), une version par ciel
    const pmrem = new THREE.PMREMGenerator(renderer);
    const uEnv = Object.assign({}, uCommun, { uMelange: { value: 0 } });
    const cielEnv = DR.creerCiel(uEnv, true);
    cielEnv.uniforms.uLineaire.value = 1;
    const sceneEnv = new THREE.Scene();
    sceneEnv.add(cielEnv.mesh);
    let envs = null;
    function capturerEnv() {
      envs = [0, 1].map((m) => { uEnv.uMelange.value = m; return pmrem.fromScene(sceneEnv, 0, 0.1, 3000).texture; });
      scene.environment = envs[0];
    }

    /* ── Mer de nuages : un relief de nuages éclairé par le soleil, qui se fond dans le ciel au loin ── */
    const nuages = DR.creerNuages(uCommun, { y: NUAGES_HAUT - 10, amplitude: 16, grille: telephone ? 160 : 300 });
    scene.add(nuages.mesh);

    /* ── Poussières dorées dans la lumière (lucioles au crépuscule) autour de la caméra ── */
    const nbPoussieres = telephone ? 200 : 450;
    const gP = new THREE.BufferGeometry();
    const aP = new Float32Array(nbPoussieres * 3), rP = new Float32Array(nbPoussieres);
    for (let i = 0; i < nbPoussieres; i++) { aP[i * 3] = al(); aP[i * 3 + 1] = al(); aP[i * 3 + 2] = al(); rP[i] = al(); }
    gP.setAttribute('position', new THREE.BufferAttribute(aP, 3));
    gP.setAttribute('aRand', new THREE.BufferAttribute(rP, 1));
    const echelle = { value: 500 };
    const poussieres = new THREE.Points(gP, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uT: U.uT, uCam: { value: new THREE.Vector3() }, uBoite: { value: new THREE.Vector3(26, 14, 26) }, uEchelle: echelle, uCouleur: { value: new THREE.Color('#ffd58a') }, uForce: { value: 1 }, uBr: { value: 0 } },
      vertexShader: `
        uniform float uT, uEchelle, uBr; uniform vec3 uCam, uBoite; attribute float aRand; varying float vA;
        void main() {
          vec3 p = position * uBoite;
          p.y += uT * (.08 + aRand * .12) * (1. - uBr * .8);
          p.x += sin(uT * .4 + aRand * 30.) * .6;
          vec3 w = uCam + mod(p - uCam + uBoite * .5, uBoite) - uBoite * .5;
          vec4 mv = viewMatrix * vec4(w, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(14., (.018 + aRand * .035) * uEchelle / -mv.z);
          vA = (.35 + .65 * sin(uT * (1. + aRand * 2.) + aRand * 40.) * .5 + .3) * smoothstep(.5, 2.5, -mv.z) * exp(-length(mv.xyz) * .08);
        }`,
      fragmentShader: 'uniform vec3 uCouleur; uniform float uForce; varying float vA; void main() { float d = length(gl_PointCoord - .5); gl_FragColor = vec4(uCouleur * exp(-d * d * 22.) * vA * uForce, 1.); }'
    }));
    poussieres.frustumCulled = false;
    scene.add(poussieres);

    /* ── Lumières : soleil couchant (avec ombres), ambiance du ciel, lanterne la nuit ── */
    const hemi = new THREE.HemisphereLight(new THREE.Color(0.55, 0.5, 0.68), new THREE.Color(0.5, 0.34, 0.3), 0.5);
    scene.add(hemi);
    const soleil = new THREE.DirectionalLight(new THREE.Color(1, 0.6, 0.3), 3);
    soleil.castShadow = !telephone;
    soleil.shadow.mapSize.set(2048, 2048);
    Object.assign(soleil.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 160 });
    soleil.shadow.bias = -0.0004;
    soleil.shadow.normalBias = 0.03;
    scene.add(soleil);
    scene.add(soleil.target);
    const lanterne = new THREE.PointLight(new THREE.Color('#ff8a4a'), 0, 10, 1.8);
    scene.add(lanterne);
    // brume (couleur de l'horizon des photos, en couleurs d'affichage : three l'applique après le rendu des tons)
    const brumeCoucher = new THREE.Color().fromArray(CI.coucher ? CI.coucher.horizon : [0.6, 0.45, 0.42]);
    const brumeCrepuscule = new THREE.Color().fromArray(CI.crepuscule ? CI.crepuscule.horizon : [0.4, 0.32, 0.42]);
    scene.fog = new THREE.FogExp2(brumeCoucher.clone(), 0.0042);
    const solCoucher = new THREE.Color().fromArray(CI.coucher ? CI.coucher.couleur : [1, 0.56, 0.2]);
    const solCrepuscule = new THREE.Color().fromArray(CI.crepuscule ? CI.crepuscule.couleur : [1, 0.54, 0.51]);
    const dirSoleil = new THREE.Vector3();

    /* ── Le compagnon : Lugulabre flotte à côté de nous, descend d'île en île et regarde la souris ──
       Il a sa propre scène, dessinée par-dessus le décor (il ne rentre jamais dans une marche ou un torii).
       Il choisit une place libre à l'écran (jamais devant le texte), et la rejoint en flottant. */
    const sceneComp = new THREE.Scene();
    const comp = {
      ob: null, mixer: null, actions: {}, courant: null, pos: new THREE.Vector3(), vit: new THREE.Vector3(),
      place: null, prochainChoix: 0, palier: -1, pret: false, regard: new THREE.Object3D(), clic: 0,
      camAvant: new THREE.Vector3(), avecCamera: false,
      modele: null, nousRegarde: 0, tour: 0,  // après un clic : un tour sur lui-même, puis il nous regarde
      milieu: null, echelle: 1                // île de la veille : il vient au milieu de l'île, en plus grand, pour parler
    };
    // Places : à l'accueil, à côté du torii quand l'espace est libre, sinon dans le couloir à droite du texte,
    // et en dernier recours dans le coin en bas à droite (coordonnées d'écran -1..1, distance en mètres)
    const ACCUEIL = { x: 0.6, y: 0.0, p: 3.3 };
    const ACCUEIL_TEL = { x: 0.12, y: 0.42, p: 4.6 };   // écran en hauteur : au-dessus du texte
    const PRES_DU_TORII = { x: 0.8, y: 0.6, p: 6.6 };   // dans le ciel, en haut à droite de l'île
    const COIN = { x: 0.9, y: -0.74, p: 8.5 };
    const HAUT_TEL = { x: 0.56, y: 0.56, p: 5.0 };      // téléphone : en haut à droite, sous la barre (bien visible)
    const tanDemi = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const lumComp = new THREE.PointLight(new THREE.Color('#9c8cff'), 0, 7, 1.8);
    scene.add(lumComp);
    const vEcran = new THREE.Vector3(), vRegard = new THREE.Vector3();

    function pointEcran(nx, ny, prof, out) {
      const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * prof;
      return out.set(nx * h * camera.aspect, ny * h, -prof).applyMatrix4(camera.matrixWorld);
    }

    function rectPlace(pl) {
      const [W, H] = dims;
      const r = (0.72 / (pl.p * tanDemi())) * H / 2;
      const cx = (pl.x + 1) / 2 * W, cy = (1 - pl.y) / 2 * H;
      return { g: cx - r * 0.95, d: cx + r * 0.95, h: cy - r * 1.45, b: cy + r * 0.9 };
    }

    function libre(pl, zones) {
      if (!dims) return true;
      const [W, H] = dims;
      const q = rectPlace(pl);
      if (q.g < 70 || q.d > W + 4 || q.h < -4 || q.b > H + 4) return false;
      for (const z of zones) if (q.d > z.left - 8 && q.g < z.right + 8 && q.b > z.top - 8 && q.h < z.bottom + 8) return false;
      return true;
    }

    /** Places dans le couloir libre à droite du texte (s'il est assez large). */
    function couloir(zones) {
      if (!dims || !zones.length) return [];
      const [W, H] = dims;
      const bord = Math.max(...zones.map((z) => z.right));
      const large = W - bord - 16;
      if (large < 110) return [];
      const x = Math.max(0.84, ((bord + W) / 2 / W) * 2 - 1);   // tout à droite : l'île est au centre
      // distance telle que Lugulabre tienne dans la largeur du couloir
      const p = Math.max(5.2, (0.72 * 0.95 * H) / (2 * (large / 2 - 6) * tanDemi()));
      return [{ x, y: 0.45, p: Math.max(p, 6.5) }, { x, y: -0.55, p: Math.max(p, 6.5) }];
    }

    function jouerComp(nom, unique) {
      const a = comp.actions[nom];
      if (!a || (comp.courant === a && !unique)) return;
      if (comp.courant && comp.courant !== a) comp.courant.fadeOut(0.25);
      a.reset().setEffectiveWeight(1).fadeIn(0.25).play();
      a.setLoop(unique ? THREE.LoopOnce : THREE.LoopRepeat);
      a.clampWhenFinished = !!unique;
      comp.courant = a;
    }

    function majCompagnon(t, dt, accueil) {
      if (!comp.pret) return;
      // Place : l'accueil a la sienne ; sinon près du torii si l'écran est libre, puis le couloir, puis le coin
      if (t >= comp.prochainChoix || !comp.place) {
        comp.prochainChoix = t + 0.25;
        const zones = zonesTexte();
        if (accueil) comp.place = camera.aspect < 0.8 ? ACCUEIL_TEL : ACCUEIL;
        else if (camera.aspect < 0.8) comp.place = HAUT_TEL;
        else if (libre(PRES_DU_TORII, zones)) comp.place = PRES_DU_TORII;
        else if (!comp.place || comp.place === ACCUEIL || comp.place === ACCUEIL_TEL || comp.place === PRES_DU_TORII || comp.place === COIN || !libre(comp.place, zones)) {
          comp.place = couloir(zones).find((pl) => libre(pl, zones)) || COIN;
        }
      }
      const pl = comp.place;
      if (comp.milieu) vEcran.copy(comp.milieu);
      else pointEcran(pl.x, pl.y, pl.p, vEcran);
      if (comp.vit.lengthSq() === 0 && comp.pos.lengthSq() === 0) comp.pos.copy(vEcran);
      // Il voyage avec nous : il se déplace exactement comme la caméra, quelle que soit la vitesse du défilement
      if (comp.avecCamera) comp.pos.add(tmp.subVectors(camera.position, comp.camAvant));
      comp.camAvant.copy(camera.position);
      comp.avecCamera = true;
      // puis un ressort amorti le ramène à sa place à l'écran (plus raide quand il en est loin)
      const loin = comp.pos.distanceTo(vEcran);
      if (loin > 30) { comp.pos.copy(vEcran); comp.vit.set(0, 0, 0); }
      const k = 18 + 60 * Math.min(1, loin / 3), amort = 2 * Math.sqrt(k) * 0.9;
      comp.vit.addScaledVector(tmp.subVectors(vEcran, comp.pos), k * dt).multiplyScalar(Math.max(0, 1 - amort * dt));
      comp.pos.addScaledVector(comp.vit, dt);
      comp.ob.position.copy(comp.pos);
      comp.echelle += ((comp.milieu ? 2.1 : 1) - comp.echelle) * (1 - Math.exp(-dt * 3));
      comp.ob.scale.setScalar(comp.echelle);
      comp.ob.position.y += Math.sin(t * 1.7) * 0.06;
      // Il regarde la souris (un point à 7 m sous le pointeur), en douceur ;
      // après un clic, il se tourne vers nous (la caméra) et nous regarde quelques secondes
      if (comp.nousRegarde > 0 || comp.milieu) vRegard.copy(camera.position);
      else pointEcran(souris[0], souris[1], 7, vRegard);
      comp.regard.position.copy(comp.ob.position);
      comp.regard.lookAt(vRegard);
      comp.ob.quaternion.slerp(comp.regard.quaternion, 1 - Math.exp(-dt * (comp.nousRegarde > 0 ? 9 : 4)));
      comp.nousRegarde = Math.max(0, comp.nousRegarde - dt);
      // le tour complet sur lui-même (le modèle tourne dans son groupe, de 360° à 0°, en ralentissant)
      if (comp.tour > 0) {
        comp.tour = Math.max(0, comp.tour - dt / 0.9);
        const p = 1 - comp.tour;
        comp.modele.rotation.y = Math.PI * 2 * Math.pow(1 - p, 3);
      }
      // En arrivant sur une île, il est content
      let proche = -1;
      if (Math.abs(uCam - Math.round(uCam)) < 0.02) proche = Math.round(uCam);
      if (proche >= 0 && proche !== comp.palier) {
        comp.palier = proche;
        if (comp.actions.content && t > 1.5) jouerComp('content', true);
      }
      comp.mixer.update(dt);
      // Sa lueur violette éclaire les marches dans le noir
      lumComp.position.copy(comp.ob.position);
      lumComp.intensity = lerp(0.15, 1.4, lisse(-15, -45, camera.position.y)) * (comp.clic > 0 ? 2 : 1);
      comp.clic = Math.max(0, comp.clic - dt);
    }

    /* ── Mise à jour à chaque image ── */
    const pos3 = new THREE.Vector3(), vise = new THREE.Vector3(), viseLisse = new THREE.Vector3(), tmp = new THREE.Vector3();
    const fondCouleur = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
    const relais = { x: 0, v: 0 }, cam = { x: 0, v: 0 };
    let uCam = 0, premiere = true, souris = [0, 0], sourisLisse = [0, 0], dims = null;
    const aChaqueImage = [];

    return {
      nbPaliers: nb,
      debug: { camera, scene, renderer, paliers, comp, vues, sauter() { premiere = true; } },
      /** Pour js/iles.js : la scène, la caméra et chaque île (centre du dessus, orientation vers le point de vue). */
      scene, camera, renderer,
      iles: paliers.map((p, i) => ({ centre: p.c.clone(), lacet: vues[i].lacet, rayon: RAYON, vue: vues[i].pos.clone() })),
      aChaqueImage(fn) { aChaqueImage.push(fn); },
      position() { return uCam; },
      qualite(ratio) { renderer.setPixelRatio(ratio); if (dims) this.taille(dims[0], dims[1]); },
      souris(x, y) { souris = [x, y]; },
      /** Ajoute Lugulabre (glTF chargé par descente.js). */
      ajouterCompagnon(gltf) {
        const m = gltf.scene;
        if (window.Trois) Trois.manga(m, { ep: 0.024, sansContour: (n) => /flamme/.test(n) });
        m.traverse((o) => { if (o.material) o.material.fog = false; if (o.isMesh) o.frustumCulled = false; });
        m.scale.setScalar(0.26);
        const g = new THREE.Group();
        g.add(m);
        sceneComp.add(g);
        comp.ob = g;
        comp.modele = m;
        comp.mixer = new THREE.AnimationMixer(m);
        gltf.animations.forEach((c) => { comp.actions[c.name.replace(/^lugulabre_/, '')] = comp.mixer.clipAction(c); });
        comp.mixer.addEventListener('finished', () => jouerComp('repos'));
        jouerComp('repos');
        comp.pret = true;
      },
      /** Le pointeur est-il sur Lugulabre ? (coordonnées écran) */
      surCompagnon(cx, cy) {
        if (!comp.pret || !dims) return false;
        const r = new THREE.Raycaster();
        r.setFromCamera(new THREE.Vector2((cx / dims[0]) * 2 - 1, -(cy / dims[1]) * 2 + 1), camera);
        return r.intersectObject(comp.ob, true).some((h) => !h.object.userData.contour);
      },
      /** Clic sur Lugulabre : il réagit. */
      /** Île de la veille : Lugulabre vient au milieu de l'île i (null : il reprend sa place). */
      compagnonAuMilieu(i) {
        if (i == null || !paliers[i]) { comp.milieu = null; return; }
        const c = paliers[i].c, versNous = vues[i].pos.clone().sub(c);
        versNous.y = 0;
        versNous.normalize();
        // au-dessus de la boîte de dialogue (écran vertical : encore plus haut, la boîte y prend plus de place)
        comp.milieu = c.clone().addScaledVector(versNous, 2.2).add(new THREE.Vector3(0, camera.aspect < 0.8 ? 5.3 : 3.85, 0));
      },
      /** Au revoir : il est content et sautille. */
      saluerCompagnon() { if (comp.pret) { jouerComp('content', true); comp.tour = 1; } },
      /** Portrait de Lugulabre (image PNG, fond transparent), pour la boîte de dialogue. */
      portraitCompagnon(taille = 256) {
        if (!comp.pret) return null;
        let r = null;
        const ob = comp.ob, avant = { p: ob.position.clone(), q: ob.quaternion.clone(), s: ob.scale.x };
        try {
          r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
          r.setSize(taille, taille);
          r.outputEncoding = renderer.outputEncoding;
          ob.position.set(0, 0, 0);
          ob.quaternion.identity();
          ob.scale.setScalar(1);
          ob.updateMatrixWorld(true);
          const boite = new THREE.Box3().setFromObject(ob), centre = boite.getCenter(new THREE.Vector3()), dim = boite.getSize(new THREE.Vector3());
          const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
          const recul = (Math.max(dim.x, dim.y) * 0.62) / Math.tan(THREE.MathUtils.degToRad(14));
          cam.position.set(centre.x + recul * 0.12, centre.y + dim.y * 0.08, centre.z + recul);
          cam.lookAt(centre);
          r.setClearColor(0x000000, 0);
          r.render(sceneComp, cam);
          return r.domElement.toDataURL('image/png');
        } catch (e) {
          console.warn('[décor] portrait de Lugulabre impossible', e);
          return null;
        } finally {
          ob.position.copy(avant.p);
          ob.quaternion.copy(avant.q);
          ob.scale.setScalar(avant.s);
          if (r) { r.dispose(); r.forceContextLoss(); }
        }
      },
      toucherCompagnon() {
        if (!comp.pret) return;
        jouerComp('clic', true);
        comp.clic = 0.8;
        comp.tour = 1;
        comp.nousRegarde = 3.5;
      },
      taille(w, h) {
        renderer.setSize(w, h, false);
        if (rendComp) rendComp.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w / h < 0.8 ? 70 : 55;
        etroit = w / h < 0.9;
        camera.updateProjectionMatrix();
        echelle.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        dims = [w, h];
      },
      /**
       * u : palier visé, en fraction (0 = accueil) ; t : temps (s) ; dt : écart.
       * Renvoie { prof (0 à 1), soir, nuit } pour le CSS.
       */
      image(u, t, dt) {
        // La caméra rejoint l'île visée (u, en îles) : deux ressorts en chaîne (relais puis caméra)
        if (premiere) { relais.x = cam.x = u; relais.v = cam.v = 0; }
        else {
          const ecart = u - cam.x;
          if (Math.abs(ecart) > SAUT) {
            cam.x = relais.x = u - Math.sign(ecart) * 0.6;
            cam.v = relais.v = Math.sign(ecart) * VMAX * 0.5;
          }
          amortir(relais, u, DOUCEUR, dt);
          amortir(cam, relais.x, DOUCEUR, dt, VMAX);
          if (Math.abs(u - cam.x) < 0.0005 && Math.abs(cam.v) < 0.01 && Math.abs(relais.v) < 0.01) { cam.x = relais.x = u; cam.v = relais.v = 0; }
        }
        uCam = cam.x;
        poseCamera(uCam, pos3, vise);
        viseLisse.copy(premiere ? vise : viseLisse.lerp(vise, 1 - Math.exp(-dt * 6)));
        // La souris fait légèrement tourner la tête (le décor suit le regard)
        sourisLisse[0] += (souris[0] - sourisLisse[0]) * Math.min(1, dt * 3);
        sourisLisse[1] += (souris[1] - sourisLisse[1]) * Math.min(1, dt * 3);
        pos3.y += Math.sin(t * 0.8) * 0.03;
        camera.position.copy(pos3);
        camera.lookAt(viseLisse);
        camera.rotateY(-sourisLisse[0] * 0.07);
        camera.rotateX(sourisLisse[1] * 0.045);
        premiere = false;

        const y = camera.position.y;
        const prof = borne(-y / (-FOND + OEIL));
        // Du coucher de soleil (en haut) au crépuscule (sur la dernière île) : les deux photos du ciel en fondu
        const melange = lisse(-6, -42, y);
        const nuit = lisse(-24, -48, y) * 0.9;     // étoiles et lanternes
        const soir = 1 - melange;

        U.uT.value = t;
        uCommun.uMelange.value = melange;
        uCiel.uNuit.value = nuit;
        ciel.position.copy(camera.position);
        if (envs) scene.environment = envs[melange > 0.5 ? 1 : 0];

        // Le soleil descend sous l'horizon pendant la descente (sa lumière faiblit et rosit)
        const elev = THREE.MathUtils.degToRad(lerp(8, -2, lisse(0, -44, y)));
        dirSoleil.set(SOLEIL_AZ.x * Math.cos(elev), Math.sin(Math.max(elev, 0.035)), SOLEIL_AZ.z * Math.cos(elev)).normalize();
        uCiel.uSoleil.value.copy(dirSoleil);
        soleil.color.copy(solCoucher).lerp(solCrepuscule, melange);
        soleil.intensity = lerp(3.2, 0.35, melange);
        // ombres nettes autour de ce que regarde la caméra
        soleil.target.position.copy(viseLisse);
        soleil.position.copy(viseLisse).addScaledVector(dirSoleil, 70);
        hemi.color.setRGB(0.55, 0.5, 0.68).lerp(cA.setRGB(0.32, 0.3, 0.55), melange);
        hemi.groundColor.setRGB(0.55, 0.36, 0.3).lerp(cA.setRGB(0.25, 0.18, 0.28), melange);
        hemi.intensity = lerp(0.55, 0.4, melange);

        // Brume : la couleur de l'horizon de chaque photo
        fondCouleur.copy(brumeCoucher).lerp(brumeCrepuscule, melange);
        scene.fog.color.copy(fondCouleur);
        renderer.setClearColor(fondCouleur);

        // Mer de nuages : suit la caméra, éclairée par le même soleil
        nuages.suivre(camera.position);
        const un = nuages.uniforms;
        un.uSoleilDir.value.copy(dirSoleil);
        un.uSoleilCol.value.copy(soleil.color).multiplyScalar(lerp(1.9, 0.4, melange));
        un.uAmbiant.value.setRGB(0.3, 0.27, 0.4).lerp(cA.setRGB(0.22, 0.2, 0.34), melange);
        un.uOmbre.value.setRGB(0.1, 0.075, 0.14).lerp(cA.setRGB(0.06, 0.05, 0.11), melange);

        // Les torii s'éclairent quand la lumière baisse ; la lanterne du torii le plus proche éclaire les marches
        const lueurTorii = lerp(0, 0.6, lisse(0.3, 0.9, nuit));
        let proche = null, dmin = Infinity;
        for (const to of toriis) { const d = to.g.position.distanceTo(camera.position); if (d < dmin) { dmin = d; proche = to; } }
        if (proche) {
          lanterne.position.copy(proche.g.position).add(tmp.set(0, 3, 0));
          lanterne.intensity = lerp(0, 2.2, nuit);
        }
        // Chaque torii s'efface en fondu quand on passe dessous (il ne vient jamais remplir l'écran derrière le texte)
        for (const to of toriis) {
          const d = to.centre.distanceTo(camera.position);
          const a = lisse(3, 7.5, d);
          to.g.visible = a > 0.01;
          to.mats[0].emissiveIntensity = lueurTorii;
          for (const m of to.mats) { m.opacity = a; m.depthWrite = a > 0.98; }
          to.panneau.material.opacity = lisse(70, 18, d) * a;
        }

        placerMarches(reduitMouvement ? 0 : t, camera.position);
        for (const o of petites) o.g.position.y = o.y0 + Math.sin(t * 0.25 + o.ph) * 0.35;
        for (const c of cailloux) {
          e.set(t * c.v * 0.3 + c.ph, t * c.v + c.ph, 0);
          q.setFromEuler(e);
          p3.copy(c.p);
          p3.y += Math.sin(t * c.v * 2 + c.ph) * 0.4;
          c.im.setMatrixAt(c.n, m4.compose(p3, q, s3.setScalar(c.s)));
        }
        for (const im of rochers) im.instanceMatrix.needsUpdate = true;

        // Particules : poussières dorées dans la lumière du soir, lucioles au crépuscule
        const up = poussieres.material.uniforms;
        up.uCam.value.copy(camera.position);
        up.uCouleur.value.set('#ffd28a').lerp(cA.set('#ffe9a8'), nuit);
        up.uForce.value = lerp(0.45, 1.1, nuit);

        for (const fn of aChaqueImage) fn(t, dt, camera, uCam);
        renderer.render(scene, camera);
        if (comp.pret) {
          camera.updateMatrixWorld();
          majCompagnon(t, dt, uCam < 0.12 && u < 0.35);
          if (rendComp) rendComp.render(sceneComp, camera);
          else {
            renderer.autoClear = false;
            renderer.clearDepth();
            renderer.render(sceneComp, camera);
            renderer.autoClear = true;
          }
        }
        return { prof, soir, nuit, back: 0 };
      }
    };
  }

  const reduitMouvement = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { creer };
})();
