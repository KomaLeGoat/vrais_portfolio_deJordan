/* ══════════════════════════════════════════════════════════════
   ESCALIER — le décor 3D derrière tout le portfolio (three.js r128, global THREE)
   On part en haut d'un escalier de pierres flottantes, sous un ciel de coucher de soleil,
   au-dessus d'une mer de nuages. Chaque partie du site a son palier, avec un torii et une
   plaque à son nom. En descendant, le soleil se couche, on traverse les nuages, la nuit tombe,
   les marches s'allument de néons… et l'escalier finit par percer le plafond d'une salle des
   Backrooms (papier peint jaune, moquette humide, néons qui grésillent).
   Architecture reprise de Clipsco (escalier.js / plongee.js), validée par Jordan.
   Textures : assets/decor/textures.js (_outils/decor_textures.py ; pierre = Poly Haven, CC0).
══════════════════════════════════════════════════════════════ */
window.Escalier = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;

  /* ── Dimensions (mètres) ── */
  const LARGEUR = 2.2, MARCHE_H = 0.2, MARCHE_P = 0.33, OEIL = 1.65, RAYON = 3;
  const SOL_BR = -100, HAUT_BR = 3, PLAFOND_BR = SOL_BR + HAUT_BR;   // Backrooms
  const NUAGES_HAUT = -48, NUAGES_BAS = -62;
  // Hauteur et cap (direction de la volée qui part) de chaque palier ; br = dans les Backrooms
  const PLAN = [
    { y: 0, cap: 0 },
    { y: -9, cap: 0.5 },
    { y: -19, cap: -0.35 },
    { y: -30, cap: 0.42 },
    { y: -42, cap: -0.38 },
    { y: -70, cap: 0.3 },
    { y: -84, cap: 0 },
    { y: SOL_BR, cap: Math.PI / 2, br: true },
    { y: SOL_BR, cap: 0, br: true },
    { y: SOL_BR, cap: 0, br: true }
  ];
  const VMAX = 26, ACCEL = 46, SAUT = 90;

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
    const r = (i) => (plan[i].br ? 2.5 : RAYON);
    paliers.push({ c: new THREE.Vector3(0, 0, 0) });
    for (let i = 0; i < nb - 1; i++) {
      const h = plan[i].cap, d = dir(h);
      const plat = plan[i].br && plan[i + 1].br;
      const chute = plan[i].y - plan[i + 1].y;
      const n = plat ? 0 : Math.round(chute / MARCHE_H);
      const horiz = plat ? 12 : n * MARCHE_P;
      const debut = paliers[i].c.clone().addScaledVector(d, r(i));
      const fin = debut.clone().addScaledVector(d, horiz);
      fin.y = plan[i + 1].y;
      volees.push({ i, h, d, n, debut, fin, chute });
      paliers.push({ c: fin.clone().addScaledVector(d, r(i + 1)) });
    }
    paliers.forEach((p, i) => { p.c.y = plan[i].y; p.cap = plan[i].cap; p.br = !!plan[i].br; });

    // Polyligne de marche (à hauteur des yeux) et longueurs cumulées
    const chemin = [];
    const pousser = (v) => chemin.push(v.clone().add(new THREE.Vector3(0, OEIL, 0)));
    pousser(paliers[0].c.clone().addScaledVector(dir(plan[0].cap), -r(0)));
    for (let i = 0; i < nb; i++) {
      pousser(paliers[i].c);
      if (i < nb - 1) { pousser(volees[i].debut); pousser(volees[i].fin); }
    }
    pousser(paliers[nb - 1].c.clone().addScaledVector(dir(plan[nb - 1].cap), 6));
    const longueurs = [0];
    for (let i = 1; i < chemin.length; i++) longueurs.push(longueurs[i - 1] + chemin[i].distanceTo(chemin[i - 1]));
    const total = longueurs[longueurs.length - 1];
    function surChemin(dist, out) {
      dist = borne(dist, 0, total);
      let i = 1;
      while (i < longueurs.length - 1 && longueurs[i] < dist) i++;
      const k = (dist - longueurs[i - 1]) / Math.max(1e-6, longueurs[i] - longueurs[i - 1]);
      return out.copy(chemin[i - 1]).lerp(chemin[i], k);
    }
    // Distance du centre de chaque palier le long du chemin ; on s'arrête un peu avant
    const dCentre = paliers.map((_, i) => longueurs[1 + i * 3]);
    const arrets = dCentre.map((dc, i) => (i === 0 ? dc - 1.2 : dc - (paliers[i].br ? 1.2 : 6.5)));

    /* ── Matières ── */
    const matPierre = new THREE.MeshStandardMaterial({
      map: texture('pierre-couleur', 1.2, 0.35, true), normalMap: texture('pierre-relief', 1.2, 0.35, false),
      color: new THREE.Color('#f1e4d2').multiplyScalar(1.9), roughness: 0.8, metalness: 0
    });
    const matDalles = new THREE.MeshStandardMaterial({
      map: texture('dalles-couleur', 2, 2, true), normalMap: texture('dalles-relief', 2, 2, false),
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
      // Couleur du fil selon l'altitude : or au coucher, rose dans les nuages, cyan néon dans le vide
      const y = m.p.y;
      if (y > -36) cFil.set('#ffcf7a');
      else if (y > -60) cFil.set('#ffcf7a').lerp(new THREE.Color('#ff5fb0'), lisse(-36, -56, y));
      else cFil.set('#ff5fb0').lerp(new THREE.Color('#3ff4ff'), lisse(-60, -74, y));
      imFils.setColorAt(i, cFil);
    });
    imFils.instanceColor.needsUpdate = true;
    imMarches.frustumCulled = imFils.frustumCulled = false;
    scene.add(imMarches, imFils);
    function placerMarches(t, camPos) {
      for (let i = 0; i < marches.length; i++) {
        const m = marches[i];
        // Les marches éloignées flottent doucement ; sous les pieds, elles restent stables
        const loin = lisse(4, 14, Math.abs(m.p.y - camPos.y + OEIL) + Math.abs(m.p.z - camPos.z) * 0.3);
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
    const geoIlot = new THREE.ConeGeometry(RAYON * 0.95, 5.5, 14, 6);
    geoIlot.rotateX(Math.PI);
    geoIlot.translate(0, -3.0, 0);
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
    paliers.forEach((p, i) => {
      if (p.br) return;
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
      if (p.br || i === 0 || i >= nb - 1) return;
      const g = new THREE.Group();
      const sortie = dir(p.cap);
      g.position.copy(p.c).addScaledVector(sortie, RAYON - 0.5);
      g.rotation.y = p.cap;
      for (const cote of [-1, 1]) {
        const pil = new THREE.Mesh(geoPilier, matTorii);
        pil.position.set(cote * 1.75, 2.1, 0);
        pil.rotation.z = -cote * 0.035;
        g.add(pil);
        const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.4, 16), matNoir);
        pied.position.set(cote * 1.76, 0.2, 0);
        g.add(pied);
      }
      const kasagi = new THREE.Mesh(geoKasagi, matNoir);
      kasagi.position.y = 4.42;
      const shimaki = new THREE.Mesh(geoShimaki, matTorii);
      shimaki.position.y = 4.2;
      const nuki = new THREE.Mesh(geoNuki, matTorii);
      nuki.position.y = 3.45;
      g.add(kasagi, shimaki, nuki);
      // La plaque pend sous le linteau, entre les piliers
      const pl = plaques[i] || {};
      const panneau = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({ map: plaque(pl.kanji, pl.nom || '', 'torii'), transparent: true, toneMapped: false }));
      panneau.position.set(0, 2.78, 0.12);
      g.add(panneau);
      for (const cote of [-1, 1]) {
        const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 4), matNoir);
        fil.position.set(cote * 0.7, 3.32, 0.1);
        g.add(fil);
      }
      scene.add(g);
      toriis.push({ g, panneau, y: p.c.y, i });
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
      const v = volees[Math.floor(al() * Math.min(5, volees.length))];
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

    /* ── Le vide sous les nuages : fragments de Backrooms qui flottent (papier peint, néons) ── */
    const matPapier = new THREE.MeshStandardMaterial({ map: texture('papier-peint', 1.3, 1, true), roughness: 0.95, side: THREE.DoubleSide });
    const matPanneauNeon = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6d8'), toneMapped: false });
    const fragments = [];
    const vVide = volees.filter((v) => v.debut.y <= -40 && v.debut.y > -90);
    const matTube = [new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fa8').multiplyScalar(1.6), toneMapped: false }), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3ff4ff').multiplyScalar(1.4), toneMapped: false })];
    for (let i = 0; i < (telephone ? 14 : 28); i++) {
      const v = vVide[i % Math.max(1, vVide.length)];
      if (!v) break;
      const base = v.debut.clone().lerp(v.fin, al());
      const cote = al() < 0.5 ? -1 : 1;
      base.add(new THREE.Vector3(-v.d.z, 0, v.d.x).multiplyScalar(cote * (5 + al() * 14)));
      base.y = lerp(-66, -93, al());
      // Fragments de Backrooms (papier peint, dalles de néon) et tubes de néon roses ou cyan
      const sorte = i % 4 === 0 ? 'neon' : i % 4 === 1 ? 'tube' : 'mur';
      const geo = sorte === 'neon' ? new THREE.BoxGeometry(1.2, 0.05, 0.6) : sorte === 'tube' ? new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8) : new THREE.BoxGeometry(1.5 + al() * 2.5, 1.2 + al() * 1.8, 0.1);
      const m = new THREE.Mesh(geo, sorte === 'neon' ? matPanneauNeon : sorte === 'tube' ? matTube[i % 2] : matPapier);
      m.position.copy(base);
      scene.add(m);
      fragments.push({ m, ph: al() * 6, v: 0.05 + al() * 0.15, base: base.clone() });
    }

    /* ── Les Backrooms ── */
    const br = { lumieres: [], vacillants: [] };
    const panneauxBr = [];
    const iBr = plan.findIndex((p) => p.br);
    if (iBr > 0) {
      const vDescente = volees[iBr - 1];
      const centreBr = paliers[Math.min(nb - 1, iBr + 1)].c.clone();
      const X0 = centreBr.x - 60, X1 = centreBr.x + 60, Z0 = centreBr.z - 60, Z1 = centreBr.z + 60;
      // Trou du plafond : là où l'escalier le traverse
      const tA = borne((plan[iBr - 1].y - (PLAFOND_BR + 2.6)) / vDescente.chute);
      const pA = vDescente.debut.clone().lerp(vDescente.fin, tA);
      const pB = vDescente.fin.clone();
      const trou = {
        x0: Math.min(pA.x, pB.x) - LARGEUR / 2 - 0.7, x1: Math.max(pA.x, pB.x) + LARGEUR / 2 + 0.7,
        z0: Math.min(pA.z, pB.z) - 0.6, z1: Math.max(pA.z, pB.z) + 0.6
      };
      // Rectangle horizontal (UV en mètres, pour que les textures gardent leur échelle)
      function rect(x0, x1, z0, z1, y, versLeBas, mat, metresParTuile) {
        if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return null;
        const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
        g.rotateX(versLeBas ? Math.PI / 2 : -Math.PI / 2);
        g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
        const pos = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / metresParTuile, pos.getZ(i) / metresParTuile);
        const m = new THREE.Mesh(g, mat);
        scene.add(m);
        return m;
      }
      function percer(y, versLeBas, mat, tuile) {
        rect(X0, trou.x0, Z0, Z1, y, versLeBas, mat, tuile);
        rect(trou.x1, X1, Z0, Z1, y, versLeBas, mat, tuile);
        rect(trou.x0, trou.x1, Z0, trou.z0, y, versLeBas, mat, tuile);
        rect(trou.x0, trou.x1, trou.z1, Z1, y, versLeBas, mat, tuile);
      }
      const texMoquette = texture('moquette', 1, 1, true);
      const texPlafond = texture('plafond', 1, 1, true);
      const matMoquette = new THREE.MeshStandardMaterial({ map: texMoquette, roughness: 1, color: new THREE.Color('#d8c89a') });
      const matPlafond = new THREE.MeshStandardMaterial({ map: texPlafond, roughness: 0.95, color: new THREE.Color('#e9e2c4') });
      const matToit = new THREE.MeshStandardMaterial({ map: texture('pierre-couleur', 1, 1, true), color: new THREE.Color('#8a8478'), roughness: 1 });
      const matBord = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a6456'), roughness: 1, side: THREE.DoubleSide });
      const EP_DALLE = 1.4;
      rect(X0, X1, Z0, Z1, SOL_BR, false, matMoquette, 2.2);
      percer(PLAFOND_BR, true, matPlafond, 1.2);
      percer(PLAFOND_BR + EP_DALLE, false, matToit, 4);
      // Bord du trou (épaisseur de la dalle)
      for (const [x0, x1, z0, z1] of [[trou.x0, trou.x1, trou.z0, trou.z0], [trou.x0, trou.x1, trou.z1, trou.z1], [trou.x0, trou.x0, trou.z0, trou.z1], [trou.x1, trou.x1, trou.z0, trou.z1]]) {
        const w = Math.max(0.05, Math.hypot(x1 - x0, z1 - z0));
        const b = new THREE.Mesh(new THREE.PlaneGeometry(w, EP_DALLE), matBord);
        b.position.set((x0 + x1) / 2, PLAFOND_BR + EP_DALLE / 2, (z0 + z1) / 2);
        if (x0 === x1) b.rotation.y = Math.PI / 2;
        scene.add(b);
      }

      // Chemin dans les Backrooms : les murs ne doivent jamais le couper
      const segs = [];
      for (let i = 0; i < chemin.length - 1; i++) if (chemin[i].y < PLAFOND_BR + OEIL + 0.5 && chemin[i + 1].y < PLAFOND_BR + OEIL + 0.5) segs.push([chemin[i], chemin[i + 1]]);
      const distSeg = (px, pz, a, b) => {
        const vx = b.x - a.x, vz = b.z - a.z, wx = px - a.x, wz = pz - a.z;
        const t = borne((wx * vx + wz * vz) / Math.max(1e-6, vx * vx + vz * vz));
        return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
      };
      const libre = (x, z, marge) => {
        if (x > trou.x0 - marge && x < trou.x1 + marge && z > trou.z0 - marge - 3 && z < trou.z1 + marge) return false;
        for (const [a, b] of segs) if (distSeg(x, z, a, b) < marge) return false;
        return true;
      };
      // Murs sur une grille de 4 m, tirés au hasard (labyrinthe du « Level 0 »)
      const CASE = 4;
      const geoMur = new THREE.BoxGeometry(CASE + 0.2, HAUT_BR, 0.2);
      const matMur = new THREE.MeshStandardMaterial({ map: texture('papier-peint', CASE / 1.6, HAUT_BR / 1.6, true), roughness: 0.95 });
      // Les murs s'assombrissent près de la moquette (humidité)
      matMur.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHautMur;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHautMur = position.y / ' + HAUT_BR.toFixed(1) + ' + .5;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHautMur;')
          .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= mix(.62, 1., smoothstep(.0, .22, vHautMur));');
      };
      const murs = [];
      const gx0 = Math.ceil(X0 / CASE), gx1 = Math.floor(X1 / CASE), gz0 = Math.ceil(Z0 / CASE), gz1 = Math.floor(Z1 / CASE);
      const ox = centreBr.x % CASE, oz = centreBr.z % CASE;
      for (let gx = gx0; gx < gx1; gx++) {
        for (let gz = gz0; gz < gz1; gz++) {
          const x = gx * CASE + ox + CASE / 2, z = gz * CASE + oz;
          if (al() < 0.36 && libre(x, z, 1.7) && libre(x - CASE / 2, z, 1.2) && libre(x + CASE / 2, z, 1.2)) murs.push([x, z, 0]);
          const x2 = gx * CASE + ox, z2 = gz * CASE + oz + CASE / 2;
          if (al() < 0.36 && libre(x2, z2, 1.7) && libre(x2, z2 - CASE / 2, 1.2) && libre(x2, z2 + CASE / 2, 1.2)) murs.push([x2, z2, Math.PI / 2]);
        }
      }
      const imMurs = new THREE.InstancedMesh(geoMur, matMur, murs.length);
      murs.forEach(([x, z, ry], i) => {
        e.set(0, ry, 0);
        q.setFromEuler(e);
        imMurs.setMatrixAt(i, m4.compose(p3.set(x, SOL_BR + HAUT_BR / 2, z), q, s3.set(1, 1, 1)));
      });
      scene.add(imMurs);

      // Néons du plafond : une grille de panneaux, quelques-uns grésillent
      const ECART = 2.4;
      const poses = [];
      for (let x = X0 + 1.2; x < X1; x += ECART) {
        for (let z = Z0 + 1.2; z < Z1; z += ECART) {
          if (x > trou.x0 - 0.8 && x < trou.x1 + 0.8 && z > trou.z0 - 0.8 && z < trou.z1 + 0.8) continue;
          poses.push([x, z]);
        }
      }
      const imNeons = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), poses.length);
      const cNeon = new THREE.Color('#fff4cf');
      poses.forEach(([x, z], i) => {
        imNeons.setMatrixAt(i, m4.compose(p3.set(x, PLAFOND_BR - 0.02, z), q.identity(), s3.set(1, 1, 1)));
        imNeons.setColorAt(i, cNeon);
      });
      imNeons.instanceColor.needsUpdate = true;
      scene.add(imNeons);
      for (let k = 0; k < 26; k++) br.vacillants.push({ i: Math.floor(al() * poses.length), ph: al() * 100, v: 4 + al() * 10 });
      br.poses = poses;
      br.imNeons = imNeons;
      br.cNeon = cNeon;
      // Quelques vraies lumières, toujours sur les néons les plus proches de la caméra
      for (let k = 0; k < 4; k++) {
        const l = new THREE.PointLight(new THREE.Color('#fff0c4'), 0, 7.5, 1.6);
        scene.add(l);
        br.lumieres.push(l);
      }
      // Lueur jaune qui monte du trou, vue du vide
      const lueur = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.3, 9, 32, 1, true), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
        uniforms: { uT: U.uT, uForce: { value: 1 } },
        vertexShader: 'varying vec2 vUv; varying float vFace; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 n = normalize(normalMatrix * normal); vFace = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform float uT, uForce; varying vec2 vUv; varying float vFace; void main() { float a = pow(1. - vUv.y, 2.6) * pow(vFace, 2.) * (.85 + .15 * sin(uT * 13.) * sin(uT * 3.1)); gl_FragColor = vec4(vec3(1., .86, .45) * a * .5 * uForce, 1.); }'
      }));
      lueur.position.set((trou.x0 + trou.x1) / 2, PLAFOND_BR + 5, (trou.z0 + trou.z1) / 2);
      lueur.scale.set((trou.x1 - trou.x0) / 2.6, 1, (trou.z1 - trou.z0) / 2.6);
      scene.add(lueur);
      br.lueur = lueur;

      // Panneaux d'entreprise : un par palier des Backrooms, accroché au plafond
      paliers.forEach((p, i) => {
        if (!p.br) return;
        const pl = plaques[i] || {};
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: plaque(pl.kanji, pl.nom || '', 'bureau'), roughness: 0.8, side: THREE.DoubleSide }));
        const d = dir(p.cap);
        m.position.copy(p.c).addScaledVector(d, 3.2);
        m.position.y = PLAFOND_BR - 0.62;
        m.rotation.y = p.cap;
        scene.add(m);
        panneauxBr.push({ i, m });
        for (const cote of [-1, 1]) {
          const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), matNoir);
          fil.position.copy(m.position).add(new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(cote * 0.6));
          fil.position.y = PLAFOND_BR - 0.11;
          scene.add(fil);
        }
      });
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

    /* ── Points que l'on regarde à chaque arrêt : la plaque du torii, le panneau des Backrooms ── */
    const cibles = [];
    toriis.forEach((to) => cibles.push({ i: to.i, p: to.g.position.clone().add(new THREE.Vector3(0, 2.2, 0)) }));
    panneauxBr.forEach((pb) => cibles.push({ i: pb.i, p: pb.m.position.clone().add(new THREE.Vector3(0, -0.5, 0)) }));

    /* ── Le compagnon : Lugulabre flotte à côté de nous, descend d'île en île et regarde la souris ──
       Il a sa propre scène, dessinée par-dessus le décor (il ne rentre jamais dans une marche ou un torii).
       Il choisit une place libre à l'écran (jamais devant le texte), et la rejoint en flottant. */
    const sceneComp = new THREE.Scene();
    const comp = {
      ob: null, mixer: null, actions: {}, courant: null, pos: new THREE.Vector3(), vit: new THREE.Vector3(),
      place: null, prochainChoix: 0, palier: -1, pret: false, regard: new THREE.Object3D(), clic: 0
    };
    // Places : à l'accueil, à côté du torii quand l'espace est libre, sinon dans le couloir à droite du texte,
    // et en dernier recours dans le coin en bas à droite (coordonnées d'écran -1..1, distance en mètres)
    const ACCUEIL = { x: 0.6, y: 0.0, p: 3.3 };
    const ACCUEIL_TEL = { x: 0.12, y: 0.42, p: 4.6 };   // écran en hauteur : au-dessus du texte
    const PRES_DU_TORII = { x: 0.36, y: 0.02, p: 4.6 };
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
      const x = ((bord + W) / 2 / W) * 2 - 1;
      // distance telle que Lugulabre tienne dans la largeur du couloir
      const p = Math.max(5.2, (0.72 * 0.95 * H) / (2 * (large / 2 - 6) * tanDemi()));
      return [{ x, y: -0.05, p }, { x, y: -0.5, p }, { x, y: 0.42, p }];
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
      // Ressort amorti : il flotte jusqu'à sa place, et traîne un peu quand on descend vite
      if (comp.pos.distanceTo(vEcran) > 30) { comp.pos.copy(vEcran); comp.vit.set(0, 0, 0); }
      const k = 14, amort = 2 * Math.sqrt(k) * 0.85;
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
      for (let n = 0; n < arrets.length; n++) if (Math.abs(dCam - arrets[n]) < 0.6) proche = n;
      if (proche >= 0 && proche !== comp.palier) {
        comp.palier = proche;
        if (comp.actions.content && t > 1.5) jouerComp('content', true);
      }
      comp.mixer.update(dt);
      // Sa lueur violette éclaire les marches dans le noir
      lumComp.position.copy(comp.ob.position);
      lumComp.intensity = lerp(0.15, 1.6, lisse(-30, -70, camera.position.y)) * (comp.clic > 0 ? 2 : 1);
      comp.clic = Math.max(0, comp.clic - dt);
    }

    /* ── Mise à jour à chaque image ── */
    const pos3 = new THREE.Vector3(), vise = new THREE.Vector3(), viseLisse = new THREE.Vector3(), tmp = new THREE.Vector3();
    const fondCouleur = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
    let dCam = arrets[0], vCam = 0, premiere = true, souris = [0, 0], sourisLisse = [0, 0], dims = null;
    const AMB = {
      soir: { brume: new THREE.Color('#e9967a'), dens: 0.0045 },
      nuage: { brume: new THREE.Color('#b494ad'), dens: 0.085 },
      vide: { brume: new THREE.Color('#110e22'), dens: 0.03 },
      back: { brume: new THREE.Color('#9d8f55'), dens: 0.062 }
    };

    return {
      nbPaliers: nb,
      debug: { camera, scene, renderer, arrets, paliers, comp },
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
        camera.updateProjectionMatrix();
        echelle.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        dims = [w, h];
      },
      /**
       * u : palier visé, en fraction (0 = accueil) ; t : temps (s) ; dt : écart.
       * Renvoie { prof (0 à 1), soir, nuage, vide, back } pour le CSS.
       */
      image(u, t, dt) {
        const i = Math.min(nb - 2, Math.floor(u)), x = u - i;
        const k = lisse(0.08, 0.92, x);
        const cible = lerp(arrets[i], arrets[i + 1], k);
        if (premiere) dCam = cible;
        else {
          const ecart = cible - dCam;
          if (Math.abs(ecart) > SAUT) { dCam = cible - Math.sign(ecart) * 18; vCam = Math.sign(ecart) * VMAX * 0.5; }
          const voulue = Math.max(-VMAX, Math.min(VMAX, ecart * 2.2));
          vCam += Math.max(-ACCEL * dt, Math.min(ACCEL * dt, voulue - vCam));
          dCam += vCam * dt;
        }
        surChemin(dCam, pos3);
        // Au départ, on regarde loin (le couchant, la mer de nuages) ; sur les marches, devant soi
        const large = 1 - lisse(arrets[0] + 1, arrets[0] + 12, dCam);
        surChemin(dCam + 8, vise);
        vise.y = lerp(vise.y, pos3.y, 0.6) - 0.3;
        tmp.copy(pos3).addScaledVector(dir(plan[0].cap), 30);
        tmp.y -= 2.6;
        vise.lerp(tmp, large);
        // À l'arrêt devant un palier, le regard se pose sur sa plaque
        for (const c of cibles) {
          const w = 1 - lisse(1.5, 9, Math.abs(dCam - arrets[c.i]));
          if (w > 0) vise.lerp(c.p, w * 0.9);
        }
        viseLisse.copy(premiere ? vise : viseLisse.lerp(vise, 1 - Math.exp(-dt * 4)));
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
        const soir = 1 - lisse(-34, -58, y);
        const nuage = lisse(NUAGES_HAUT + 4, NUAGES_HAUT - 4, y) * (1 - lisse(NUAGES_BAS + 2, NUAGES_BAS - 6, y));
        const back = lisse(PLAFOND_BR + 1.6, PLAFOND_BR - 0.6, y);
        const vide = lisse(NUAGES_BAS + 2, NUAGES_BAS - 8, y) * (1 - back);
        const prof = borne(-y / (-SOL_BR + OEIL));
        const nuit = lisse(-26, -66, y);

        U.uT.value = t;
        // Le soleil se couche pendant la descente
        const haut = lerp(0.075, -0.06, lisse(0, -46, y));
        uCiel.uSoleil.value.set(0.12, haut, -1).normalize();
        uCiel.uNuit.value = nuit;
        ciel.position.copy(camera.position);
        ciel.visible = back < 0.999;

        // Brume : soir -> nuages -> vide -> Backrooms
        fondCouleur.copy(AMB.soir.brume).lerp(AMB.vide.brume, lisse(-40, -70, y));
        let dens = lerp(AMB.soir.dens, AMB.vide.dens, lisse(-40, -70, y));
        fondCouleur.lerp(AMB.nuage.brume.clone().lerp(AMB.vide.brume, lisse(-50, -64, y) * 0.7), nuage);
        dens = lerp(dens, AMB.nuage.dens, nuage);
        fondCouleur.lerp(AMB.back.brume, back);
        dens = lerp(dens, AMB.back.dens, back);
        scene.fog.color.copy(fondCouleur);
        scene.fog.density = dens;
        renderer.setClearColor(fondCouleur);
        for (const c of couches) {
          c.material.uniforms.uCam.value.copy(camera.position);
          c.material.uniforms.uBrume.value.copy(fondCouleur);
          c.position.x = Math.round(camera.position.x / 50) * 50;
          c.position.z = Math.round(camera.position.z / 50) * 50;
          c.visible = back < 0.5;
        }

        // Lumière : soleil chaud -> lune froide -> néons jaunes
        soleil.position.copy(camera.position).addScaledVector(uCiel.uSoleil.value, 60);
        soleil.target.position.copy(camera.position);
        soleil.intensity = lerp(1.7, 0.18, nuit) * (1 - back);
        soleil.color.set('#ffa868').lerp(cA.set('#8fa4ff'), nuit);
        hemi.color.set('#ffd2b8').lerp(cA.set('#3a4a8a'), nuit).lerp(cB.set('#fff1c2'), back);
        hemi.groundColor.set('#6b3d6e').lerp(cA.set('#0b0a18'), nuit).lerp(cB.set('#6e5a2a'), back);
        hemi.intensity = lerp(lerp(0.95, 0.35, nuit), 0.95, back);
        renderer.toneMappingExposure = lerp(1.05, 1.15, back);

        // Fils de lumière des marches : discrets au soleil, néons dans le noir
        imFils.material.color.setScalar(lerp(0.35, 2.2, nuit));
        matTorii.emissiveIntensity = lerp(0, 1.1, lisse(-40, -70, y));
        // Lanterne : le torii le plus proche éclaire les marches la nuit
        let proche = null, dmin = Infinity;
        for (const to of toriis) { const d = to.g.position.distanceTo(camera.position); if (d < dmin) { dmin = d; proche = to; } }
        if (proche) {
          lanterne.position.copy(proche.g.position).add(tmp.set(0, 3, 0));
          lanterne.intensity = lerp(0.2, 2.2, nuit) * (1 - back);
        }
        for (const to of toriis) to.panneau.material.opacity = lisse(70, 18, to.g.position.distanceTo(camera.position));

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
        imCailloux.visible = y > -70;
        for (const f of fragments) {
          f.m.position.set(f.base.x + Math.sin(t * f.v + f.ph) * 0.8, f.base.y + Math.sin(t * f.v * 1.3 + f.ph) * 0.5, f.base.z);
          f.m.rotation.set(Math.sin(t * f.v + f.ph) * 0.4, t * f.v + f.ph, Math.cos(t * f.v * 0.7) * 0.3);
        }

        // Backrooms : néons qui grésillent, lumières qui suivent la caméra
        if (br.imNeons) {
          for (const v of br.vacillants) {
            const s = Math.sin(t * v.v + v.ph) + Math.sin(t * v.v * 2.7 + v.ph * 2.0);
            const on = s > -0.6 || Math.sin(t * 37 + v.ph) > 0.7 ? 1 : 0.08;
            br.imNeons.setColorAt(v.i, cA.copy(br.cNeon).multiplyScalar(on));
          }
          br.imNeons.instanceColor.needsUpdate = true;
          const visibles = back > 0.01 || y < PLAFOND_BR + 12;
          br.imNeons.visible = visibles;
          if (visibles) {
            const tri = br.poses.map((p, n) => [n, (p[0] - camera.position.x) ** 2 + (p[1] - camera.position.z) ** 2]).sort((a, b) => a[1] - b[1]);
            br.lumieres.forEach((l, n) => {
              const [idx] = tri[n];
              l.position.set(br.poses[idx][0], PLAFOND_BR - 0.4, br.poses[idx][1]);
              const vac = br.vacillants.find((v) => v.i === idx);
              l.intensity = back * 1.25 * (vac ? 0.5 : 1);
            });
          }
          br.lueur.material.uniforms.uForce.value = lisse(-60, -90, y) * (1 - back);
        }

        // Particules : lucioles dorées le soir, poussière froide dans le vide, poussière jaune en bas
        const up = poussieres.material.uniforms;
        up.uCam.value.copy(camera.position);
        up.uCouleur.value.set('#ffd28a').lerp(cA.set('#8ff6ff'), lisse(-45, -70, y)).lerp(cB.set('#fff0b8'), back);
        up.uForce.value = lerp(0.9, 0.6, back) * (1 - nuage * 0.6);
        up.uBr.value = back;

        renderer.render(scene, camera);
        if (comp.pret) {
          camera.updateMatrixWorld();
          majCompagnon(t, dt, dCam < arrets[0] + 0.5 && u < 0.35);
          renderer.autoClear = false;
          renderer.clearDepth();
          renderer.render(sceneComp, camera);
          renderer.autoClear = true;
        }
        return { prof, soir, nuage, vide, back, nuit };
      }
    };
  }

  const reduitMouvement = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { creer };
})();
