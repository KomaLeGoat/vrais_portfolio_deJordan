/* ══════════════════════════════════════════════════════════════
   ÎLES — objets 3D posés sur les îles (js/escalier.js)
   Deux îles en portent (et n'ont pas de fenêtre) : « Outils » (cercle de tuiles d'outils autour du
   cristal rouge) et « Certifications » (badges d'arène sur socles). Les autres îles ne gardent que leur
   fenêtre (js/fenetres.js). Les objets réagissent au survol et au clic (tuile qui vient devant,
   certificat qui s'ouvre).
   Données : window.OUTILS (main.js) ; les certifications sont lues dans le HTML (#certGrid).
══════════════════════════════════════════════════════════════ */
window.Iles = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;
  const fichier = location.protocol === 'file:';
  const polices = document.fonts ? document.fonts.ready : Promise.resolve();
  const cliquables = [];      // { racine, action, base: { y, ech }, actif }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // ordre des parties lu tout de suite : js/fenetres.js déplace ensuite les sections dans le décor
  const sections = [...document.querySelectorAll('[data-palier]')];
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

  function mat(couleur, opts = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(couleur), roughness: 0.6 }, opts));
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

  function cliquable(racine, action) {
    const c = { racine, action, base: { y: racine.position.y, ech: racine.scale.x }, actif: 0 };
    cliquables.push(c);
    return c;
  }

  /* ════════ Contenu des îles Outils et Certifications ════════ */

  function outils(ile) {
    const g = ile.groupe;
    const liste = window.OUTILS || [];
    const anneau = new THREE.Group();
    anneau.position.set(0, 1.8, 0.2);
    g.add(anneau);
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 1.1, 24), mat('#cfc3b0', { roughness: 0.85 }));
    pied.position.set(0, 0.55, 0.2);
    g.add(pied);
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat('#ff5a5a', { emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }));
    cristal.position.set(0, 1.55, 0.2);
    g.add(cristal);
    const R = 3.3, n = liste.length;
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.375, 0.06), [
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
      const valide = (el.querySelector('.cert-badge') || {}).textContent || '';
      const eti = etiquette((el.querySelector('.cert-name') || {}).textContent || nomCert, valide, 1.45);
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

  const PAR_SECTION = { Outils: outils, Certifications: certifications };

  /* ── Construction et vie des îles ── */
  function construire(escalier) {
    if (api) return;
    api = escalier;
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
