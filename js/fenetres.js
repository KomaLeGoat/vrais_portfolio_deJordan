/* ══════════════════════════════════════════════════════════════
   FENÊTRES — chaque partie du portfolio est une fenêtre posée dans le décor, sur son île
   (vraie page HTML placée en 3D, même calcul que le CSS3DRenderer de three.js).
   Un clic sur la fenêtre l'agrandit au premier plan, avec tout son contenu ; un clic ailleurs
   (ou Échap, ou la croix) la renvoie à sa place sur l'île.
   Événements envoyés : « fenetre-ouverte » / « fenetre-fermee » (detail : id de la partie).
══════════════════════════════════════════════════════════════ */
window.Fenetres = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;
  const ECHELLE = 0.0062;            // 1 px de la fenêtre = 6,2 mm dans le décor
  const POSITION = new THREE.Vector3(0, 2.95, 1.2);   // sur l'île : au centre, un peu vers la caméra
  const LARGEUR_OUVERTE = 1060;      // largeur de mise en page (px CSS) d'une fenêtre ouverte, avant agrandissement
  const PART_ECRAN = [0.72, 0.8];    // place maximale d'une fenêtre ouverte (largeur, hauteur de l'écran)
  const ZOOM_MAX = 1.3;              // agrandissement maximal du contenu
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let api = null, couche, camera3d, voile, plan, fermeBtn, ouverte = null;
  const fenetres = [];
  const ep = (v) => (Math.abs(v) < 1e-10 ? 0 : v);

  function matriceCamera(m) {
    const e = m.elements;
    return `matrix3d(${ep(e[0])},${ep(-e[1])},${ep(e[2])},${ep(e[3])},${ep(e[4])},${ep(-e[5])},${ep(e[6])},${ep(e[7])},` +
      `${ep(e[8])},${ep(-e[9])},${ep(e[10])},${ep(e[11])},${ep(e[12])},${ep(-e[13])},${ep(e[14])},${ep(e[15])})`;
  }

  function matriceObjet(m) {
    const e = m.elements;
    return `translate(-50%,-50%) matrix3d(${ep(e[0])},${ep(e[1])},${ep(e[2])},${ep(e[3])},${ep(-e[4])},${ep(-e[5])},${ep(-e[6])},${ep(-e[7])},` +
      `${ep(e[8])},${ep(e[9])},${ep(e[10])},${ep(e[11])},${ep(e[12])},${ep(e[13])},${ep(e[14])},${ep(e[15])})`;
  }

  /** sections : les éléments [data-palier] (le premier, l'accueil, reste au premier plan). */
  function installer(escalier, sections) {
    api = escalier;
    couche = document.createElement('div');
    couche.className = 'couche3d';
    camera3d = document.createElement('div');
    camera3d.className = 'camera3d';
    couche.appendChild(camera3d);
    document.body.appendChild(couche);

    voile = document.createElement('div');
    voile.className = 'voile-fenetre';
    voile.addEventListener('click', fermer);
    plan = document.createElement('div');
    plan.className = 'premier-plan';
    plan.addEventListener('click', (e) => { if (e.target === plan) fermer(); });
    fermeBtn = document.createElement('button');
    fermeBtn.className = 'fenetre-fermer';
    fermeBtn.type = 'button';
    fermeBtn.setAttribute('aria-label', I18N.t('fenetres.fermer'));
    fermeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    fermeBtn.addEventListener('click', fermer);
    document.body.append(voile, plan);

    sections.forEach((el, i) => {
      if (i === 0 || !api.iles[i]) return;
      // partie sans fenêtre (Outils, Certifications) : son île porte déjà son contenu en 3D (js/iles.js)
      if (el.hasAttribute('data-sans-fenetre')) { el.classList.add('sans-fenetre'); return; }
      const ile = api.iles[i];
      const cadre = document.createElement('div');
      cadre.className = 'fenetre-3d';
      cadre.dataset.pour = el.id;
      cadre.tabIndex = 0;
      cadre.setAttribute('role', 'button');
      cadre.setAttribute('aria-label', I18N.t('fenetres.ouvrir', { nom: el.dataset.palier }));
      const indice = document.createElement('span');
      indice.className = 'fenetre-indice';
      indice.textContent = I18N.t('fenetres.indice');
      el.classList.add('fenetre');
      cadre.append(el, indice);
      camera3d.appendChild(cadre);
      // place dans le décor : au centre de l'île, tournée vers le point de vue de la caméra
      const support = new THREE.Object3D();
      support.position.copy(POSITION).applyAxisAngle(new THREE.Vector3(0, 1, 0), ile.lacet).add(ile.centre);
      const vise = ile.vue.clone();
      vise.y = support.position.y;
      support.lookAt(vise);
      support.scale.setScalar(ECHELLE);
      support.updateMatrixWorld();
      const f = { el, cadre, support, i, y0: support.position.y, ph: i * 1.7 };
      cadre.addEventListener('click', () => ouvrir(f));
      cadre.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(f); } });
      fenetres.push(f);
    });

    addEventListener('resize', () => { if (ouverte) enGrand(ouverte.el); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && ouverte && !document.querySelector('.lightbox.open, .proj-modal.open')) fermer(); });
    api.aChaqueImage(maj);
  }

  /** Fenêtre ouverte agrandie pour la projection (sans prendre tout l'écran) : même mise en page qu'avant,
      agrandie d'un coup avec `zoom` (texte, cartes, grilles). Renvoie le facteur d'agrandissement. */
  function enGrand(el) {
    const k = Math.max(1, Math.min(ZOOM_MAX, (innerWidth * PART_ECRAN[0]) / LARGEUR_OUVERTE));
    el.style.zoom = k;
    el.style.width = `${Math.round(Math.min(LARGEUR_OUVERTE, (innerWidth * PART_ECRAN[0]) / k))}px`;
    el.style.maxHeight = `${Math.round((innerHeight * PART_ECRAN[1]) / k)}px`;
    return k;
  }

  /** À chaque image : la couche HTML suit la caméra three.js. */
  function maj(t, dt, camera, uCam) {
    const W = innerWidth, H = innerHeight;
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const fov = camera.projectionMatrix.elements[5] * H / 2;
    couche.style.perspective = `${fov}px`;
    camera3d.style.width = `${W}px`;
    camera3d.style.height = `${H}px`;
    camera3d.style.transform = `translateZ(${fov}px)${matriceCamera(camera.matrixWorldInverse)}translate(${W / 2}px,${H / 2}px)`;
    for (const f of fenetres) {
      // seules les fenêtres de l'île où l'on est (et des voisines, en fondu) sont dans le décor
      const d = Math.abs(f.i - uCam);
      const a = 1 - Math.min(1, Math.max(0, (d - 0.35) / 0.55));
      // cachée par visibility (et non display: none) : la fenêtre garde sa mise en page, et elle n'est pas
      // recalculée d'un coup quand elle réapparaît en plein vol (à-coup pendant la descente)
      if (a <= 0.01) {
        if (f.cadre.style.visibility !== 'hidden') f.cadre.style.visibility = 'hidden';
        continue;
      }
      if (f.cadre.style.visibility === 'hidden') f.cadre.style.visibility = '';
      f.cadre.style.opacity = a.toFixed(3);
      f.support.position.y = f.y0 + (reduit ? 0 : Math.sin(t * 1.1 + f.ph) * 0.05);
      f.support.updateMatrixWorld();
      f.cadre.style.transform = matriceObjet(f.support.matrixWorld);
    }
  }

  /* ── Ouvrir : la fenêtre quitte le décor et vient au premier plan (animation depuis sa place) ── */
  function ouvrir(f) {
    if (ouverte || !f) return;
    ouverte = f;
    const r0 = f.cadre.getBoundingClientRect();
    plan.appendChild(f.el);
    f.el.prepend(fermeBtn);
    f.el.classList.add('ouverte');
    const k = enGrand(f.el);
    f.cadre.classList.add('vide');
    document.documentElement.classList.add('fenetre-ouverte');
    document.body.style.overflow = 'hidden';
    f.el.scrollTop = 0;
    const r1 = f.el.getBoundingClientRect();
    const G = window.gsap;
    if (G && !reduit) {
      // (avec zoom, un déplacement de 1 px CSS en fait k à l'écran)
      // pas de défilement pendant l'animation : défiler une fenêtre encore transformée laisse le contenu
      // déborder du cadre dans Chrome
      f.el.style.overflow = 'hidden';
      G.fromTo(f.el, {
        x: (r0.left + r0.width / 2 - (r1.left + r1.width / 2)) / k, y: (r0.top + r0.height / 2 - (r1.top + r1.height / 2)) / k,
        scale: Math.max(0.05, r0.width / r1.width), opacity: 0.5
      }, {
        x: 0, y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out',
        // une fois ouverte, plus de transformation : sinon Chrome laisse déborder le contenu quand on défile dedans
        onComplete: () => { G.set(f.el, { clearProps: 'transform,opacity' }); f.el.style.overflow = ''; }
      });
      G.to(voile, { opacity: 1, duration: 0.5 });
    } else voile.style.opacity = 1;
    window.dispatchEvent(new Event('resize'));   // le SLAM 3D, le Pokédex… se recalent à leur vraie taille
    window.dispatchEvent(new CustomEvent('fenetre-ouverte', { detail: f.el.id }));
  }

  /* ── Fermer : elle rapetisse vers sa place dans le décor, puis y retourne ── */
  function fermer() {
    const f = ouverte;
    if (!f) return;
    ouverte = null;
    const G = window.gsap;
    const k = parseFloat(f.el.style.zoom) || 1;
    if (G) G.killTweensOf(f.el);
    const r1 = f.el.getBoundingClientRect();
    f.cadre.classList.remove('vide');
    const r0 = f.cadre.getBoundingClientRect();
    f.cadre.classList.add('vide');
    const finir = () => {
      if (G) G.set(f.el, { clearProps: 'transform,opacity' });
      fermeBtn.remove();
      f.el.classList.remove('ouverte');
      f.el.style.zoom = f.el.style.width = f.el.style.maxHeight = f.el.style.overflow = '';
      f.cadre.prepend(f.el);
      f.cadre.classList.remove('vide');
      document.documentElement.classList.remove('fenetre-ouverte');
      document.body.style.overflow = '';
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new CustomEvent('fenetre-fermee', { detail: f.el.id }));
    };
    if (G && !reduit && r0.width > 0) {
      G.to(f.el, {
        x: (r0.left + r0.width / 2 - (r1.left + r1.width / 2)) / k, y: (r0.top + r0.height / 2 - (r1.top + r1.height / 2)) / k,
        scale: Math.max(0.05, r0.width / r1.width), opacity: 0.2, duration: 0.5, ease: 'power3.inOut', onComplete: finir
      });
      G.to(voile, { opacity: 0, duration: 0.45 });
    } else { voile.style.opacity = 0; finir(); }
  }

  return {
    installer,
    ouvrir(id) { const f = fenetres.find((x) => x.el.id === id); if (f) ouvrir(f); },
    fermer,
    estOuverte: () => !!ouverte
  };
})();
