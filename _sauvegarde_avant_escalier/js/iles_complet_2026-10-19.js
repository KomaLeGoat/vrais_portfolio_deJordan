/* ══════════════════════════════════════════════════════════════
   ÎLES — le contenu de chaque partie, posé en 3D sur son île (js/escalier.js)
   Le décor n'est plus seulement un fond : l'île « Outils » porte les outils, l'île « Projets »
   les cartes, l'île « Certifications » les badges… Le texte de la partie reste à gauche (HTML).
   Les objets réagissent au survol et au clic (fenêtres du site : projets, certificats, photos).
   Données : celles de la page (main.js expose PROJETS, OUTILS, STAGES ; le reste est lu dans le HTML).
══════════════════════════════════════════════════════════════ */
window.Iles = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;
  const fichier = location.protocol === 'file:';
  const polices = document.fonts ? document.fonts.ready : Promise.resolve();
  const cliquables = [];      // { racine, action, base: { y, ech }, actif }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let api = null, survole = null;

  /* ── Petits outils ── */
  const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function arrondi(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /** Charge une image (null si impossible : en double-clic, les images locales ne vont pas dans WebGL). */
  function image(src) {
    return new Promise((ok) => {
      if (!src || (fichier && !/^(https?:|data:)/.test(src))) return ok(null);
      const im = new Image();
      if (/^https?:/.test(src)) im.crossOrigin = 'anonymous';
      im.onload = () => ok(im);
      im.onerror = () => ok(null);
      im.src = src;
    });
  }

  /** Texture dessinée dans une toile ; redessinée quand les polices et les images arrivent. */
  function toile(w, h, dessiner) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    tex.redessiner = () => { dessiner(cv.getContext('2d'), w, h); tex.needsUpdate = true; };
    tex.redessiner();
    polices.then(tex.redessiner);
    return tex;
  }

  function texImage(src, pixel) {
    const t = new THREE.Texture();
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
    image(src).then((im) => { if (im) { t.image = im; t.needsUpdate = true; t.pret = true; } });
    return t;
  }

  /** Dessine une image « en couverture » dans un rectangle. */
  function couvrir(g, im, x, y, w, h) {
    if (!im) return;
    const k = Math.max(w / im.width, h / im.height);
    const sw = w / k, sh = h / k;
    g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
  }

  function lignes(g, texte, x, y, largeur, interligne, max = 99) {
    const mots = texte.split(/\s+/);
    let ligne = '', n = 0;
    for (const m of mots) {
      const essai = ligne ? ligne + ' ' + m : m;
      if (g.measureText(essai).width > largeur && ligne) {
        g.fillText(ligne, x, y + n * interligne);
        ligne = m;
        if (++n >= max) return;
      } else ligne = essai;
    }
    if (ligne) g.fillText(ligne, x, y + n * interligne);
  }

  function mat(couleur, opts = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(couleur), roughness: 0.6 }, opts));
  }
  const matPhoto = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

  function cliquable(racine, action) {
    const c = { racine, action, base: { y: racine.position.y, ech: racine.scale.x }, actif: 0 };
    cliquables.push(c);
    return c;
  }

  /** Une étiquette (texte sur fond sombre arrondi) qui regarde toujours la caméra. */
  function etiquette(texte, sous, largeur = 1.6) {
    const tex = toile(512, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(16, 10, 30, 0.72)';
      arrondi(g, 6, 6, w - 12, h - 12, 40);
      g.fill();
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.font = '800 46px Syne, sans-serif';
      g.fillText(texte, w / 2, sous ? 68 : 96, w - 40);
      if (sous) {
        g.fillStyle = '#9df0b4';
        g.font = '700 30px "DM Sans", sans-serif';
        g.fillText(sous, w / 2, 122, w - 40);
      }
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
    s.scale.set(largeur, largeur * 160 / 512, 1);
    return s;
  }

  /** Cadre photo (bois sombre doré) ; `ratio` = largeur / hauteur de l'image. */
  function cadre(src, hauteur, ratio, options = {}) {
    const g = new THREE.Group();
    const largeur = hauteur * ratio;
    const bord = 0.09;
    const bois = mat('#3a2418', { roughness: 0.5, metalness: 0.2 });
    const or = mat('#d9b25c', { roughness: 0.35, metalness: 0.7 });
    const fond = new THREE.Mesh(new THREE.BoxGeometry(largeur + bord * 2, hauteur + bord * 2, 0.08), bois);
    g.add(fond);
    const filet = new THREE.Mesh(new THREE.BoxGeometry(largeur + 0.04, hauteur + 0.04, 0.085), or);
    g.add(filet);
    const tex = texImage(src, options.pixel);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xf2f2f2 }));
    photo.position.z = 0.046;
    g.add(photo);
    if (options.chevalet) {
      const pied = mat('#5a3a24');
      for (const [x, z, r] of [[-largeur * 0.35, 0.25, 0.12], [largeur * 0.35, 0.25, -0.12], [0, -0.55, 0]]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, hauteur + 1.1, 8), pied);
        l.position.set(x, -0.25, z - 0.1);
        l.rotation.set(z > 0 ? -0.18 : 0.35, 0, r);
        g.add(l);
      }
    }
    return g;
  }

  /* ════════ Contenu de chaque île ════════ */

  function apropos(ile) {
    const g = ile.groupe;
    const photo = cadre('images/jordan.webp', 2.1, 1100 / 1467, { chevalet: true });
    photo.position.set(-1.9, 1.75, 0.5);
    photo.rotation.y = 0.22;
    g.add(photo);
    cliquable(photo, () => window.ouvrirLightbox && ouvrirLightbox('Jordan Bourgine', 'images/jordan.webp'));
    const ds = cadre('images/pokemon_bw.webp', 1.75, 500 / 371, { chevalet: true });
    ds.position.set(1.75, 1.6, 0.1);
    ds.rotation.y = -0.25;
    g.add(ds);
    cliquable(ds, () => window.ouvrirLightbox && ouvrirLightbox('Pokémon Blanc et Noir', 'images/pokemon_bw.webp'));
    ile.anims.push((t) => {
      photo.position.y = 1.75 + Math.sin(t * 1.1) * 0.03;
      ds.position.y = 1.6 + Math.sin(t * 1.1 + 2) * 0.03;
    });
  }

  function formation(ile) {
    const g = ile.groupe;
    const socle = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 1.3), mat('#cfc3b0', { roughness: 0.85 }));
    socle.position.set(0, 0.17, 0.4);
    g.add(socle);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.3), new THREE.MeshBasicMaterial({
      toneMapped: false, transparent: true,
      map: toile(1024, 68, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#5a1a14';
        c.font = '800 44px Syne, sans-serif';
        c.textAlign = 'center';
        c.fillText('BTS SIO — SLAM', w / 2, 50);
      })
    }));
    plaque.position.set(0, 0.18, 1.06);
    g.add(plaque);
    if (!window.Trois) return;
    Trois.glb('assets/3d/slam.glb', 'SLAM_GLB').then((gltf) => {
      const lettres = gltf.scene;
      Trois.manga(lettres, { ep: 0.012 });
      const boite = new THREE.Box3().setFromObject(lettres);
      const taille = boite.getSize(new THREE.Vector3());
      const k = 4.4 / Math.max(0.01, taille.x);
      lettres.scale.setScalar(k);
      lettres.position.set(-(boite.min.x + taille.x / 2) * k, 0.35 - boite.min.y * k, 0.4);
      g.add(lettres);
      const liste = lettres.children.slice().sort((a, b) => a.position.x - b.position.x);
      liste.forEach((o, i) => {
        const y0 = o.position.y;
        const l = { saut: 0, tour: 0 };
        ile.anims.push((t) => {
          o.position.y = y0 + Math.sin(t * 2.2 - i * 0.8) * 0.04 + l.saut;
          o.rotation.y = Math.sin(t * 1.4 - i * 0.6) * 0.12 + l.tour;
        });
        cliquable(o, () => {
          if (!window.gsap) return;
          gsap.killTweensOf(l);
          gsap.to(l, { saut: 0.35, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 });
          gsap.fromTo(l, { tour: 0 }, { tour: Math.PI * 2, duration: 0.8, ease: 'power3.out' });
        }).fixe = true;
      });
    }).catch((e) => console.warn('[îles] SLAM non chargé', e));
  }

  function outils(ile) {
    const g = ile.groupe;
    const liste = window.OUTILS || [];
    const anneau = new THREE.Group();
    anneau.position.set(0, 1.85, 0.2);
    g.add(anneau);
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 1.1, 24), mat('#cfc3b0', { roughness: 0.85 }));
    pied.position.set(0, 0.55, 0.2);
    g.add(pied);
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat('#ff5a5a', { emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }));
    cristal.position.set(0, 1.55, 0.2);
    g.add(cristal);
    const R = 3.0, n = liste.length;
    const tuiles = liste.map((o, i) => {
      let icone = null;
      const tex = toile(320, 400, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        const d = c.createLinearGradient(0, 0, 0, h);
        d.addColorStop(0, '#ffffff');
        d.addColorStop(1, '#e8e3da');
        c.fillStyle = d;
        arrondi(c, 4, 4, w - 8, h - 8, 34);
        c.fill();
        c.fillStyle = '#85807a';
        c.font = '400 22px Silkscreen, monospace';
        c.fillText('N°' + String(i + 1).padStart(3, '0'), 24, 44);
        if (icone) c.drawImage(icone, w / 2 - 80, 92, 160, 160);
        c.fillStyle = '#141414';
        c.font = '800 38px Syne, sans-serif';
        c.textAlign = 'center';
        c.fillText(o.name, w / 2, 330, w - 30);
        c.textAlign = 'left';
      });
      image(o.icon).then((im) => { if (im) { icone = im; tex.redessiner(); } });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.25, 0.06), [
        mat('#e8e3da'), mat('#e8e3da'), mat('#e8e3da'), mat('#e8e3da'),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), mat('#e8e3da')
      ]);
      anneau.add(m);
      const c = cliquable(m, () => { cible = -i * (2 * Math.PI / n); auto = false; setTimeout(() => { auto = true; }, 4000); });
      c.fixe = true;
      return m;
    });
    let angle = 0, cible = null, auto = true;
    const tmp = new THREE.Vector3();
    ile.anims.push((t, dt, camera) => {
      const arret = survole && tuiles.includes(survole.racine);
      if (cible !== null) {
        const d = Math.atan2(Math.sin(cible - angle), Math.cos(cible - angle));
        angle += d * Math.min(1, dt * 4);
        if (Math.abs(d) < 0.002) cible = null;
      } else if (auto && !arret) angle -= dt * 0.28;
      tuiles.forEach((m, i) => {
        const a = angle + i * (2 * Math.PI / n);
        m.position.set(Math.sin(a) * R, Math.sin(a * 2 + t) * 0.08, Math.cos(a) * R * 0.75);
        // chaque tuile regarde la caméra ; celle de devant grandit (comme dans le Pokédex)
        tmp.copy(camera.position);
        m.parent.worldToLocal(tmp);
        m.lookAt(m.parent.localToWorld(tmp.set(tmp.x, m.position.y, tmp.z)));
        const devant = lisse(0.4, 1, Math.cos(a));
        const s = 0.85 + 0.35 * devant + (survole && survole.racine === m ? 0.12 : 0);
        m.scale.setScalar(s);
      });
      cristal.rotation.y = t * 0.8;
      cristal.position.y = 1.55 + Math.sin(t * 1.5) * 0.1;
    });
  }

  /** Carte de projet façon carte Pokémon, dessinée dans une toile. */
  function texCarte(p, i, total) {
    let im = null;
    const tex = toile(640, 896, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const or = c.createLinearGradient(0, 0, w, h);
      for (const [k, col] of [[0, '#f3e3a8'], [0.3, '#c9a24c'], [0.55, '#f7ebbb'], [0.8, '#b08a38'], [1, '#ecd99a']]) or.addColorStop(k, col);
      c.fillStyle = or;
      arrondi(c, 0, 0, w, h, 34);
      c.fill();
      const face = c.createLinearGradient(0, 0, 0, h);
      face.addColorStop(0, '#2a1215');
      face.addColorStop(0.6, '#140c0e');
      face.addColorStop(1, '#0f0d0e');
      c.fillStyle = face;
      arrondi(c, 22, 22, w - 44, h - 44, 20);
      c.fill();
      // en-tête : PROJET, titre, type
      c.fillStyle = 'rgba(255,255,255,0.14)';
      arrondi(c, 44, 46, 92, 32, 6);
      c.fill();
      c.fillStyle = '#f3efe8';
      c.font = '400 18px Silkscreen, monospace';
      c.fillText('PROJET', 52, 69);
      c.font = '800 40px Syne, sans-serif';
      c.fillText(p.title, 150, 76, 380);
      c.fillStyle = '#ff2a2a';
      c.beginPath();
      c.arc(w - 66, 62, 24, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.font = '28px "Yuji Boku", serif';
      c.textAlign = 'center';
      c.fillText(p.type || '', w - 66, 72);
      c.textAlign = 'left';
      // image
      c.fillStyle = '#d7c48c';
      c.fillRect(42, 104, w - 84, 372);
      c.fillStyle = '#000';
      c.fillRect(50, 112, w - 100, 356);
      if (im) couvrir(c, im, 50, 112, w - 100, 356);
      // bandeau
      c.fillStyle = '#e3cf8f';
      c.font = '400 18px Silkscreen, monospace';
      c.textAlign = 'center';
      c.fillText(`N°${String(i + 1).padStart(3, '0')} · ${p.code ? p.code.lang : 'GIF'}`, w / 2, 512);
      c.textAlign = 'left';
      // description
      c.fillStyle = '#ddd7cc';
      c.font = '400 27px "DM Sans", sans-serif';
      lignes(c, p.desc, 52, 568, w - 104, 37, 7);
      // pied
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.moveTo(44, 818);
      c.lineTo(w - 44, 818);
      c.stroke();
      c.font = '400 20px Silkscreen, monospace';
      c.fillStyle = '#ff7a7a';
      if (p.code || p.gif) c.fillText('VOIR →', 52, 852);
      c.fillStyle = '#a39d93';
      c.textAlign = 'right';
      c.fillText(`${String(i + 1).padStart(3, '0')}/${String(total).padStart(3, '0')}`, w - 52, 852);
      c.textAlign = 'left';
    });
    image(p.img).then((x) => { if (x) { im = x; tex.redessiner(); } });
    return tex;
  }

  const dosCarte = () => toile(320, 448, (c, w, h) => {
    c.fillStyle = '#d9b25c';
    arrondi(c, 0, 0, w, h, 18);
    c.fill();
    c.fillStyle = '#1c2a6b';
    arrondi(c, 12, 12, w - 24, h - 24, 12);
    c.fill();
    c.translate(w / 2, h / 2);
    c.fillStyle = '#e3121b';
    c.beginPath(); c.arc(0, 0, 90, Math.PI, 0); c.fill();
    c.fillStyle = '#f4f1ea';
    c.beginPath(); c.arc(0, 0, 90, 0, Math.PI); c.fill();
    c.fillStyle = '#141414';
    c.fillRect(-90, -8, 180, 16);
    c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f4f1ea';
    c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
  });

  function projets(ile) {
    const g = ile.groupe;
    const liste = window.PROJETS || [];
    const dos = dosCarte();
    const W = 1.62, H = W * 88 / 63;
    liste.forEach((p, i) => {
      const x = (i - (liste.length - 1) / 2) * 1.95;
      const carte = new THREE.Group();
      const corps = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.03), [
        mat('#c9a24c', { metalness: 0.6 }), mat('#c9a24c', { metalness: 0.6 }), mat('#c9a24c', { metalness: 0.6 }), mat('#c9a24c', { metalness: 0.6 }),
        new THREE.MeshBasicMaterial({ map: texCarte(p, i, liste.length), transparent: true, toneMapped: false }),
        new THREE.MeshBasicMaterial({ map: dos, toneMapped: false })
      ]);
      carte.add(corps);
      const z = 0.4 + Math.abs(x) * 0.18;
      carte.position.set(x, 0.35 + H / 2, z);
      carte.rotation.y = -x * 0.09;
      g.add(carte);
      const c = cliquable(carte, () => window.ouvrirProjet && ouvrirProjet(i));
      c.base.ry = carte.rotation.y;
      ile.anims.push((t) => {
        const leve = c.actif;
        carte.position.y = 0.35 + H / 2 + Math.sin(t * 1.3 + i) * 0.05 + leve * 0.25;
        carte.rotation.y = c.base.ry * (1 - leve) + Math.sin(t * 0.7 + i) * 0.04;
        carte.rotation.x = -0.04 + leve * -0.06;
      });
      // petit socle de pierre sous chaque carte
      const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.22, 20), mat('#cfc3b0', { roughness: 0.85 }));
      socle.position.set(x, 0.11, z);
      g.add(socle);
    });
  }

  function steles(ile) {
    const g = ile.groupe;
    const stages = window.STAGES || [];
    const pierre = window.DECOR_TEX && window.DECOR_TEX['pierre-couleur'];
    const steles = [];
    stages.forEach((st, i) => {
      let fond = null;
      const tex = toile(560, 720, (c, w, h) => {
        c.fillStyle = '#bdb1a0';
        c.fillRect(0, 0, w, h);
        if (fond) { c.globalAlpha = 0.55; c.drawImage(fond, 0, 0, w, h); c.globalAlpha = 1; }
        c.fillStyle = 'rgba(255, 245, 225, 0.45)';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(60, 40, 20, 0.55)';
        c.lineWidth = 6;
        c.strokeRect(26, 26, w - 52, h - 52);
        c.textAlign = 'center';
        c.fillStyle = '#9c0a12';
        c.font = '400 30px Silkscreen, monospace';
        c.fillText(`STAGE ${i + 1}`, w / 2, 110);
        c.fillStyle = '#2b1d12';
        c.font = '800 54px Syne, sans-serif';
        const [a, b] = st.name.split(' — ');
        lignes(c, a || st.name, w / 2, 220, w - 90, 62, 3);
        c.font = '700 34px "DM Sans", sans-serif';
        c.fillStyle = '#4a3420';
        if (b) lignes(c, b, w / 2, 380, w - 100, 44, 3);
        c.font = '500 26px "DM Sans", sans-serif';
        c.fillStyle = '#5a4630';
        lignes(c, st.meta, w / 2, 560, w - 100, 34, 3);
        c.textAlign = 'left';
      });
      image(pierre).then((x) => { if (x) { fond = x; tex.redessiner(); } });
      const s = new THREE.Group();
      const bloc = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.7, 0.35), [
        mat('#a89a86'), mat('#a89a86'), mat('#b9ad9a'), mat('#a89a86'),
        new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, roughness: 0.9, emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0 }), mat('#a89a86')
      ]);
      bloc.position.y = 1.35 + 0.3;
      s.add(bloc);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 0.7), mat('#cfc3b0', { roughness: 0.85 }));
      base.position.y = 0.15;
      s.add(base);
      const x = i === 0 ? -1.55 : 1.55;
      s.position.set(x, 0, i === 0 ? 0.6 : 0.1);
      s.rotation.y = -x * 0.12;
      g.add(s);
      const c = cliquable(s, () => window.afficherStage && afficherStage(i));
      steles.push({ s, bloc, c, actif: i === 0 ? 1 : 0 });
    });
    addEventListener('stage-change', (e) => steles.forEach((x, i) => { x.choisi = i === e.detail; }));
    if (steles[0]) steles[0].choisi = true;
    ile.anims.push((t, dt) => {
      steles.forEach((x) => {
        x.actif += ((x.choisi ? 1 : 0) - x.actif) * Math.min(1, dt * 5);
        x.s.position.y = x.actif * 0.18 + Math.sin(t * 1.2) * 0.02 * x.actif;
        x.bloc.material[4].emissiveIntensity = 0.12 * x.actif;
      });
    });
  }

  const FORMES = {
    hexa: [[25, 3], [75, 3], [100, 50], [75, 97], [25, 97], [0, 50]],
    bouclier: [[50, 0], [100, 14], [94, 62], [50, 100], [6, 62], [0, 14]],
    losange: [[50, 0], [100, 50], [50, 100], [0, 50]],
    etoile: [[50, 0], [63, 33], [98, 35], [71, 58], [80, 94], [50, 74], [20, 94], [29, 58], [2, 35], [37, 33]]
  };
  const COULEURS = {
    hexa: ['#ff9a9a', '#b3121b'], bouclier: ['#ffe7a8', '#b07a1d'], rond: ['#e6ecf5', '#7f8aa0'],
    losange: ['#a8f0c2', '#1b8a4a'], etoile: ['#d7b8ff', '#6b2bb3']
  };

  function forme(nom, r) {
    const s = new THREE.Shape();
    if (nom === 'rond' || !FORMES[nom]) {
      s.absarc(0, 0, r, 0, Math.PI * 2, false);
      return s;
    }
    FORMES[nom].forEach(([px, py], i) => {
      const x = (px - 50) / 50 * r, y = (50 - py) / 50 * r;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    });
    s.closePath();
    return s;
  }

  function certifications(ile) {
    const g = ile.groupe;
    const cartes = [...document.querySelectorAll('#certGrid .cert-card')];
    const n = cartes.length;
    cartes.forEach((el, i) => {
      const nom = el.dataset.forme || 'hexa';
      const [c1, c2] = COULEURS[nom] || COULEURS.hexa;
      const x = (i - (n - 1) / 2) * 1.55;
      const z = 0.5 - Math.abs(x) * 0.12;
      const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.9, 20), mat('#cfc3b0', { roughness: 0.85 }));
      socle.position.set(x, 0.45, z);
      g.add(socle);
      const badge = new THREE.Group();
      const reglage = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 3, curveSegments: 32 };
      const ext = new THREE.Mesh(new THREE.ExtrudeGeometry(forme(nom, 0.56), reglage), mat(c2, { metalness: 0.75, roughness: 0.3, emissive: new THREE.Color(c2), emissiveIntensity: 0.15 }));
      ext.geometry.center();
      const int = new THREE.Mesh(new THREE.ExtrudeGeometry(forme(nom, 0.38), Object.assign({}, reglage, { depth: 0.16 })), mat(c1, { metalness: 0.5, roughness: 0.25, emissive: new THREE.Color(c1), emissiveIntensity: 0.2 }));
      int.geometry.center();
      badge.add(ext, int);
      badge.position.set(x, 1.65, z);
      g.add(badge);
      const nomCert = el.dataset.cert || '';
      const eti = etiquette((el.querySelector('.cert-name') || {}).textContent || nomCert, 'Validé', 1.45);
      eti.position.set(x, 1.02, z + 0.55);
      eti.scale.multiplyScalar(0.95);
      g.add(eti);
      const c = cliquable(badge, () => window.ouvrirLightbox && ouvrirLightbox(nomCert, el.dataset.img));
      ile.anims.push((t) => {
        // il se balance face à nous ; au survol, il fait un tour complet
        badge.rotation.y = Math.sin(t * 0.8 + i) * 0.45 + c.actif * Math.PI * 2;
        badge.position.y = 1.75 + Math.sin(t * 1.4 + i) * 0.07 + c.actif * 0.15;
      });
    });
  }

  function veille(ile) {
    const g = ile.groupe;
    // un carré de dalles d'herbe, clin d'œil à Pokémon Donjon Mystère
    const herbe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.58, 0.08, 0.58), mat('#8cbf77', { roughness: 0.95 }), 36);
    const m4 = new THREE.Matrix4(), cl = new THREE.Color();
    let k = 0;
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      herbe.setMatrixAt(k, m4.makeTranslation((a - 2.5) * 0.6, 0.04, (b - 2.5) * 0.6 + 0.3));
      herbe.setColorAt(k, cl.set((a + b) % 2 ? '#8cbf77' : '#7fb46c'));
      k++;
    }
    herbe.instanceColor.needsUpdate = true;
    g.add(herbe);
    const sprite = document.getElementById('pmdSprite');
    const tex = texImage(sprite ? sprite.getAttribute('src') : 'images/dialogue1.webp', true);
    const jordan = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.85), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false }));
    jordan.position.set(0, 1.45, 0.3);
    g.add(jordan);
    const bulle = etiquette('…', null, 0.9);
    bulle.position.set(0.85, 3.1, 0.3);
    g.add(bulle);
    cliquable(jordan, () => { const b = document.getElementById('pmdBoite'); if (b) b.click(); });
    // le sprite suit l'étape du dialogue
    if (sprite && window.MutationObserver) {
      new MutationObserver(() => {
        image(sprite.getAttribute('src')).then((im) => { if (im) { tex.image = im; tex.needsUpdate = true; } });
      }).observe(sprite, { attributes: true, attributeFilter: ['src'] });
    }
    const tmp = new THREE.Vector3();
    ile.anims.push((t, dt, camera) => {
      // il se tourne vers nous (comme un personnage de jeu en 2D)
      tmp.copy(camera.position);
      jordan.parent.worldToLocal(tmp);
      jordan.rotation.y = Math.atan2(tmp.x - jordan.position.x, tmp.z - jordan.position.z);
      jordan.position.y = 1.45 + Math.abs(Math.sin(t * 2.2)) * 0.05;
      bulle.position.y = 3.1 + Math.sin(t * 2) * 0.06;
    });
  }

  function evenements(ile) {
    const g = ile.groupe;
    const evts = [...document.querySelectorAll('#arbre .tc')];
    const n = evts.length;
    evts.forEach((el, i) => {
      const w = el.querySelector('.tc-img-wrap');
      const src = w ? w.dataset.img : '';
      const titre = w ? w.dataset.title : '';
      const a = (i - (n - 1) / 2) * 0.5;
      const f = cadre(src, 1.25, 4 / 3, { chevalet: true });
      f.position.set(Math.sin(a) * 3.1, 1.35 + (i % 2) * 0.12, Math.cos(a) * 3.1 - 2.4);
      f.rotation.y = a;
      g.add(f);
      const c = cliquable(f, () => window.ouvrirLightbox && ouvrirLightbox(titre, src));
      const y0 = f.position.y;
      ile.anims.push((t) => { f.position.y = y0 + Math.sin(t * 1.1 + i) * 0.03 + c.actif * 0.12; });
      const annee = (el.querySelector('.tc-year') || {}).textContent || '';
      const eti = etiquette((el.querySelector('h4') || {}).textContent || titre, annee, 1.5);
      eti.position.set(f.position.x, 0.42, f.position.z + 0.25);
      g.add(eti);
    });
  }

  function contact(ile) {
    const g = ile.groupe;
    const rouge = mat('#d3171f', { roughness: 0.45, metalness: 0.1 });
    const boite = new THREE.Group();
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 12), mat('#2a2526'));
    pied.position.y = 0.55;
    const corps = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.75), rouge);
    corps.position.y = 1.65;
    const toit = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.9, 24, 1, false, 0, Math.PI), rouge);
    toit.rotation.z = Math.PI / 2;
    toit.position.y = 2.22;
    const fente = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), mat('#141414'));
    fente.position.set(0, 1.95, 0.38);
    boite.add(pied, corps, toit, fente);
    boite.position.set(0.6, 0, 0.4);
    g.add(boite);
    // une lettre qui flotte au-dessus : un clic, et on écrit le message
    const lettre = new THREE.Group();
    const papier = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.58, 0.03), mat('#f6f1e6', { roughness: 0.9 }));
    const rabat = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.32, 4, 1), mat('#efe6d4', { roughness: 0.9 }));
    rabat.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    rabat.scale.set(1.25, 1, 0.06);
    rabat.position.set(0, 0.06, 0.03);
    const cachet = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), mat('#b3121b'));
    cachet.rotation.x = Math.PI / 2;
    cachet.position.set(0, -0.04, 0.05);
    lettre.add(papier, rabat, cachet);
    lettre.position.set(-1.1, 2.4, 0.6);
    g.add(lettre);
    cliquable(lettre, () => { const c = document.getElementById('name'); if (c) c.focus({ preventScroll: false }); });
    cliquable(boite, () => { const c = document.getElementById('name'); if (c) c.focus({ preventScroll: false }); });
    ile.anims.push((t) => {
      lettre.position.y = 2.4 + Math.sin(t * 1.6) * 0.15;
      lettre.rotation.set(Math.sin(t * 0.9) * 0.15, Math.sin(t * 0.6) * 0.5, Math.sin(t * 1.1) * 0.12);
    });
  }

  const PAR_SECTION = {
    APropos: apropos, Formation: formation, Outils: outils, Projets: projets, Stage: steles,
    Certifications: certifications, Veilles: veille, Evenements: evenements, Contact: contact
  };

  /* ── Construction et vie des îles ── */
  function construire(escalier) {
    if (api) return;
    api = escalier;
    const sections = [...document.querySelectorAll('[data-palier]')];
    const iles = api.iles.map((ile, i) => {
      const groupe = new THREE.Group();
      groupe.position.copy(ile.centre);
      groupe.rotation.y = ile.lacet;
      api.scene.add(groupe);
      return { groupe, i, anims: [] };   // anims : (t, dt, camera) => void, jouées quand l'île est proche
    });
    sections.forEach((el, i) => {
      const f = PAR_SECTION[el.id];
      if (!f || !iles[i]) return;
      try { f(iles[i]); } catch (e) { console.warn('[îles]', el.id, e); }
    });
    api.aChaqueImage((t, dt, camera, uCam) => {
      // survol : l'objet se soulève un peu
      for (const c of cliquables) {
        c.actif += ((survole === c ? 1 : 0) - c.actif) * Math.min(1, dt * 8);
        if (!c.fixe) c.racine.scale.setScalar(c.base.ech * (1 + 0.06 * c.actif));
      }
      // seules les îles proches s'animent
      for (const ile of iles) {
        if (Math.abs(ile.i - uCam) > 1.6) continue;
        for (const a of ile.anims) a(t, dt, camera);
      }
    });
  }

  function viser(x, y) {
    if (!api || !cliquables.length) return null;
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, api.camera);
    const hits = ray.intersectObjects(cliquables.map((c) => c.racine), true);
    for (const h of hits) {
      if (h.object.userData.contour) continue;
      let o = h.object;
      while (o) {
        const c = cliquables.find((k) => k.racine === o);
        if (c) return c;
        o = o.parent;
      }
    }
    return null;
  }

  return {
    construire,
    /** Survol : true si un objet des îles est sous le pointeur. */
    survol(x, y) { survole = viser(x, y); return !!survole; },
    /** Clic : déclenche l'action de l'objet visé ; true si quelque chose a été cliqué. */
    cliquer(x, y) {
      const c = viser(x, y);
      if (!c) return false;
      c.action();
      return true;
    }
  };
})();
