/* ══════════════════════════════════════════════════════════════
   ESCALIER — le décor 3D derrière tout le portfolio (three.js r128, global THREE)
   Des îles célestes reliées par un escalier de pierres flottantes, au-dessus d'une mer de nuages.
   Chaque partie du site a son île, avec un torii et une plaque à son nom. En descendant, le soleil
   se couche doucement : on finit au crépuscule, sous les premières étoiles, les torii éclairés.
   Lugulabre (modélisé dans Blender) nous accompagne d'île en île et regarde la souris.
   Architecture reprise de Clipsco (escalier.js / plongee.js), validée par Jordan.
   Textures : assets/decor/textures.js (_outils/decor_textures.py ; pierre = Poly Haven, CC0).
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
  // La caméra vole d'île en île sans jamais s'emballer : vitesse et accélération plafonnées (en îles par seconde),
  // assez hautes pour suivre un défilement rapide ; au-delà de SAUT îles d'écart (lien du menu), elle saute.
  const VMAX = 1.6, ACCEL = 4.5, SAUT = 2.5;

  /* ── Petits outils ── */
  const lerp = (a, b, k) => a + (b - a) * k;
  const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lisse = (a, b, x) => { const t = borne((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function hasard(graine) { let s = graine; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
  const dir = (h) => new THREE.Vector3(-Math.sin(h), 0, -Math.cos(h));

  // Bruit et fbm communs aux shaders (ASCII seulement : GLSL refuse les accents)
  const GLSL_BRUIT = `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vbruit(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float s = 0., a = .5;
      for (int i = 0; i < 4; i++) { s += a * vbruit(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
      return s;
    }`;

  function texture(nom, rx, ry, srgb) {
    const src = window.DECOR_TEX && window.DECOR_TEX[nom];
    if (!src) return null;
    const t = new THREE.TextureLoader().load(src);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }

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
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
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
        pos = p.c.clone().addScaledVector(dir(plan[0].cap), -RAYON * 0.55).addScaledVector(HAUT, OEIL);
        cible = pos.clone().addScaledVector(dir(plan[0].cap), 30).add(new THREE.Vector3(0, -2.6, 0));
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

    /* ── Matières ── */
    const matPierre = new THREE.MeshStandardMaterial({
      map: texture('pierre-couleur', 1.2, 0.35, true), normalMap: texture('pierre-relief', 1.2, 0.35, false),
      color: new THREE.Color('#f1e4d2').multiplyScalar(1.9), roughness: 0.8, metalness: 0
    });
    const matDalles = new THREE.MeshStandardMaterial({
      map: texture('dalles-couleur', 3.4, 3.4, true), normalMap: texture('dalles-relief', 3.4, 3.4, false),
      color: new THREE.Color('#fff3e4').multiplyScalar(1.15), roughness: 0.75, metalness: 0
    });
    const matRoc = new THREE.MeshStandardMaterial({
      map: texture('pierre-couleur', 2, 2, true), normalMap: texture('pierre-relief', 2, 2, false),
      color: new THREE.Color('#b9a99a'), roughness: 0.92, flatShading: true
    });

    /* ── Les marches : dalles de pierre qui flottent, avec un fil de lumière dessous ── */
    const geoMarche = new THREE.BoxGeometry(LARGEUR, 0.16, MARCHE_P - 0.035);
    const geoFil = new THREE.BoxGeometry(LARGEUR * 0.92, 0.025, 0.035);
    const marches = [];
    for (const v of volees) {
      for (let k = 0; k < v.n; k++) {
        const p = v.debut.clone().addScaledVector(v.d, (k + 0.5) * MARCHE_P);
        p.y = plan[v.i].y - (k + 1) * MARCHE_H - 0.08;
        marches.push({ p, h: v.h, ph: al() * 6.28 });
      }
    }
    const imMarches = new THREE.InstancedMesh(geoMarche, matPierre, marches.length);
    const imFils = new THREE.InstancedMesh(geoFil, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), marches.length);
    const cFil = new THREE.Color();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
    marches.forEach((m, i) => {
      // Couleur du fil selon l'altitude : or au coucher, rose puis lavande au crépuscule
      const y = m.p.y;
      cFil.set('#ffcf7a').lerp(new THREE.Color('#ff7ab8'), lisse(-12, -30, y)).lerp(new THREE.Color('#b9a8ff'), lisse(-32, -48, y));
      imFils.setColorAt(i, cFil);
    });
    imFils.instanceColor.needsUpdate = true;
    imMarches.frustumCulled = imFils.frustumCulled = false;
    scene.add(imMarches, imFils);
    function placerMarches(t, camPos) {
      for (let i = 0; i < marches.length; i++) {
        const m = marches[i];
        // Les marches éloignées flottent doucement ; sous les pieds, elles restent stables
        const loin = 0.7 + 0.3 * lisse(4, 14, m.p.distanceTo(camPos));
        const dy = Math.sin(t * 1.1 + m.ph) * 0.07 * loin;
        e.set(Math.sin(t * 0.7 + m.ph) * 0.03 * loin, m.h, Math.cos(t * 0.8 + m.ph) * 0.04 * loin);
        q.setFromEuler(e);
        p3.set(m.p.x, m.p.y + dy, m.p.z);
        s3.set(1, 1, 1);
        m4.compose(p3, q, s3);
        imMarches.setMatrixAt(i, m4);
        p3.set(m.p.x, m.p.y + dy - 0.085, m.p.z).addScaledVector(dir(m.h), -(MARCHE_P * 0.5 - 0.03));
        m4.compose(p3, q, s3);
        imFils.setMatrixAt(i, m4);
      }
      imMarches.instanceMatrix.needsUpdate = true;
      imFils.instanceMatrix.needsUpdate = true;
    }

    /* ── Paliers du ciel : disques de pierre posés sur des îlots flottants ── */
    const geoDisque = new THREE.CylinderGeometry(RAYON, RAYON * 0.94, 0.45, 48, 1);
    const geoIlot = new THREE.ConeGeometry(RAYON * 0.95, 7.5, 18, 7);
    geoIlot.rotateX(Math.PI);
    geoIlot.translate(0, -4.0, 0);
    {
      const pos = geoIlot.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const f = 1 + (Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y) * 0.18) + (al() - 0.5) * 0.12;
        pos.setXYZ(i, x * f, y + (al() - 0.5) * 0.25 * (y < -0.5 ? 1 : 0), z * f);
      }
      geoIlot.computeVertexNormals();
    }
    const ilots = [];
    paliers.forEach((p) => {
      const g = new THREE.Group();
      g.position.copy(p.c);
      const disque = new THREE.Mesh(geoDisque, [matPierre, matDalles, matPierre]);
      disque.position.y = -0.225;
      g.add(disque);
      const ilot = new THREE.Mesh(geoIlot, matRoc);
      ilot.scale.set(1, 0.8 + al() * 0.5, 1);
      ilot.rotation.y = al() * 6;
      g.add(ilot);
      scene.add(g);
      ilots.push({ g, ph: al() * 6 });
    });

    /* ── Torii : un par palier du ciel, avec la plaque de la partie ── */
    const matTorii = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c8331f'), roughness: 0.55, emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 0 });
    const matNoir = new THREE.MeshStandardMaterial({ color: new THREE.Color('#151213'), roughness: 0.6 });
    const geoPilier = new THREE.CylinderGeometry(0.15, 0.18, 4.2, 16);
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
        const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.4, 16), mNoir);
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
      scene.add(g);
      toriis.push({ g, panneau, y: p.c.y, i, mats: [mRouge, mNoir], centre: g.position.clone().add(new THREE.Vector3(0, 2.2, 0)) });
    });

    /* ── Rochers qui flottent autour de l'escalier, dans le ciel ── */
    const geoCaillou = new THREE.IcosahedronGeometry(1, 1);
    {
      const pos = geoCaillou.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const f = 0.8 + 0.4 * Math.abs(Math.sin(x * 3.1 + y * 2.3 + z * 1.7));
        pos.setXYZ(i, x * f, y * f * 0.75, z * f);
      }
      geoCaillou.computeVertexNormals();
    }
    const cailloux = [];
    const nbCailloux = telephone ? 40 : 80;
    const imCailloux = new THREE.InstancedMesh(geoCaillou, matRoc, nbCailloux);
    imCailloux.frustumCulled = false;
    for (let i = 0; i < nbCailloux; i++) {
      const v = volees[Math.floor(al() * volees.length)];
      const k = al();
      const base = v.debut.clone().lerp(v.fin, k);
      const cote = al() < 0.5 ? -1 : 1;
      const lat = new THREE.Vector3(-v.d.z, 0, v.d.x).multiplyScalar(cote * (7 + al() * 24));
      cailloux.push({ p: base.add(lat).add(new THREE.Vector3(0, -2 - al() * 12, 0)), s: 0.25 + al() * al() * 2.2, ph: al() * 6, v: 0.1 + al() * 0.3 });
    }
    scene.add(imCailloux);

    /* ── Le ciel : dégradé du soir, soleil couchant, cirrus, premières étoiles, puis la nuit ── */
    const uCiel = {
      uT: U.uT, uNuit: { value: 0 }, uSoleil: { value: new THREE.Vector3(0, 0.08, -1).normalize() },
      uSouris: { value: new THREE.Vector2() }
    };
    const ciel = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uCiel,
      vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `
        uniform float uT, uNuit; uniform vec3 uSoleil; varying vec3 vD;
        ${GLSL_BRUIT}
        float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vD);
          float y = d.y;
          float s = max(dot(d, uSoleil), 0.);
          float cote = max(dot(normalize(vec3(d.x, 0., d.z)), normalize(vec3(uSoleil.x, 0., uSoleil.z))), 0.);
          // Soir : indigo au zenith, rose puis orange vers l horizon (plus chaud du cote du soleil)
          vec3 zenith = vec3(.11, .11, .32), milieu = vec3(.62, .27, .48), horizon = vec3(1., .52, .26);
          vec3 c = mix(horizon, milieu, smoothstep(.0, .22, y));
          c = mix(c, zenith, smoothstep(.15, .75, y));
          c = mix(c, vec3(.55, .3, .45), (1. - cote) * .45 * (1. - smoothstep(.0, .5, y)));
          c += vec3(1., .55, .28) * pow(s, 6.) * .22 + vec3(1., .72, .45) * pow(s, 60.) * .5 + vec3(1., .9, .7) * pow(s, 900.) * .9;
          c += vec3(1., .93, .8) * smoothstep(.99955, .9998, s) * 1.6;
          // Sous l horizon : la brume au-dessus de la mer de nuages
          c = mix(c, mix(horizon, milieu, .55) * .9, smoothstep(.0, -.12, y));
          // Cirrus etires, eclaires par le couchant
          if (y > .02) {
            vec2 p = d.xz / (y + .12) * 1.6;
            float n = fbm(vec2(p.x * .55, p.y * 2.2) + vec2(uT * .006, 0.));
            float nuage = smoothstep(.5, .85, n) * smoothstep(.02, .2, y);
            vec3 cn = mix(vec3(1., .55, .45), vec3(1., .8, .55), pow(cote, 3.)) * (1. - uNuit * .85);
            c = mix(c, cn, nuage * .55 * (1. - uNuit * .6));
          }
          // Nuit : bleu profond
          vec3 nuit = mix(vec3(.05, .06, .16), vec3(.01, .012, .04), smoothstep(.0, .6, y));
          c = mix(c, nuit, uNuit);
          // Etoiles : quelques-unes au soir, toutes la nuit
          vec3 e = floor(d * 300.);
          float et = step(.997, h31(e)) * smoothstep(.04, .35, y) * (.5 + .5 * sin(uT * 2. + h31(e + 1.) * 40.));
          c += vec3(.9, .92, 1.) * et * (.25 + .9 * uNuit) * smoothstep(.2, .7, y + uNuit * .5);
          gl_FragColor = vec4(c, 1.);
        }`
    }));
    ciel.frustumCulled = false;
    scene.add(ciel);

    /* ── Mer de nuages : couches de bruit empilées (vue du dessus au soir, traversée, puis vue du dessous) ── */
    const couches = [];
    const nbCouches = telephone ? 4 : 6;
    for (let i = 0; i < nbCouches; i++) {
      const k = i / (nbCouches - 1);
      const y = lerp(NUAGES_HAUT, NUAGES_BAS, k);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        uniforms: {
          uT: U.uT, uK: { value: k }, uCam: { value: new THREE.Vector3() }, uNuit: uCiel.uNuit,
          uLumiere: { value: new THREE.Color('#ffb2a6') }, uOmbre: { value: new THREE.Color('#8a6496') }, uBrume: { value: new THREE.Color() }, uSoleil: uCiel.uSoleil
        },
        vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `
          uniform float uT, uK, uNuit; uniform vec3 uCam, uLumiere, uOmbre, uBrume, uSoleil; varying vec3 vW;
          ${GLSL_BRUIT}
          void main() {
            vec2 p = vW.xz * .011 + vec2(uT * .006, uT * .002) + uK * .37;
            float n = fbm(p + .7 * vec2(fbm(p * .6 + 4.1), fbm(p * .6 - 2.3)));
            // Les couches du milieu sont les plus denses : un vrai volume ; la plus basse ferme la mer
            float seuil = mix(.5, .38, smoothstep(.0, 1., uK));
            float a = smoothstep(seuil, seuil + .14, n);
            a = max(a, smoothstep(.75, 1., uK) * (.55 + .4 * n));
            float dist = length(vW - uCam);
            a *= smoothstep(1., 7., abs(vW.y - uCam.y) + dist * .04);
            vec2 vers = normalize(vW.xz - uCam.xz + vec2(.0001));
            float face = pow(max(dot(vers, normalize(uSoleil.xz)), 0.), 3.);
            vec3 lum = mix(uLumiere, vec3(1., .82, .52), face);
            float dessus = 1. - uK;
            float relief = smoothstep(.36, .7, n + (fbm(p * 4.3 + uT * .003) - .5) * .4);
            vec3 c = mix(uOmbre * .8, lum, relief * (.4 + .6 * dessus));
            c = mix(c, vec3(.12, .11, .2), uNuit);
            c = mix(c, uBrume, smoothstep(160., 520., dist));
            gl_FragColor = vec4(c, a * .78);
          }`
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100, 1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = y;
      m.renderOrder = 2 + (nbCouches - i);
      m.frustumCulled = false;
      scene.add(m);
      couches.push(m);
    }

    /* ── Poussières et lucioles autour de la caméra ── */
    const nbPoussieres = telephone ? 300 : 700;
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
          gl_PointSize = min(18., (.025 + aRand * .05) * uEchelle / -mv.z);
          vA = (.35 + .65 * sin(uT * (1. + aRand * 2.) + aRand * 40.) * .5 + .3) * smoothstep(.5, 2.5, -mv.z) * exp(-length(mv.xyz) * .08);
        }`,
      fragmentShader: 'uniform vec3 uCouleur; uniform float uForce; varying float vA; void main() { float d = length(gl_PointCoord - .5); gl_FragColor = vec4(uCouleur * exp(-d * d * 22.) * vA * uForce, 1.); }'
    }));
    poussieres.frustumCulled = false;
    scene.add(poussieres);

    /* ── Lumières ── */
    const hemi = new THREE.HemisphereLight(new THREE.Color('#ffd9c0'), new THREE.Color('#5b3a6a'), 0.9);
    scene.add(hemi);
    const soleil = new THREE.DirectionalLight(new THREE.Color('#ffb070'), 1.6);
    scene.add(soleil);
    scene.add(soleil.target);
    const lanterne = new THREE.PointLight(new THREE.Color('#ff6a3a'), 0, 9, 1.8);
    scene.add(lanterne);
    scene.fog = new THREE.FogExp2(new THREE.Color('#e7957a'), 0.006);

    /* ── Le compagnon : Lugulabre flotte à côté de nous, descend d'île en île et regarde la souris ──
       Il a sa propre scène, dessinée par-dessus le décor (il ne rentre jamais dans une marche ou un torii).
       Il choisit une place libre à l'écran (jamais devant le texte), et la rejoint en flottant. */
    const sceneComp = new THREE.Scene();
    const comp = {
      ob: null, mixer: null, actions: {}, courant: null, pos: new THREE.Vector3(), vit: new THREE.Vector3(),
      place: null, prochainChoix: 0, palier: -1, pret: false, regard: new THREE.Object3D(), clic: 0,
      camAvant: new THREE.Vector3(), avecCamera: false
    };
    // Places : à l'accueil, à côté du torii quand l'espace est libre, sinon dans le couloir à droite du texte,
    // et en dernier recours dans le coin en bas à droite (coordonnées d'écran -1..1, distance en mètres)
    const ACCUEIL = { x: 0.6, y: 0.0, p: 3.3 };
    const ACCUEIL_TEL = { x: 0.12, y: 0.42, p: 4.6 };   // écran en hauteur : au-dessus du texte
    const PRES_DU_TORII = { x: 0.8, y: 0.6, p: 6.6 };   // dans le ciel, en haut à droite de l'île
    const COIN = { x: 0.9, y: -0.74, p: 8.5 };
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
        else if (libre(PRES_DU_TORII, zones)) comp.place = PRES_DU_TORII;
        else if (!comp.place || comp.place === ACCUEIL || comp.place === ACCUEIL_TEL || comp.place === PRES_DU_TORII || comp.place === COIN || !libre(comp.place, zones)) {
          comp.place = couloir(zones).find((pl) => libre(pl, zones)) || COIN;
        }
      }
      const pl = comp.place;
      pointEcran(pl.x, pl.y, pl.p, vEcran);
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
      comp.ob.position.y += Math.sin(t * 1.7) * 0.06;
      // Il regarde la souris (un point à 7 m sous le pointeur), en douceur
      pointEcran(souris[0], souris[1], 7, vRegard);
      comp.regard.position.copy(comp.ob.position);
      comp.regard.lookAt(vRegard);
      comp.ob.quaternion.slerp(comp.regard.quaternion, 1 - Math.exp(-dt * 4));
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
    let uCam = 0, vCam = 0, premiere = true, souris = [0, 0], sourisLisse = [0, 0], dims = null;
    const aChaqueImage = [];
    const AMB = {
      soir: { brume: new THREE.Color('#e9967a'), dens: 0.0045 },
      crepuscule: { brume: new THREE.Color('#5a3a78'), dens: 0.005 }
    };

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
      toucherCompagnon() {
        if (!comp.pret) return;
        jouerComp('clic', true);
        comp.clic = 0.8;
      },
      taille(w, h) {
        renderer.setSize(w, h, false);
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
        // La caméra rejoint l'île visée (u, en îles) sans dépasser VMAX ni ACCEL
        if (premiere) uCam = u;
        else {
          const ecart = u - uCam;
          if (Math.abs(ecart) > SAUT) { uCam = u - Math.sign(ecart) * 0.6; vCam = Math.sign(ecart) * VMAX * 0.5; }
          const voulue = Math.max(-VMAX, Math.min(VMAX, ecart * 3.2));
          vCam += Math.max(-ACCEL * dt, Math.min(ACCEL * dt, voulue - vCam));
          uCam += vCam * dt;
          if (Math.abs(u - uCam) < 0.0005 && Math.abs(vCam) < 0.01) { uCam = u; vCam = 0; }
        }
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
        // Du coucher de soleil (en haut) au crépuscule étoilé (sur la dernière île)
        const nuit = lisse(-6, -46, y) * 0.72;
        const soir = 1 - nuit;

        U.uT.value = t;
        // Le soleil se couche pendant la descente
        const haut = lerp(0.075, -0.07, lisse(0, -40, y));
        uCiel.uSoleil.value.set(0.12, haut, -1).normalize();
        uCiel.uNuit.value = nuit;
        ciel.position.copy(camera.position);

        // Brume : chaude au coucher, violette au crépuscule
        fondCouleur.copy(AMB.soir.brume).lerp(AMB.crepuscule.brume, nuit);
        const dens = lerp(AMB.soir.dens, AMB.crepuscule.dens, nuit);
        scene.fog.color.copy(fondCouleur);
        scene.fog.density = dens;
        renderer.setClearColor(fondCouleur);
        for (const c of couches) {
          c.material.uniforms.uCam.value.copy(camera.position);
          c.material.uniforms.uBrume.value.copy(fondCouleur);
          c.position.x = Math.round(camera.position.x / 50) * 50;
          c.position.z = Math.round(camera.position.z / 50) * 50;
        }

        // Lumière : soleil chaud -> clair de lune lavande
        soleil.position.copy(camera.position).addScaledVector(uCiel.uSoleil.value, 60);
        soleil.target.position.copy(camera.position);
        soleil.intensity = lerp(1.7, 0.3, nuit);
        soleil.color.set('#ffa868').lerp(cA.set('#a9b4ff'), nuit);
        hemi.color.set('#ffd2b8').lerp(cA.set('#5a5aa8'), nuit);
        hemi.groundColor.set('#6b3d6e').lerp(cA.set('#1c1638'), nuit);
        hemi.intensity = lerp(0.95, 0.5, nuit);

        // Fils de lumière des marches et torii qui s'allument quand la lumière baisse
        imFils.material.color.setScalar(lerp(0.35, 1.7, nuit));
        const lueurTorii = lerp(0, 0.75, lisse(0.35, 0.9, nuit));
        // Lanterne : le torii le plus proche éclaire les marches la nuit
        let proche = null, dmin = Infinity;
        for (const to of toriis) { const d = to.g.position.distanceTo(camera.position); if (d < dmin) { dmin = d; proche = to; } }
        if (proche) {
          lanterne.position.copy(proche.g.position).add(tmp.set(0, 3, 0));
          lanterne.intensity = lerp(0.2, 1.9, nuit);
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
        ilots.forEach((o) => { o.g.children[1].position.y = Math.sin(t * 0.5 + o.ph) * 0.08; });
        cailloux.forEach((c, n) => {
          e.set(t * c.v * 0.3 + c.ph, t * c.v + c.ph, 0);
          q.setFromEuler(e);
          p3.copy(c.p);
          p3.y += Math.sin(t * c.v + c.ph) * 0.6;
          imCailloux.setMatrixAt(n, m4.compose(p3, q, s3.setScalar(c.s)));
        });
        imCailloux.instanceMatrix.needsUpdate = true;

        // Particules : lucioles dorées au coucher, poussière d'étoiles lavande au crépuscule
        const up = poussieres.material.uniforms;
        up.uCam.value.copy(camera.position);
        up.uCouleur.value.set('#ffd28a').lerp(cA.set('#c9c2ff'), nuit);
        up.uForce.value = lerp(0.9, 1.1, nuit);

        for (const fn of aChaqueImage) fn(t, dt, camera, uCam);
        renderer.render(scene, camera);
        if (comp.pret) {
          camera.updateMatrixWorld();
          majCompagnon(t, dt, uCam < 0.12 && u < 0.35);
          renderer.autoClear = false;
          renderer.clearDepth();
          renderer.render(sceneComp, camera);
          renderer.autoClear = true;
        }
        return { prof, soir, nuit, back: 0 };
      }
    };
  }

  const reduitMouvement = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { creer };
})();
