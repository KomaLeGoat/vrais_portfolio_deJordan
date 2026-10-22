/* ══════════════════════════════════════════════════════════════
   FORMATION — le mot « SLAM » en 3D (modèle Blender : _outils/slam.py)
   Les lettres tombent en rebondissant à l'arrivée, ondulent, suivent la souris ;
   un clic sur une lettre la fait sauter et tourner.
══════════════════════════════════════════════════════════════ */
(function () {
  const boite = document.getElementById('slam3dBoite');
  const canvas = document.getElementById('slam3d');
  if (!boite || !canvas || !window.Trois) return;
  const G = window.gsap;

  const renderer = Trois.rendu(canvas, () => { boite.classList.remove('pret3d'); canvas.style.visibility = 'hidden'; });
  if (!renderer) { canvas.remove(); return; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.1, 50);
  camera.position.set(0, 0.36, 3.4);
  camera.lookAt(0, 0.33, 0);
  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xcdb9a6, 0.9));
  const cle = new THREE.DirectionalLight(0xffffff, 1.0);
  cle.position.set(-2, 3, 4);
  scene.add(cle);

  const groupe = new THREE.Group();
  scene.add(groupe);
  const lettres = [];
  let entree = false;

  Trois.glb('assets/3d/slam.glb', 'SLAM_GLB').then(gltf => {
    Trois.manga(gltf.scene, { ep: 0.012 });
    const objets = [];
    gltf.scene.children.slice().forEach(o => objets.push(o));
    objets.sort((a, b) => a.position.x - b.position.x);
    objets.forEach((o, i) => {
      groupe.add(o);
      lettres.push({ o, x: o.position.x, y: o.position.y, saut: 0, tour: 0, i });
      o.position.y = 2.2;
      o.rotation.x = -1.4;
    });
    boite.classList.add('pret3d');
    if (dansLaVue) lancerEntree();
  }).catch(e => console.warn('[3D] SLAM non chargé', e));

  function lancerEntree() {
    if (entree || !lettres.length) return;
    entree = true;
    lettres.forEach((l, i) => {
      if (G) {
        G.to(l.o.position, { y: l.y, duration: 1.1, delay: 0.15 + i * 0.12, ease: 'bounce.out' });
        G.to(l.o.rotation, { x: 0, duration: 1.1, delay: 0.15 + i * 0.12, ease: 'power3.out' });
      } else {
        l.o.position.y = l.y;
        l.o.rotation.x = 0;
      }
    });
  }

  function disposer() {
    const w = boite.clientWidth, h = boite.clientHeight;
    // fenêtre ouverte en grand (zoom CSS, js/fenetres.js) : plus de pixels pour rester net
    const k = Math.max(1, boite.getBoundingClientRect().width / Math.max(1, w));
    renderer.setSize(Math.round(w * k), Math.round(h * k), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  disposer();
  window.addEventListener('resize', disposer);

  /* ── Pointeur ── */
  const souris = { x: 0, y: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function lettreSous(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(lettres.map(l => l.o), true)[0];
    if (!h) return null;
    return lettres.find(l => { let o = h.object; while (o) { if (o === l.o) return true; o = o.parent; } return false; });
  }
  boite.addEventListener('pointermove', e => {
    const r = boite.getBoundingClientRect();
    souris.x = (e.clientX - r.left) / r.width * 2 - 1;
    souris.y = (e.clientY - r.top) / r.height * 2 - 1;
  });
  boite.addEventListener('pointerleave', () => { souris.x = 0; souris.y = 0; });
  canvas.addEventListener('click', e => {
    const l = lettreSous(e);
    if (!l || !G) return;
    G.killTweensOf(l);
    G.to(l, { saut: 0.45, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 });
    G.fromTo(l, { tour: 0 }, { tour: Math.PI * 2, duration: 0.8, ease: 'power3.out' });
  });

  /* ── Boucle (seulement quand la section est visible) ── */
  let dansLaVue = false;
  new IntersectionObserver(ent => {
    dansLaVue = ent[0].isIntersecting;
    if (dansLaVue) lancerEntree();
  }, { threshold: 0.25 }).observe(boite);

  let t = 0, prec = performance.now();
  (function image(now) {
    requestAnimationFrame(image);
    const dt = Math.min(0.05, (now - prec) / 1000);
    prec = now;
    if (!dansLaVue || document.hidden) return;
    t += dt;
    groupe.rotation.y += (souris.x * 0.45 - groupe.rotation.y) * Math.min(1, dt * 4);
    groupe.rotation.x += (souris.y * 0.25 - groupe.rotation.x) * Math.min(1, dt * 4);
    lettres.forEach(l => {
      const actif = !G || !G.isTweening(l.o.position);
      if (actif) l.o.position.y = l.y + Math.sin(t * 2.2 - l.i * 0.8) * 0.04 + l.saut;
      l.o.rotation.y = Math.sin(t * 1.4 - l.i * 0.6) * 0.12 + l.tour;
    });
    renderer.render(scene, camera);
  })(prec);
})();
