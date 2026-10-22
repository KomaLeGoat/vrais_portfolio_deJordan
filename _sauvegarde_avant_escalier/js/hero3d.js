/* ══════════════════════════════════════════════════════════════
   HERO 3D — Poké Ball scellée + ses 4 compagnons
   Modèles Blender : _outils/pokeball.py et _outils/creatures.py
   Clic sur la balle : Pyrax, Lugulabre, Mentali et Komasan sortent,
   la balle se place au-dessus d'eux en plus petit ; re-clic : ils rentrent.
══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('hero3d');
  const hero = document.getElementById('Accueil');
  const astuce = document.getElementById('heroAstuce');
  const astuceTexte = document.getElementById('heroAstuceTexte');
  const boiteEtiquettes = document.getElementById('etiquettes');
  if (!canvas || !hero || !window.Trois) return;
  const G = window.gsap;

  const renderer = Trois.rendu(canvas, () => {
    // contexte WebGL perdu (changement de carte graphique, veille…) : on revient à l'image
    hero.classList.remove('pret3d');
    canvas.style.visibility = 'hidden';
  });
  if (!renderer) { canvas.remove(); if (astuce) astuce.remove(); return; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7);
  scene.environment = Trois.environnement(renderer);

  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xcdb9a6, 0.85));
  const cle = new THREE.DirectionalLight(0xffffff, 1.15);
  cle.position.set(-3, 5, 6);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0xff4a3a, 0.9);
  contre.position.set(3, 2, -4);
  scene.add(contre);
  const eclat = new THREE.PointLight(0xff2a2a, 0, 6, 2);
  scene.add(eclat);

  /* monde (placement selon l'écran) > support (position/taille de la balle) > balle (rotations) */
  const monde = new THREE.Group();
  const support = new THREE.Group();
  const balle = new THREE.Group();
  support.add(balle);
  monde.add(support);
  scene.add(monde);

  /* ── Aura d'énergie occulte : flammes d'encre et de rouge derrière la balle ── */
  const auraMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTemps: { value: 0 }, uForce: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uTemps; uniform float uForce; varying vec2 vUv;
      vec2 h2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
      float bruit(vec2 p){
        vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(dot(h2(i),f), dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),
                   mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)), dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
      }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*bruit(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){
        vec2 p = vUv*2.0-1.0;
        float r = length(p);
        float R0 = 0.33;
        vec2 q = vec2(p.x*2.4, p.y*1.5 - uTemps*0.7);
        float n = fbm(q*1.5 + vec2(fbm(q*1.9 + uTemps*0.12), 0.0)*1.4);
        float portee = 0.18 + 0.38*max(p.y, 0.0) + 0.12*uForce;
        float d = (r - R0) / portee;
        float flamme = (n*1.25 + 0.55) * (1.0 - smoothstep(0.0, 1.0, d)) * smoothstep(-0.2, 0.08, r - R0 + 0.02);
        flamme *= 1.0 + 0.8*uForce;
        float a = smoothstep(0.30, 0.62, flamme);
        vec3 rouge = vec3(0.86, 0.06, 0.08);
        vec3 encre = vec3(0.07, 0.02, 0.03);
        vec3 c = mix(rouge, encre, smoothstep(0.5, 0.9, flamme));
        float halo = exp(-max(r - R0, 0.0)*6.0) * 0.2 * (1.0 + uForce);
        gl_FragColor = vec4(mix(rouge, c, clamp(a*1.6, 0.0, 1.0)), clamp(a*0.9 + halo*(1.0-a), 0.0, 1.0));
      }`
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), auraMat);
  aura.position.z = -1.3;
  support.add(aura);

  /* ── Cendres qui montent ── */
  const NB = 140;
  const posC = new Float32Array(NB * 3);
  const infoC = new Float32Array(NB * 2);
  function placerCendre(i, partout) {
    const a = Math.random() * Math.PI * 2;
    const rr = 0.9 + Math.random() * 1.4;
    posC[i * 3] = Math.cos(a) * rr;
    posC[i * 3 + 1] = partout ? -2 + Math.random() * 4.5 : -1.7 - Math.random() * 0.5;
    posC[i * 3 + 2] = Math.sin(a) * rr * 0.6;
    infoC[i * 2] = 0.25 + Math.random() * 0.55;
    infoC[i * 2 + 1] = Math.random() * 10;
  }
  for (let i = 0; i < NB; i++) placerCendre(i, true);
  const geoC = new THREE.BufferGeometry();
  geoC.setAttribute('position', new THREE.BufferAttribute(posC, 3));
  const cendres = new THREE.Points(geoC, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTaille: { value: 30 * renderer.getPixelRatio() } },
    vertexShader: `uniform float uTaille; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uTaille / -mv.z;
        vA = clamp(1.0 - (position.y + 1.7) / 4.5, 0.0, 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(mix(vec3(0.85,0.07,0.09), vec3(0.12,0.02,0.03), d*1.6), a * vA * 0.75); }`
  }));
  monde.add(cendres);

  /* ── Talismans qui flottent en arrière-plan ── */
  const talismans = [];
  const chargeurTex = new THREE.TextureLoader();
  for (let i = 0; i < 7; i++) {
    const tex = chargeurTex.load(`images/ofuda_${(i % 3) + 1}.webp`);
    tex.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.08),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    m.userData = { x: 0.4 + Math.random() * 3.6, y: (Math.random() - .5) * 4, z: -2.2 - Math.random() * 2.2, v: .08 + Math.random() * .1, ph: Math.random() * 10 };
    scene.add(m);
    talismans.push(m);
  }

  /* ── État ── */
  let etat = 'chargement'; // chargement | fermee | anim | dehors
  let bouton = null;
  const pendants = [];
  const creatures = {};
  const ORDRE = ['pyrax', 'lugulabre', 'mentali', 'komasan'];
  const NOMS = { pyrax: 'Pyrax', lugulabre: 'Lugulabre', mentali: 'Mentali', komasan: 'Komasan' };
  const POSES = {
    pyrax: { p: [-1.02, 0.2, -0.8], s: 0.98 },
    lugulabre: { p: [1.22, 0.22, -0.8], s: 0.92 },
    mentali: { p: [-0.72, -1.3, 0.45], s: 1.05 },
    komasan: { p: [0.74, -1.3, 0.45], s: 0.98 }
  };
  const BALLE_DEHORS = { p: [0, 1.45, 0], s: 0.38 };
  let largeurRang = 1;
  const effets = [];

  /* ── Chargement de la Poké Ball ── */
  Trois.glb('assets/3d/pokeball.glb', 'POKEBALL_GLB').then(gltf => {
    const m = gltf.scene;
    m.traverse(o => {
      if (!o.isMesh) return;
      o.material.envMapIntensity = 0.75;
      if (o.material.map) o.material.map.anisotropy = 8;
      if (o.name.indexOf('ofuda_pendant') === 0) {
        o.geometry = o.geometry.clone();
        pendants.push(preparerPendant(o, pendants.length));
      }
      if (o.name === 'bouton') { bouton = o; o.material = o.material.clone(); }
      if (/^coque|^bague_noire/.test(o.name)) {
        const c = new THREE.Mesh(o.geometry, Trois.contourMat(0.018));
        c.raycast = () => {};
        o.add(c);
      }
    });
    balle.add(m);
    support.scale.setScalar(0.001);
    hero.classList.add('pret3d');
    etat = 'fermee';
    if (G) G.to(support.scale, { x: 1, y: 1, z: 1, duration: 1.2, delay: .2, ease: 'elastic.out(1, .55)' });
    else support.scale.setScalar(1);
    setTimeout(() => { if (etat === 'fermee') astuce.classList.add('visible'); }, 1800);
  }).catch(e => console.warn('[3D] Poké Ball non chargée, image de secours affichée', e));

  function preparerPendant(mesh, k) {
    const pos = mesh.geometry.attributes.position;
    const base = Float32Array.from(pos.array);
    let minY = 0;
    for (let i = 0; i < pos.count; i++) minY = Math.min(minY, base[i * 3 + 1]);
    let ox = 0, oz = 0;
    for (let i = 0; i < pos.count; i++) if (base[i * 3 + 1] < minY + 0.01) { ox += base[i * 3]; oz += base[i * 3 + 2]; }
    const l = Math.hypot(ox, oz) || 1;
    return { mesh, base, h: -minY || 1, phase: k * 2.1, ox: ox / l, oz: oz / l };
  }

  /* ── Chargement des créatures (illustrations officielles gonflées en 3D dans Blender) ──
     Animation dans le shader : hx/hy = position dans l'illustration (0..1, de gauche à droite / de bas en haut). */
  const DEFORMATIONS = {
    pyrax: `float w = smoothstep(0.18, 0.5, length(vec2(hx - 0.42, hy - 0.5)));
            transformed.z += sin(uTemps * 6.5) * 0.13 * w;
            transformed.y += sin(uTemps * 6.5 + 1.2) * 0.03 * w;`,
    lugulabre: `float f = smoothstep(0.6, 0.95, hy) * (1.0 - smoothstep(0.18, 0.3, abs(hx - 0.5)));
            float f2 = smoothstep(0.5, 0.7, hy) * smoothstep(0.22, 0.38, abs(hx - 0.5));
            transformed.x += sin(uTemps * 9.0 + hy * 18.0) * 0.03 * f + sin(uTemps * 11.0 + hy * 26.0) * 0.015 * f2;`,
    mentali: `float q = smoothstep(0.6, 0.95, hx) * smoothstep(0.25, 0.5, hy);
            transformed.z += sin(uTemps * 2.2 - hy * 3.0) * 0.14 * q;
            transformed.x += sin(uTemps * 1.6) * 0.025 * q;
            float o = smoothstep(0.8, 0.98, hy) * (1.0 - smoothstep(0.3, 0.5, hx));
            transformed.z += pow(max(0.0, sin(uTemps * 1.7)), 14.0) * 0.06 * o;`,
    komasan: `float s = smoothstep(0.7, 0.95, hy) * (1.0 - smoothstep(0.42, 0.6, hx));
            transformed.x += sin(uTemps * 7.0 + hy * 14.0) * 0.025 * s;
            float q = smoothstep(0.55, 0.7, hx) * (1.0 - smoothstep(0.3, 0.38, hy)) * smoothstep(0.12, 0.18, hy);
            transformed.z += sin(uTemps * 5.0) * 0.04 * q;`
  };
  const uTempsCreatures = { value: 0 };

  function materiauOfficiel(tex, dim, code) {
    // couleurs fidèles à l'illustration : surtout « émissif », un peu d'éclairage pour sentir le volume
    const m = new THREE.MeshLambertMaterial({
      map: tex, color: new THREE.Color(0.22, 0.22, 0.22),
      emissiveMap: tex, emissive: new THREE.Color(0.64, 0.64, 0.64),
      alphaTest: 0.5, toneMapped: false
    });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTemps = uTempsCreatures;
      sh.uniforms.uDim = { value: dim };
      sh.vertexShader = 'uniform float uTemps; uniform vec2 uDim;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
         float hx = position.x / uDim.x + 0.5;
         float hy = position.y / uDim.y;
         ${code}`);
    };
    return m;
  }

  // silhouette lumineuse (blanche à la sortie, rouge au rappel) qui garde la forme exacte du personnage
  function materiauSilhouette(tex) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uCouleur: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 uCouleur; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(uCouleur, 1.0); }'
    });
  }

  Trois.glb('assets/3d/creatures.glb', 'CREATURES_GLB').then(gltf => {
    ORDRE.forEach(nom => {
      const mesh = gltf.scene.getObjectByName(nom);
      if (!mesh || !mesh.isMesh) return;
      const tex = mesh.material.map;
      if (tex) tex.anisotropy = 8;
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const dim = new THREE.Vector2(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
      const c = {
        nom, mesh, racine: mesh, haut: bb.max.y, saut: 0, tour: 0, regard: 0,
        matTex: materiauOfficiel(tex, dim, DEFORMATIONS[nom]), matSil: materiauSilhouette(tex)
      };
      mesh.material = c.matTex;
      mesh.position.set(0, 0, 0);
      const env = new THREE.Group();
      env.add(mesh);
      env.visible = false;
      monde.add(env);
      c.env = env;
      const et = document.createElement('div');
      et.className = 'etiquette';
      et.textContent = NOMS[nom];
      boiteEtiquettes.appendChild(et);
      c.etiquette = et;
      creatures[nom] = c;
    });
  }).catch(e => console.warn('[3D] créatures non chargées', e));

  /* ── Placement selon la taille de l'écran ── */
  let largeur = 1, hauteur = 1;
  function disposer() {
    largeur = hero.clientWidth;
    hauteur = hero.clientHeight;
    renderer.setSize(largeur, hauteur, false);
    camera.aspect = largeur / hauteur;
    camera.updateProjectionMatrix();
    const demiH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const demiW = demiH * camera.aspect;
    let e;
    if (camera.aspect > 1.05) {
      monde.position.set(demiW * 0.46, 0.08, 0);
      e = Math.min(0.95, demiW * 0.27);
    } else {
      monde.position.set(0, demiH * 0.47, 0);
      e = Math.min(0.72, demiW * 0.5);
    }
    monde.scale.setScalar(e);
    // sur écran étroit on resserre le groupe pour que personne ne sorte du cadre
    largeurRang = Math.max(0.5, Math.min(1, (demiW / e - 0.3) / 2.1));
    if (etat === 'dehors') ORDRE.forEach(n => { const c = creatures[n]; if (c) c.env.position.copy(cible(n)); });
  }
  disposer();
  window.addEventListener('resize', disposer);

  function cible(nom) {
    const p = POSES[nom].p;
    return new THREE.Vector3(p[0] * largeurRang, p[1], p[2]);
  }

  /* ── Effets : rayon rouge, éclats ── */
  const geoRayon = new THREE.CylinderGeometry(0.04, 0.04, 1, 8, 1, true);
  geoRayon.translate(0, 0.5, 0);
  geoRayon.rotateX(Math.PI / 2);

  function rayon(de, a, couleur) {
    const m = new THREE.Mesh(geoRayon, new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.95, depthWrite: false }));
    m.position.copy(de);
    m.scale.set(1, 1, de.distanceTo(a));
    monde.add(m);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), a.clone().sub(de).normalize());
    let t = 0;
    effets.push(dt => {
      t += dt;
      m.material.opacity = Math.max(0, 0.95 - t * 2.4);
      m.scale.x = m.scale.y = 1 + t * 3;
      if (t > 0.45) { monde.remove(m); m.material.dispose(); return false; }
      return true;
    });
  }

  function eclats(pos, couleur) {
    const n = 18;
    const p = new Float32Array(n * 3);
    const v = [];
    for (let i = 0; i < n; i++) {
      p.set([pos.x, pos.y + 0.3, pos.z], i * 3);
      const a = Math.random() * Math.PI * 2, b = (Math.random() - .3) * Math.PI;
      v.push(new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) + .4, Math.sin(a) * Math.cos(b)).multiplyScalar(1.2 + Math.random() * 1.4));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: couleur, size: 0.09, transparent: true, depthWrite: false }));
    monde.add(pts);
    let t = 0;
    effets.push(dt => {
      t += dt;
      for (let i = 0; i < n; i++) {
        p[i * 3] += v[i].x * dt; p[i * 3 + 1] += v[i].y * dt; p[i * 3 + 2] += v[i].z * dt;
        v[i].y -= 3 * dt;
      }
      g.attributes.position.needsUpdate = true;
      pts.material.opacity = Math.max(0, 1 - t * 1.8);
      if (t > 0.6) { monde.remove(pts); g.dispose(); pts.material.dispose(); return false; }
      return true;
    });
  }

  function silhouette(c, couleur) {
    if (couleur) {
      c.matSil.uniforms.uCouleur.value.set(couleur);
      c.mesh.material = c.matSil;
    } else {
      c.mesh.material = c.matTex;
    }
  }

  /* ── Sortie : les 4 compagnons quittent la balle ── */
  let coup = 0;
  function sortir(x, y) {
    if (!G || !Object.keys(creatures).length) return;
    etat = 'anim';
    astuce.classList.remove('visible');
    if (window.blackFlash) window.blackFlash(x, y, 0.75);
    coup = 1;
    eclat.position.copy(monde.localToWorld(support.position.clone()));
    G.fromTo(eclat, { intensity: 8 }, { intensity: 0, duration: 1.2, ease: 'power2.out' });
    G.to(balle.rotation, { z: 0.35, duration: 0.07, yoyo: true, repeat: 5, ease: 'sine.inOut', onComplete: () => { balle.rotation.z = 0; } });
    const b = BALLE_DEHORS;
    G.to(support.position, { x: b.p[0], y: b.p[1], z: b.p[2], duration: 1, delay: 0.4, ease: 'power3.inOut' });
    G.to(support.scale, { x: b.s, y: b.s, z: b.s, duration: 1, delay: 0.4, ease: 'power3.inOut' });

    ORDRE.forEach((nom, i) => {
      const c = creatures[nom];
      if (!c) return;
      G.delayedCall(0.3 + i * 0.14, () => {
        const de = support.position.clone();
        const a = cible(nom);
        const s = POSES[nom].s * (camera.aspect < 1 ? 0.8 : 1);
        c.env.visible = true;
        c.env.position.copy(de);
        c.env.scale.setScalar(0.01);
        silhouette(c, 0xffffff);
        rayon(de, a, 0xff2a2a);
        const t = { k: 0 };
        G.to(t, {
          k: 1, duration: 0.7, ease: 'power2.out',
          onUpdate: () => {
            c.env.position.lerpVectors(de, a, t.k);
            c.env.position.y += Math.sin(t.k * Math.PI) * 0.7;
          },
          onComplete: () => { silhouette(c, null); eclats(a, 0xffd84a); c.saut = 0; G.fromTo(c, { saut: 0.25 }, { saut: 0, duration: 0.6, ease: 'bounce.out' }); }
        });
        G.to(c.env.scale, { x: s, y: s, z: s, duration: 0.8, ease: 'back.out(2.2)' });
      });
    });
    G.delayedCall(1.6, () => {
      etat = 'dehors';
      ORDRE.forEach(n => creatures[n] && creatures[n].etiquette.classList.add('visible'));
      astuceTexte.textContent = largeur < 700 ? 'Touche la balle pour les rappeler' : 'Re-clique sur la Poké Ball pour les rappeler';
      astuce.classList.add('visible');
    });
  }

  /* ── Rappel : retour dans la balle ── */
  function rappeler() {
    if (!G) return;
    etat = 'anim';
    astuce.classList.remove('visible');
    coup = 0.6;
    ORDRE.forEach((nom, i) => {
      const c = creatures[nom];
      if (!c) return;
      c.etiquette.classList.remove('visible');
      G.delayedCall(i * 0.1, () => {
        silhouette(c, 0xff2a2a);
        const de = c.env.position.clone();
        rayon(support.position.clone(), de, 0xff2a2a);
        const t = { k: 0 };
        G.to(t, { k: 1, duration: 0.45, ease: 'power2.in', onUpdate: () => c.env.position.lerpVectors(de, support.position, t.k) });
        G.to(c.env.scale, {
          x: 0.01, y: 0.01, z: 0.01, duration: 0.45, ease: 'power2.in',
          onComplete: () => { c.env.visible = false; silhouette(c, null); }
        });
      });
    });
    G.to(support.position, { x: 0, y: 0, z: 0, duration: 0.9, delay: 0.6, ease: 'back.out(1.6)' });
    G.to(support.scale, {
      x: 1, y: 1, z: 1, duration: 0.9, delay: 0.6, ease: 'back.out(1.6)',
      onComplete: () => { etat = 'fermee'; astuceTexte.textContent = 'Clique sur la Poké Ball…'; }
    });
  }

  function sauter(c) {
    if (!G) return;
    G.killTweensOf(c);
    G.to(c, { saut: 0.35, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 });
    G.fromTo(c, { tour: 0 }, { tour: Math.PI * 2, duration: 0.7, ease: 'power3.out' });
    eclats(c.env.position, 0xff2a2a);
  }

  /* ── Pointeur : survol, glisser (balle fermée), clic ── */
  const souris = { x: 0, y: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let vitesseY = 0, glisse = null, survolee = null;

  function viser(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(balle, true).length) return 'balle';
    if (etat === 'dehors') {
      for (const n of ORDRE) {
        const c = creatures[n];
        if (c && c.env.visible && ray.intersectObject(c.env, true).length) return c;
      }
    }
    return null;
  }

  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    souris.x = (e.clientX - r.left) / r.width * 2 - 1;
    souris.y = (e.clientY - r.top) / r.height * 2 - 1;
    if (glisse) {
      const dx = e.clientX - glisse.x;
      glisse.x = e.clientX;
      glisse.dist += Math.abs(dx);
      balle.rotation.y += dx * 0.012;
      vitesseY = dx * 0.7;
    } else if (e.pointerType === 'mouse') {
      const v = viser(e.clientX, e.clientY);
      canvas.classList.toggle('survol', !!v);
      if (survolee && survolee !== v && survolee.etiquette) survolee.etiquette.classList.remove('survol');
      survolee = v && v.etiquette ? v : null;
      if (survolee) survolee.etiquette.classList.add('survol');
    }
  });

  canvas.addEventListener('pointerdown', e => {
    glisse = { x: e.clientX, dist: 0 };
  });
  // l'action se fait au « click » (fiable au doigt comme à la souris), sauf si on vient de faire glisser la balle
  let dernierGlisse = 0;
  canvas.addEventListener('pointerup', () => { dernierGlisse = glisse ? glisse.dist : 0; glisse = null; });
  canvas.addEventListener('pointercancel', () => { glisse = null; });
  canvas.addEventListener('click', e => {
    if (dernierGlisse >= 8) { dernierGlisse = 0; return; }
    const v = viser(e.clientX, e.clientY);
    if (v === 'balle') {
      if (etat === 'fermee') sortir(e.clientX, e.clientY);
      else if (etat === 'dehors') rappeler();
    } else if (v && etat === 'dehors') sauter(v);
  });

  /* ── Boucle ── */
  let visible = true;
  new IntersectionObserver(ent => { visible = ent[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  let precedent = performance.now();
  let temps = 0;
  const vTmp = new THREE.Vector3();

  function image(now) {
    requestAnimationFrame(image);
    if (!visible || document.hidden) { precedent = now; return; }
    const dt = Math.min(0.05, Math.max(0.001, (now - precedent) / 1000));
    precedent = now;
    temps += dt;
    const p = Math.min(1, window.scrollY / Math.max(1, hauteur));

    // balle : rotation lente + inertie du glisser, flottement
    if (!glisse) {
      balle.rotation.y += (vitesseY + 0.3) * dt;
      vitesseY *= Math.pow(0.05, dt);
    }
    balle.rotation.x = 0.12 + souris.y * 0.12;
    balle.position.y = Math.sin(temps * 1.3) * 0.07;
    monde.rotation.y += (souris.x * 0.18 - monde.rotation.y) * Math.min(1, dt * 3);
    monde.rotation.x += (p * 0.5 - monde.rotation.x) * Math.min(1, dt * 3);
    aura.rotation.set(-monde.rotation.x, -monde.rotation.y, 0);

    coup = Math.max(0, coup - dt * 1.2);
    auraMat.uniforms.uTemps.value = temps;
    auraMat.uniforms.uForce.value = coup * 1.6 + 0.12 * Math.sin(temps * 2.1);
    if (bouton) bouton.material.emissiveIntensity = 1.2 + 0.7 * Math.sin(temps * 2.6) + coup * 10;

    // talismans pendants
    const vent = Math.min(1.6, Math.abs(vitesseY) * 0.06) + coup;
    pendants.forEach(pd => {
      const pos = pd.mesh.geometry.attributes.position;
      const a = pos.array, b = pd.base;
      for (let i = 0; i < pos.count; i++) {
        const t = Math.min(1, -b[i * 3 + 1] / pd.h);
        const t2 = t * t;
        a[i * 3] = b[i * 3] + Math.sin(temps * 2.4 + pd.phase - t * 3.2) * 0.07 * t2 + pd.ox * vent * 0.45 * t2;
        a[i * 3 + 1] = b[i * 3 + 1] + vent * 0.25 * t2;
        a[i * 3 + 2] = b[i * 3 + 2] + Math.cos(temps * 1.9 + pd.phase - t * 2.6) * 0.05 * t2 + pd.oz * vent * 0.45 * t2;
      }
      pos.needsUpdate = true;
      pd.mesh.geometry.computeVertexNormals();
    });

    // cendres
    for (let i = 0; i < NB; i++) {
      posC[i * 3 + 1] += infoC[i * 2] * dt * (1 + coup * 3);
      posC[i * 3] += Math.sin(temps * 1.5 + infoC[i * 2 + 1]) * dt * 0.12;
      if (posC[i * 3 + 1] > 2.8) placerCendre(i, false);
    }
    geoC.attributes.position.needsUpdate = true;

    // talismans d'arrière-plan
    const opaciteTal = etat === 'dehors' || etat === 'anim' ? 0.16 : 0.55;
    talismans.forEach(m => {
      const u = m.userData;
      m.visible = camera.aspect > 1.05; // sur téléphone ils passeraient devant le texte
      m.material.opacity += (opaciteTal - m.material.opacity) * Math.min(1, dt * 3);
      u.y += u.v * dt;
      if (u.y > 2.6) { u.y = -2.6; u.x = 0.4 + Math.random() * 3.6; }
      m.position.set(u.x + Math.sin(temps * .4 + u.ph) * .3, u.y, u.z);
      m.rotation.set(Math.sin(temps * .5 + u.ph) * .3, temps * .2 + u.ph, Math.sin(temps * .7 + u.ph) * .25);
    });

    // compagnons
    uTempsCreatures.value = temps;
    const dehors = etat === 'dehors' || etat === 'anim';
    if (dehors) {
      ORDRE.forEach((n, i) => {
        const c = creatures[n];
        if (!c || !c.env.visible) return;
        const r = c.racine;
        c.regard += ((souris.x * 0.5 - (c.env.position.x * 0.12)) - c.regard) * Math.min(1, dt * 2.5);
        r.rotation.y = c.regard + c.tour;
        r.rotation.x = souris.y * 0.08;
        if (n === 'pyrax') {
          r.position.y = 0.06 * Math.sin(temps * 2.2) + c.saut;
        } else if (n === 'lugulabre') {
          r.position.y = 0.05 * Math.sin(temps * 1.6 + 1) + c.saut;
          r.rotation.z = 0.04 * Math.sin(temps * 1.1);
        } else if (n === 'mentali') {
          r.position.y = c.saut;
          r.scale.y = 1 + 0.015 * Math.sin(temps * 2.4);
        } else if (n === 'komasan') {
          const rebond = Math.abs(Math.sin(temps * 3.2));
          r.position.y = rebond * 0.05 + c.saut;
          r.scale.set(1 + 0.02 * (1 - rebond), 1 - 0.025 * (1 - rebond), 1);
        }
        // étiquette au-dessus de la tête
        if (c.etiquette.classList.contains('visible')) {
          vTmp.set(0, c.haut + 0.12, 0);
          c.env.localToWorld(vTmp);
          vTmp.project(camera);
          const x = (vTmp.x + 1) / 2 * largeur;
          const y = (1 - vTmp.y) / 2 * hauteur;
          c.etiquette.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        }
      });
    }

    for (let i = effets.length - 1; i >= 0; i--) if (!effets[i](dt)) effets.splice(i, 1);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(image);
})();
