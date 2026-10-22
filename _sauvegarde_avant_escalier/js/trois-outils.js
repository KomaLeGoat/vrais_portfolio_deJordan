/* ══════════════════════════════════════════════════════════════
   OUTILS three.js partagés (hero3d.js, slam3d.js)
   - rendu WebGL robuste (plusieurs tentatives, perte de contexte gérée)
   - chargement des GLB, y compris en double-clic (file://) via les copies .glb.js
   - ombrage « manga » : matériaux toon + contour noir
══════════════════════════════════════════════════════════════ */
window.Trois = (function () {
  if (!window.THREE) return null;
  const fichier = location.protocol === 'file:';
  // En file://, three ne peut pas lire les images du GLB avec fetch(blob:) : on force le chargeur d'images classique
  if (fichier) { try { window.createImageBitmap = undefined; } catch (e) { /* ignoré */ } }

  /* ── Rendu ── */
  function rendu(canvas, surPerte) {
    const essais = [
      { antialias: true, alpha: true },
      { antialias: false, alpha: true },
      { antialias: false, alpha: true, powerPreference: 'low-power' }
    ];
    for (const o of essais) {
      try {
        const r = new THREE.WebGLRenderer(Object.assign({ canvas }, o));
        if (!r.getContext()) continue;
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        r.outputEncoding = THREE.sRGBEncoding;
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.0;
        r.setClearColor(0x000000, 0);
        canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (surPerte) surPerte(); });
        return r;
      } catch (e) {
        console.warn('[3D] WebGL indisponible avec', o, e && e.message);
      }
    }
    return null;
  }

  /* ── Environnement clair (reflets des matériaux brillants) ── */
  function environnement(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const s = new THREE.Scene();
    s.background = new THREE.Color(0xd9d2c6);
    const panneau = (w, h, c, f, p) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(f), side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]);
      m.lookAt(0, 0, 0);
      s.add(m);
    };
    panneau(8, 5, 0xffffff, 2.6, [-4, 5, 6]);
    panneau(4, 9, 0xff4a3a, 1.6, [7, 0, -3]);
    panneau(10, 3, 0xfff1dc, 1.2, [0, -6, 3]);
    const tex = pmrem.fromScene(s, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  /* ── Chargement GLB (http) ou copie base64 (file://, ou si le .glb échoue) ── */
  const chargeur = new THREE.GLTFLoader();
  function glb(chemin, nomGlobal) {
    return new Promise((ok, ko) => {
      const parBase64 = () => {
        const analyser = () => {
          try {
            const bin = atob(window[nomGlobal]);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            chargeur.parse(buf.buffer, '', ok, ko);
          } catch (e) { ko(e); }
        };
        if (window[nomGlobal]) return analyser();
        const s = document.createElement('script');
        s.src = chemin + '.js';
        s.onload = analyser;
        s.onerror = ko;
        document.head.appendChild(s);
      };
      if (fichier) parBase64();
      else chargeur.load(chemin, ok, undefined, parBase64);
    });
  }

  /* ── Ombrage manga ── */
  let rampe = null;
  function degrade() {
    if (rampe) return rampe;
    const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
    rampe = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    rampe.minFilter = rampe.magFilter = THREE.NearestFilter;
    rampe.generateMipmaps = false;
    rampe.needsUpdate = true;
    return rampe;
  }

  function contourMat(ep, couleur) {
    return new THREE.ShaderMaterial({
      uniforms: { uEp: { value: ep }, uCouleur: { value: new THREE.Color(couleur || 0x141414) } },
      vertexShader: 'uniform float uEp; void main(){ vec3 p = position + normalize(normal) * uEp; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 uCouleur; void main(){ gl_FragColor = vec4(uCouleur, 1.0); }',
      side: THREE.BackSide
    });
  }

  /**
   * Convertit un modèle en style manga.
   * options : ep (épaisseur du contour), sansContour(nom) -> bool
   */
  function manga(racine, options) {
    const o = Object.assign({ ep: 0.012, sansContour: () => false }, options || {});
    const contours = [];
    const maillages = [];
    racine.traverse(m => { if (m.isMesh && !m.userData.contour) maillages.push(m); });
    maillages.forEach(m => {
      const anc = m.material;
      const nomMat = (anc.name || '').toLowerCase();
      let neuf;
      if (nomMat.indexOf('flamme') === 0) {
        neuf = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .96, depthWrite: false });
      } else if (nomMat.indexOf('decal') === 0) {
        neuf = new THREE.MeshToonMaterial({ map: anc.map, gradientMap: degrade(), alphaTest: .5, transparent: false });
        neuf.polygonOffset = true;
        neuf.polygonOffsetFactor = -2;
      } else {
        neuf = new THREE.MeshToonMaterial({ color: anc.color.clone(), map: anc.map || null, gradientMap: degrade() });
        if (anc.emissive && (anc.emissive.r + anc.emissive.g + anc.emissive.b) > 0) {
          neuf.emissive = anc.emissive.clone();
          neuf.emissiveIntensity = anc.emissiveIntensity || 1;
        }
        if (nomMat === 'verre') { neuf.transparent = true; neuf.opacity = .93; }
      }
      neuf.name = anc.name;
      m.material = neuf;
      m.userData.matOrigine = neuf;
      const sans = nomMat.indexOf('flamme') === 0 || nomMat.indexOf('decal') === 0 || o.sansContour(m.name, nomMat);
      if (!sans) {
        const c = new THREE.Mesh(m.geometry, contourMat(o.ep));
        c.name = m.name + '__contour';
        c.raycast = () => {};
        c.userData.contour = true;
        m.add(c);
        contours.push(c);
      }
    });
    return contours;
  }

  return { rendu, environnement, glb, manga, contourMat, fichier };
})();
