/* ══════════════════════════════════════════════════════════════
   DÉCOR RÉEL — les briques photo-réalistes du décor (utilisées par js/escalier.js)
   - îles de roche : falaises en strates qui se resserrent vers le bas, mousse au bord, herbe dessus
   - ciel : deux vrais ciels photographiés (coucher de soleil -> crépuscule), en fondu, + étoiles
   - mer de nuages : un relief de nuages calculé sur la carte graphique, éclairé par le soleil
   Ressources : Poly Haven (CC0). Textures 2K dans assets/decor/reel/ (_outils/decor_textures_reel.py),
   ciels dans assets/decor/ciel/ (_outils/decor_ciel.py). En double-clic (file://), pas de textures :
   le décor garde ses couleurs de base.
   GLSL : ASCII seulement (pas d'accents, même en commentaire).
══════════════════════════════════════════════════════════════ */
window.DecorReel = (function () {
  const THREE = window.THREE;
  if (!THREE) return null;
  const fichier = location.protocol === 'file:';
  const chargeur = new THREE.TextureLoader();
  let ANISO = 4;

  /* ── Bruit 3D (géométrie des îles) ── */
  function hash3(x, y, z) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function bruit3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const l = (a, b, k) => a + (b - a) * k;
    const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
      l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  function fbm3(x, y, z, oct = 4) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * bruit3(x * f, y * f, z * f); n += a; f *= 2.03; a *= 0.5; }
    return s / n;
  }
  const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ── Textures et matériaux PBR ── */
  const cache = {};
  function tex(nom, carte) {
    if (fichier) return null;
    const cle = nom + '_' + carte;
    if (cache[cle]) return cache[cle];
    const t = chargeur.load(`assets/decor/reel/${cle}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    if (carte === 'couleur') t.encoding = THREE.sRGBEncoding;
    return (cache[cle] = t);
  }
  // couleurs de secours (file://) : proches de la moyenne de chaque texture
  const SECOURS = { falaise: '#8a6a4f', mousse: '#5d5a3c', herbe: '#3f4a26', dalles: '#8d8d88' };
  function materiau(nom, opts = {}) {
    const arm = tex(nom, 'arm');
    return new THREE.MeshStandardMaterial(Object.assign({
      map: tex(nom, 'couleur'), normalMap: tex(nom, 'relief'), roughnessMap: arm, aoMap: arm,
      color: fichier ? new THREE.Color(SECOURS[nom] || '#888') : new THREE.Color(0xffffff),
      roughness: 1, metalness: 0, aoMapIntensity: 0.8
    }, opts));
  }

  /** UV en mètres (taille d'un motif = `motif` m) et copie en uv2 (aoMap). */
  function finirUV(g) {
    g.setAttribute('uv2', new THREE.BufferAttribute(g.attributes.uv.array, 2));
    return g;
  }

  /* ════════ Îles de roche ════════
     o : { rayon (bord de l'esplanade), large (débord d'herbe en plus), profondeur, graine,
           sorties: [angles] (là où l'escalier arrive et part : pas de débord), segments } */
  function geometriesIle(o) {
    const NT = o.segments || 120;
    const R0 = o.rayon, E = o.large, D = o.profondeur, gr = o.graine * 17.3;
    const sorties = o.sorties || [];
    const ecartAngle = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
    // bord de l'île selon l'angle : débord irrégulier, sauf face à l'escalier
    const bord = [];
    for (let i = 0; i <= NT; i++) {
      const th = (i / NT) * Math.PI * 2;
      let porte = 1;
      for (const s of sorties) porte *= lisse(0.16, 0.6, ecartAngle(th, s));
      const n = fbm3(Math.cos(th) * 1.6 + gr, Math.sin(th) * 1.6, gr * 0.3, 3);
      bord.push(R0 + 0.2 + E * porte * (0.35 + 0.9 * n));
    }
    const yBord = -0.38;
    // hauteur du sol d'herbe en (x, z) : petites bosses, et le bord qui s'arrondit vers la falaise
    const hauteurSol = (x, z, rho) => {
      const r = Math.hypot(x, z);
      const hors = lisse(R0 - 0.1, R0 + 0.6, r);
      const bosse = (fbm3(x * 0.45 + gr, 0, z * 0.45, 3) - 0.5) * 0.35 * hors;
      const arrondi = Math.pow(lisse(0.86, 1, rho), 1.6) * (yBord + 0.05);
      return -0.06 + bosse * (1 - lisse(0.9, 1, rho)) + arrondi;
    };
    const bordA = (th) => {
      const f = ((((th / (Math.PI * 2)) % 1) + 1) % 1) * NT, i = Math.floor(f);
      return bord[i] + (bord[i + 1] - bord[i]) * (f - i);
    };

    /* dessus : disque d'herbe (sous l'esplanade, il est caché) */
    const RHO = [0, 0.35, 0.6, 0.72, 0.8, 0.86, 0.9, 0.93, 0.955, 0.975, 0.99, 1];
    const posT = [], uvT = [], idxT = [];
    for (let j = 0; j < RHO.length; j++) {
      for (let i = 0; i <= NT; i++) {
        const th = (i / NT) * Math.PI * 2, r = RHO[j] * bord[i];
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        posT.push(x, hauteurSol(x, z, RHO[j]), z);
        uvT.push(x / 3, z / 3);
      }
    }
    for (let j = 0; j < RHO.length - 1; j++) {
      for (let i = 0; i < NT; i++) {
        const a = j * (NT + 1) + i, b = a + 1, c = a + NT + 1, d = c + 1;
        idxT.push(a, b, c, b, d, c);
      }
    }
    const dessus = new THREE.BufferGeometry();
    dessus.setAttribute('position', new THREE.Float32BufferAttribute(posT, 3));
    dessus.setAttribute('uv', new THREE.Float32BufferAttribute(uvT, 2));
    dessus.setIndex(idxT);
    dessus.computeVertexNormals();
    finirUV(dessus);

    /* dessous : falaises en strates qui se resserrent jusqu'à une pointe */
    const NK = o.anneaux || 34;
    const posS = [], uvS = [], idxMousse = [], idxRoche = [];
    const pointe = [Math.sin(gr) * R0 * 0.3, -D, Math.cos(gr * 1.7) * R0 * 0.3];
    const ventre = 0.6 + 0.35 * fbm3(gr, 1.3, 2.1, 2);         // chaque île a son propre galbe
    for (let k = 0; k <= NK; k++) {
      const t = Math.pow(k / NK, 1.2);
      for (let i = 0; i <= NT; i++) {
        const th = (i / NT) * Math.PI * 2;
        const ct = Math.cos(th), st = Math.sin(th);
        // gros blocs de roche (lobes) + détail ; la profondeur varie autour de l'île
        const n1 = fbm3(ct * 1.1 + gr, t * 2.2, st * 1.1, 4);
        const n2 = fbm3(ct * 3.5 + gr, t * 7, st * 3.5, 3);
        const lobes = fbm3(ct * 0.8 + gr * 2, t * 1.4 + 5, st * 0.8, 2);
        // profil : léger surplomb sous l'herbe, ventre rocheux, puis la pointe
        let forme = Math.pow(1 - t, ventre) * (1 + 0.12 * Math.sin(Math.min(1, t * 3.5) * Math.PI));
        let y = yBord - t * D * (0.7 + 0.6 * lobes);
        // strates : de petites corniches tous les ~1,4 m
        const strate = (y * 0.72 + n1 * 1.3) % 1;
        const corniche = 1 - 0.08 * lisse(0.55, 0.95, strate < 0 ? strate + 1 : strate);
        let r = bord[i] * forme * (0.62 + 0.75 * n1) * (0.8 + 0.4 * lobes) * corniche + (n2 - 0.5) * 0.6 * forme;
        if (k === 0) { r = bord[i] + 0.05; y = yBord + 0.02; }
        let x = ct * r, z = st * r;
        const versPointe = Math.pow(t, 2.4);
        x += (pointe[0] - x) * versPointe; z += (pointe[2] - z) * versPointe;
        posS.push(x, y, z);
        uvS.push(th * (R0 + E * 0.6) / 4.5, y / 4.5);
      }
    }
    const kMousse = Math.round(NK * 0.13);
    for (let k = 0; k < NK; k++) {
      for (let i = 0; i < NT; i++) {
        const a = k * (NT + 1) + i, b = a + 1, c = a + NT + 1, d = c + 1;
        (k < kMousse ? idxMousse : idxRoche).push(a, b, c, b, d, c);
      }
    }
    const dessous = new THREE.BufferGeometry();
    dessous.setAttribute('position', new THREE.Float32BufferAttribute(posS, 3));
    dessous.setAttribute('uv', new THREE.Float32BufferAttribute(uvS, 2));
    dessous.setIndex(idxMousse.concat(idxRoche));
    dessous.addGroup(0, idxMousse.length, 0);
    dessous.addGroup(idxMousse.length, idxRoche.length, 1);
    dessous.computeVertexNormals();
    finirUV(dessous);
    return { dessus, dessous, bord, bordA, hauteurSol };
  }

  function creerIle(o, mats) {
    const g = new THREE.Group();
    const geos = geometriesIle(o);
    const { dessus, dessous } = geos;
    const mDessus = new THREE.Mesh(dessus, mats.herbe);
    const mDessous = new THREE.Mesh(dessous, [mats.mousse, mats.falaise]);
    for (const m of [mDessus, mDessous]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
    if (o.esplanade) {
      // esplanade de dalles : le dessus est exactement à y = 0 (les fenêtres et le contenu s'y posent)
      const geo = new THREE.CylinderGeometry(o.rayon, o.rayon * 0.985, 0.42, 96, 1);
      const uv = geo.attributes.uv, pos = geo.attributes.position, uv0 = uv.array.slice();
      for (const gp of geo.groups) {
        for (let v = gp.start; v < gp.start + gp.count; v++) {
          const i = geo.index.getX(v);
          if (gp.materialIndex === 0) uv.setXY(i, uv0[i * 2] * Math.PI * 2 * o.rayon / 1.5, pos.getY(i) / 1.5);
          else uv.setXY(i, pos.getX(i) / 1.5, pos.getZ(i) / 1.5);
        }
      }
      finirUV(geo);
      const espl = new THREE.Mesh(geo, mats.dalles);
      espl.position.y = -0.21;
      espl.receiveShadow = true;
      espl.castShadow = true;
      g.add(espl);
    }
    if (o.herbe) g.add(creerHerbe(o, geos, mats.uT));
    return g;
  }

  /* ── Herbe : des touffes de brins (7 brins chacune), posées sur la couronne d'herbe, qui ondulent au vent ── */
  let geoTouffe = null;
  function touffe() {
    if (geoTouffe) return geoTouffe;
    const pos = [], col = [], nor = [], idx = [];
    const H = [0, 0.4, 0.75, 1], L = [0.022, 0.018, 0.011, 0.002];
    const NB = 7;
    for (let b = 0; b < NB; b++) {
      const a = (b / NB) * Math.PI * 2 + b * 0.9, ca = Math.cos(a), sa = Math.sin(a);
      // chaque brin part d'un point un peu différent et penche vers l'extérieur de la touffe
      const ox = Math.cos(a * 1.7) * 0.05, oz = Math.sin(a * 1.7) * 0.05;
      const pench = 0.12 + (b % 3) * 0.08, base = pos.length / 3;
      for (let k = 0; k < H.length; k++) {
        const h = H[k], dx = pench * h * h;
        for (const cote of [-1, 1]) {
          pos.push(ox + ca * L[k] * cote + dx * Math.cos(a * 1.7), h * (0.75 + 0.25 * (b % 2)), oz + sa * L[k] * cote + dx * Math.sin(a * 1.7));
          // du pied sombre à la pointe claire
          const c = 0.35 + 0.65 * h;
          col.push(c, c, c);
          nor.push(0, 1, 0);
        }
      }
      for (let k = 0; k < H.length - 1; k++) {
        const v = base + k * 2;
        idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    geoTouffe = new THREE.BufferGeometry();
    geoTouffe.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geoTouffe.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geoTouffe.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geoTouffe.setIndex(idx);
    return geoTouffe;
  }
  let matHerbe = null;
  function materiauHerbe(uT) {
    if (matHerbe) return matHerbe;
    matHerbe = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, envMapIntensity: 0.5 });
    matHerbe.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT || { value: 0 };
      // GLSL : ASCII seulement
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vec4 pied = instanceMatrix * vec4(0., 0., 0., 1.);',
        'float vent = sin(uT * 1.5 + pied.x * .6 + pied.z * .45) * .6 + sin(uT * 2.6 + pied.x * 1.7 - pied.z) * .3;',
        'float hb = position.y * position.y;',
        'transformed.x += vent * hb * .1;',
        'transformed.z += vent * hb * .05;'
      ].join('\n'));
    };
    return matHerbe;
  }
  function creerHerbe(o, geos, uT) {
    const densite = o.densiteHerbe || 22;            // touffes par m²
    const R0 = o.rayon, aire = Math.PI * ((R0 + o.large + 0.2) ** 2 - (R0 + 0.12) ** 2);
    const n = Math.round(aire * densite * 0.75);
    const im = new THREE.InstancedMesh(touffe(), materiauHerbe(uT), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const sec = new THREE.Color(0.42, 0.38, 0.14);
    let gr = Math.floor(o.graine * 3171) % 233280, k = 0, essais = 0;
    const alea = () => { gr = (gr * 9301 + 49297) % 233280; return gr / 233280; };
    while (k < n && essais < n * 4) {
      essais++;
      const th = alea() * Math.PI * 2, bd = geos.bordA(th);
      const r = R0 + 0.12 + Math.sqrt(alea()) * (bd - R0 - 0.35);
      if (r > bd - 0.25) continue;
      const x = Math.cos(th) * r, z = Math.sin(th) * r, rho = r / bd;
      // l'herbe se raréfie vers le bord de la falaise
      if (alea() < lisse(0.88, 0.99, rho)) continue;
      p.set(x, geos.hauteurSol(x, z, rho) - 0.03, z);
      e.set((alea() - 0.5) * 0.25, alea() * Math.PI * 2, (alea() - 0.5) * 0.25);
      const haut = 0.16 + alea() * 0.26, larg = 0.9 + alea() * 0.7;
      m.compose(p, q.setFromEuler(e), sc.set(larg, haut, larg));
      im.setMatrixAt(k, m);
      // verts variés, quelques touffes sèches dorées
      const tache = fbm3(x * 0.6 + o.graine, 3.3, z * 0.6, 2);
      c.setRGB(0.11, 0.19, 0.045).lerp(sec, lisse(0.5, 0.72, tache) * 0.7);
      c.multiplyScalar(0.8 + alea() * 0.4);
      im.setColorAt(k, c);
      k++;
    }
    im.count = k;
    im.receiveShadow = true;
    im.castShadow = false;
    return im;
  }

  /** Rocher flottant (plusieurs formes). */
  function geometrieRocher(graine) {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position, uv = [];
    const gr = graine * 7.7;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = fbm3(x * 1.3 + gr, y * 1.3, z * 1.3, 4);
      const strate = Math.abs(((y * 2.2 + n) % 1)) * 0.06;
      const f = 0.72 + 0.55 * n - strate;
      pos.setXYZ(i, x * f, y * f * 0.7, z * f);
      uv.push(Math.atan2(z, x) * 0.6, y * 0.6);
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return finirUV(geo);
  }

  /** Dalle de pierre (marche) : UV en mètres sur chaque face. */
  function geometrieDalle(l, h, p) {
    const geo = new THREE.BoxGeometry(l, h, p, 1, 1, 1);
    const uv = geo.attributes.uv;
    const tailles = [[p, h], [p, h], [l, p], [l, p], [l, h], [l, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * tailles[f][0] / 1.2, uv.getY(i) * tailles[f][1] / 1.2);
    }
    return finirUV(geo);
  }

  /* ════════ GLSL commun ════════ */
  const GLSL_BRUIT = `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vb(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm5(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vb(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s / .97; }
    float fbm3(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vb(p); p = p * 2.07 + vec2(5.3, 1.9); a *= .5; } return s / .875; }`;

  // Echantillon d un ciel photo (equirectangulaire, du zenith a -25 deg sous l horizon), tourne de uDecal
  const GLSL_CIEL = `
    uniform sampler2D uCoucher, uCrepuscule;
    uniform vec2 uDecal;
    uniform float uMelange;
    vec3 cielDe(sampler2D t, vec3 d, float decal) {
      vec2 hz = d.xz;
      if (dot(hz, hz) < 1e-10) hz = vec2(1e-5, 0.);   // au zenith exact, atan(0, 0) n est pas defini
      float phi = atan(hz.y, hz.x) + decal;
      float u = phi / 6.2831853 + .5;
      float lat = asin(clamp(d.y, -1., 1.)) * 57.29578;
      float v = clamp((lat + 25.) / 115., .002, .998);
      return texture2D(t, vec2(u, v)).rgb;
    }
    vec3 ciel(vec3 d) { return mix(cielDe(uCoucher, d, uDecal.x), cielDe(uCrepuscule, d, uDecal.y), uMelange); }`;

  /* ════════ Le ciel ════════ */
  function texCiel(nom, rappel) {
    const global = window['CIEL_' + nom.toUpperCase()];
    const t = chargeur.load(fichier && global ? global : `assets/decor/ciel/${nom}.jpg`, rappel);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return t;
  }

  /** pourEnv : version qui sert à capturer l'éclairage (PMREM) — couleurs linéaires, encodées par three. */
  function creerCiel(uCommun, pourEnv = false) {
    const u = Object.assign({ uNuit: { value: 0 }, uLineaire: { value: 0 } }, uCommun);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1400, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false, uniforms: u,
      vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `
        uniform float uT, uNuit, uLineaire; varying vec3 vD;
        ${GLSL_CIEL}
        float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vD);
          vec3 c = ciel(d);
          // etoiles, de plus en plus nombreuses au crepuscule
          vec3 e = floor(d * 380.);
          float r = h31(e);
          float et = step(.9975, r) * smoothstep(.06, .4, d.y) * (.55 + .45 * sin(uT * 1.7 + h31(e + 2.) * 40.));
          c += vec3(.92, .94, 1.) * et * uNuit * (.4 + 1.2 * fract(r * 913.));
          if (uLineaire > .5) c = pow(c, vec3(2.2));
          gl_FragColor = vec4(c, 1.);
          ${pourEnv ? '#include <encodings_fragment>' : ''}
        }`
    }));
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return { mesh, uniforms: u };
  }

  /* ════════ La mer de nuages ════════
     Un grand plan subdivise, souleve en relief par du bruit (vertex shader), eclaire par le soleil
     (diffusion douce, lumiere qui traverse face au soleil, creux plus sombres), qui se fond au loin
     dans le ciel photo (meme direction, meme couleur : pas de couture a l horizon). */
  function creerNuages(uCommun, { y = -76, amplitude = 16, taille = 1400, grille = 300 } = {}) {
    const u = Object.assign({
      uCam: { value: new THREE.Vector3() }, uY: { value: y }, uAmp: { value: amplitude },
      uSoleilDir: { value: new THREE.Vector3(0, 1, 0) }, uSoleilCol: { value: new THREE.Color(1, 0.6, 0.3) },
      uAmbiant: { value: new THREE.Color(0.2, 0.2, 0.3) }, uOmbre: { value: new THREE.Color(0.1, 0.08, 0.14) },
      uExpo: { value: 1 }, uBrume: { value: 0.0016 }
    }, uCommun);
    const geo = new THREE.PlaneGeometry(taille, taille, grille, grille);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: u, fog: false, toneMapped: false,
      vertexShader: `
        uniform float uT, uY, uAmp; uniform vec3 uSoleilDir;
        varying vec3 vW; varying float vH; varying vec3 vN; varying float vOmbre;
        ${GLSL_BRUIT}
        // grandes masses (nuage / trouee), puis choux de cumulus arrondis
        float masse(vec2 p) {
          vec2 q = p * .0045 + vec2(uT * .0012, uT * .0005);
          vec2 w = vec2(fbm3(q * .9 + 3.1), fbm3(q * .9 - 1.7));
          return smoothstep(.3, .68, fbm5(q + .5 * w));
        }
        float choux(vec2 p) {
          vec2 q = p * .026 + vec2(uT * .005, uT * .002);
          float b = 1. - abs(fbm3(q) * 2. - 1.);
          return b * b;
        }
        float hauteur(vec2 p) {
          float m = masse(p), c = choux(p);
          return m * (.5 + .5 * c) + .1 * c;
        }
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.);
          float h = hauteur(w.xz);
          float e = 2.5;
          float hx = hauteur(w.xz + vec2(e, 0.)), hz = hauteur(w.xz + vec2(0., e));
          vN = normalize(vec3(-(hx - h) * uAmp / e, 1., -(hz - h) * uAmp / e));
          // ombre portee par les nuages voisins du cote du soleil (soleil rasant : longues ombres)
          vec2 sd = normalize(uSoleilDir.xz + vec2(1e-5));
          float pente = uSoleilDir.y / max(length(uSoleilDir.xz), .05);
          float bloque = 0.;
          for (int i = 1; i <= 4; i++) {
            float d = float(i) * 8.;
            float hs = hauteur(w.xz + sd * d) * uAmp;
            bloque = max(bloque, hs - (h * uAmp + d * pente));
          }
          vOmbre = 1. - smoothstep(0., 3., bloque);
          w.y = uY + h * uAmp;
          vW = w.xyz; vH = h;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform float uT, uExpo, uBrume, uAmp; uniform vec3 uCam, uSoleilDir, uSoleilCol, uAmbiant, uOmbre;
        varying vec3 vW; varying float vH; varying vec3 vN; varying float vOmbre;
        ${GLSL_BRUIT}
        ${GLSL_CIEL}
        vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
        void main() {
          // petits bourrelets de nuage (detail) qui inclinent la normale
          vec2 p = vW.xz * .07 + uT * .01;
          float d0 = fbm3(p), dx = fbm3(p + vec2(.3, 0.)), dz = fbm3(p + vec2(0., .3));
          vec3 n = normalize(vN + vec3(d0 - dx, 0., d0 - dz) * 1.3);
          float ndl = dot(n, uSoleilDir);
          float diff = clamp(ndl * .6 + .4, 0., 1.);
          diff = diff * diff * vOmbre;
          float creux = mix(.3, 1., smoothstep(.0, .8, vH + (d0 - .5) * .25));
          vec3 v = normalize(vW - uCam);
          // lumiere qui traverse le bord des nuages face au soleil
          float avant = pow(max(dot(v, uSoleilDir), 0.), 6.) * (1. - vH * .5);
          vec3 col = mix(uOmbre, uAmbiant, creux) + uSoleilCol * diff * mix(.55, 1., creux) * 1.5;
          col += uSoleilCol * avant * .8 * mix(.4, 1., vOmbre);
          col = aces(col * uExpo);
          col = pow(col, vec3(1. / 2.2));
          // au loin, le nuage se fond dans le ciel photo (meme direction)
          float dist = length(vW.xz - uCam.xz);
          float brume = 1. - exp(-dist * uBrume);
          vec3 c = mix(col, ciel(normalize(vec3(v.x, min(v.y, -.01), v.z))), brume);
          gl_FragColor = vec4(c, 1.);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -5;
    // le plan suit la caméra par pas de la grille (le relief, calculé en coordonnées du monde, ne « nage » pas)
    const pas = taille / grille;
    function suivre(camPos) {
      mesh.position.x = Math.round(camPos.x / pas) * pas;
      mesh.position.z = Math.round(camPos.z / pas) * pas;
      u.uCam.value.copy(camPos);
    }
    return { mesh, uniforms: u, suivre };
  }

  return {
    init(renderer) { ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy()); },
    materiau, creerIle, geometrieRocher, geometrieDalle, creerCiel, creerNuages, texCiel, fbm3, fichier
  };
})();
