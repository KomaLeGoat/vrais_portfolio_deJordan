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
  const ECHELLE = 0.005;             // 1 px de la fenêtre = 5 mm dans le décor
  const POSITION = new THREE.Vector3(-4.1, 2.55, 2.5);   // sur l'île : à gauche, vers la caméra
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
    fermeBtn.setAttribute('aria-label', 'Fermer la fenêtre');
    fermeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    fermeBtn.addEventListener('click', fermer);
    document.body.append(voile, plan);

    sections.forEach((el, i) => {
      if (i === 0 || !api.iles[i]) return;
      const ile = api.iles[i];
      const cadre = document.createElement('div');
      cadre.className = 'fenetre-3d';
      cadre.dataset.pour = el.id;
      cadre.tabIndex = 0;
      cadre.setAttribute('role', 'button');
      cadre.setAttribute('aria-label', `Ouvrir : ${el.dataset.palier}`);
      const indice = document.createElement('span');
      indice.className = 'fenetre-indice';
      indice.textContent = 'Cliquer pour ouvrir';
      el.classList.add('fenetre');
      cadre.append(el, indice);
      camera3d.appendChild(cadre);
      // place dans le décor : à gauche de l'île, tournée vers le point de vue de la caméra
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

    addEventListener('keydown', (e) => { if (e.key === 'Escape' && ouverte && !document.querySelector('.lightbox.open, .proj-modal.open')) fermer(); });
    api.aChaqueImage(maj);
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
      if (a <= 0.01) {
        if (f.cadre.style.display !== 'none') f.cadre.style.display = 'none';
        continue;
      }
      if (f.cadre.style.display === 'none') f.cadre.style.display = '';
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
    f.cadre.classList.add('vide');
    document.documentElement.classList.add('fenetre-ouverte');
    document.body.style.overflow = 'hidden';
    f.el.scrollTop = 0;
    const r1 = f.el.getBoundingClientRect();
    const G = window.gsap;
    if (G && !reduit) {
      G.fromTo(f.el, {
        x: r0.left + r0.width / 2 - (r1.left + r1.width / 2), y: r0.top + r0.height / 2 - (r1.top + r1.height / 2),
        scale: Math.max(0.05, r0.width / r1.width), opacity: 0.5
      }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' });
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
    const r1 = f.el.getBoundingClientRect();
    f.cadre.classList.remove('vide');
    const r0 = f.cadre.getBoundingClientRect();
    f.cadre.classList.add('vide');
    const finir = () => {
      if (G) G.set(f.el, { clearProps: 'transform,opacity' });
      fermeBtn.remove();
      f.el.classList.remove('ouverte');
      f.cadre.prepend(f.el);
      f.cadre.classList.remove('vide');
      document.documentElement.classList.remove('fenetre-ouverte');
      document.body.style.overflow = '';
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new CustomEvent('fenetre-fermee', { detail: f.el.id }));
    };
    if (G && !reduit && r0.width > 0) {
      G.to(f.el, {
        x: r0.left + r0.width / 2 - (r1.left + r1.width / 2), y: r0.top + r0.height / 2 - (r1.top + r1.height / 2),
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
