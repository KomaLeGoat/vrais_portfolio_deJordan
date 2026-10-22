/* ══════════════════════════════════════════════════════════════
   DESCENTE — relie le défilement de la page à l'escalier 3D (js/escalier.js)
   Une toile plein écran derrière le contenu. Chaque élément [data-palier] (l'accueil puis
   chaque partie) a son île : la caméra reste à côté de l'île tant qu'on lit la partie (le texte
   à gauche, l'île et son contenu 3D à droite), et vole vers l'île suivante dans l'espace libre
   entre deux parties. Le défilement reste natif ; la caméra a une vitesse plafonnée.
   Le CSS reçoit --prof (0 à 1) et les classes .zone-soir / .zone-nuit.
   Sans WebGL : un dégradé CSS qui fonce avec le défilement (classe .sans-3d).
══════════════════════════════════════════════════════════════ */
(function () {
  const racine = document.documentElement;
  const elements = [...document.querySelectorAll('[data-palier]')];
  if (!elements.length) return;
  window.__ilesIds = elements.map((el) => el.id);   // ordre des îles (avant que fenetres.js déplace les sections)
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const telephone = Math.min(screen.width, screen.height) < 600;

  const canvas = document.createElement('canvas');
  canvas.className = 'decor';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const plaques = elements.map((el) => ({
    nom: el.dataset.palier,
    kanji: (el.querySelector('.sec-kanji') || {}).textContent || ''
  }));
  // Blocs de texte que Lugulabre ne doit jamais cacher (ceux qui sont à l'écran)
  const BLOCS = '.hero-content, .sec-tete, .ap-ligne, .technique, .stage-switch, .tl-item, .pmd, .tc, .ct-title, .ct-sub, .contact-form, .social-links';
  let blocs = [...document.querySelectorAll(BLOCS)];
  const zonesTexte = () => {
    const out = [];
    for (const el of blocs) {
      const cadre = el.closest('.fenetre-3d');
      if (cadre && cadre.style.visibility === 'hidden') continue;   // fenêtre d'une autre île (cachée)
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.bottom > 0 && r.top < innerHeight) out.push(r);
    }
    return out;
  };
  let escalier = null;
  try { escalier = window.Escalier && window.Escalier.creer(canvas, { plaques, telephone, zonesTexte }); } catch (e) { console.warn('[décor] escalier indisponible', e); }
  // Grand écran : chaque partie devient une fenêtre posée dans le décor (js/fenetres.js) ;
  // sur téléphone, les parties restent dans la page, île en fond.
  const FENETRES = !!(escalier && window.Fenetres && innerWidth > 900);
  let parcours = null;
  if (FENETRES) {
    racine.classList.add('mode-fenetres');
    parcours = document.createElement('div');
    parcours.id = 'parcours';
    parcours.setAttribute('aria-hidden', 'true');
    document.getElementById('contenu').appendChild(parcours);
    Fenetres.installer(escalier, elements);
  }
  if (!escalier) {
    canvas.remove();
    racine.classList.add('sans-3d');
  } else {
    racine.classList.add('avec-3d');
    window.__escalier = escalier;
    // Lugulabre, modélisé dans Blender (_outils/compagnons/lugulabre.py)
    if (window.Trois) {
      Trois.glb('assets/3d/compagnons/lugulabre.glb', 'COMPAGNON_LUGULABRE')
        .then((g) => { if (escalier) escalier.ajouterCompagnon(g); })
        .catch((e) => console.warn('[décor] Lugulabre non chargé', e));
    }
    // Survol et clic sur Lugulabre (la toile est derrière le contenu : on teste nous-mêmes)
    const curseur = document.getElementById('curseur');
    const INTERACTIF = 'a, button, input, textarea, select, label, .carte, .cert-card, .tc-img-wrap, .pmd, .tools-3d-wrap, .sidebar, .slam3d, .lightbox, .proj-modal, .fenetre-3d, .premier-plan, .voile-fenetre';
    // Le contenu posé sur les îles (js/iles.js) se construit une fois toute la page chargée — seulement en mode
    // fenêtres : sur écran étroit, ces parties (outils, certifications) sont déjà dans la page, sans doublon en 3D
    addEventListener('load', () => { if (window.Iles && escalier && FENETRES) Iles.construire(escalier); });
    let survol = false;
    addEventListener('pointermove', (e) => {
      if (!escalier || e.pointerType !== 'mouse') return;
      const libre = !e.target.closest(INTERACTIF);
      const surIle = libre && window.Iles ? Iles.survol(e.clientX, e.clientY) : false;
      const s = libre && (surIle || escalier.surCompagnon(e.clientX, e.clientY));
      if (s !== survol) {
        survol = s;
        document.body.style.cursor = s ? 'pointer' : '';
        if (curseur) curseur.classList.toggle('survol', s);
      }
    }, { passive: true });
    document.addEventListener('click', (e) => {
      if (!escalier || e.target.closest(INTERACTIF)) return;
      if (window.Iles && Iles.cliquer(e.clientX, e.clientY)) return;
      if (escalier.surCompagnon(e.clientX, e.clientY)) {
        escalier.toucherCompagnon();
      }
    });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); racine.classList.replace('avec-3d', 'sans-3d'); canvas.remove(); escalier = null; });
  }

  /* ── Ancres : pour chaque île, le défilement où l'on arrive et celui où l'on repart ── */
  let W = 0, H = 0, arrivees = [], departs = [], ancres = [];
  const haut = (el) => el.getBoundingClientRect().top + scrollY;
  function mesurer() {
    W = innerWidth;
    H = innerHeight;
    if (escalier) escalier.taille(W, H);
    if (FENETRES) {
      // parcours régulier : on vole vers l'île (75 % d'écran de défilement), puis on y reste (60 %)
      arrivees = [0];
      departs = [H * 0.3];
      for (let i = 1; i < elements.length; i++) {
        arrivees.push(departs[i - 1] + H * 0.75);
        departs.push(arrivees[i] + H * 0.6);
      }
      parcours.style.height = `${Math.round(departs[departs.length - 1] + H * 0.25)}px`;
      ancres = arrivees.map((a, i) => (a + departs[i]) / 2);
      window.__ancres = ancres;
      return;
    }
    const max = Math.max(1, document.documentElement.scrollHeight - H);
    const b = (y) => Math.min(max, Math.max(0, y));
    // on arrive sur l'île quand le haut de la partie atteint 62 % de l'écran ; on repart quand son bas passe 42 %
    arrivees = elements.map((el, i) => (i === 0 ? 0 : b(haut(el) - H * 0.62)));
    departs = elements.map((el, i) => (i === 0 ? b(haut(el) + el.offsetHeight - H * 0.7) : b(haut(el) + el.offsetHeight - H * 0.42)));
    for (let i = 0; i < elements.length; i++) {
      if (i > 0) arrivees[i] = Math.max(arrivees[i], departs[i - 1] + 1);
      departs[i] = Math.max(departs[i], arrivees[i]);
    }
    // milieu de chaque arrêt : sert aux tests et aux liens
    ancres = arrivees.map((a, i) => (a + departs[i]) / 2);
    window.__ancres = ancres;
  }
  mesurer();
  addEventListener('resize', mesurer);
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(mesurer)).observe(document.body);
  addEventListener('load', () => { mesurer(); blocs = [...document.querySelectorAll(BLOCS)]; });

  /** Défilement qui mène à l'île d'une partie (pour les liens du menu) ; null hors du mode fenêtres. */
  window.positionIle = (id) => {
    if (!FENETRES) return null;
    const i = elements.findIndex((el) => el.id === id);
    return i < 0 ? null : ancres[i];
  };

  /** Île visée (fraction) : entière pendant la lecture d'une partie, entre deux pendant le vol. */
  function palier(y) {
    for (let i = 0; i < arrivees.length; i++) {
      if (y <= departs[i]) return i;
      if (i < arrivees.length - 1 && y < arrivees[i + 1]) return i + (y - departs[i]) / Math.max(1, arrivees[i + 1] - departs[i]);
    }
    return arrivees.length - 1;
  }

  addEventListener('pointermove', (e) => {
    if (escalier) escalier.souris((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
  }, { passive: true });

  /* ── Boucle : qualité adaptative (moins de pixels si l'ordinateur peine) ── */
  const durees = [];
  let ratio = Math.min(devicePixelRatio || 1, 1), dernier = 0, t0 = performance.now(), profAffichee = -1, zone = '';
  let ileVisee = -1, ileAtteinte = -1;
  function image(now) {
    requestAnimationFrame(image);
    const dt = dernier && now > dernier ? Math.min(0.1, (now - dernier) / 1000) : 0;
    dernier = now;
    if (document.hidden) return;
    const y = scrollY;
    let r;
    if (escalier) {
      if (dt) {
        durees.push(dt);
        if (durees.length === 90) {
          const mediane = durees.sort((a, b) => a - b)[45];
          durees.length = 0;
          if (mediane > 0.024 && ratio > 0.55) escalier.qualite((ratio = Math.max(0.55, ratio * 0.8)));
        }
      }
      r = escalier.image(palier(y), reduit ? 0 : (now - t0) / 1000, reduit ? 1 : dt);
    } else {
      const p = palier(y) / Math.max(1, elements.length - 1);
      r = { prof: p, soir: 1 - p, nuit: p * 0.72 };
    }
    // --prof ne sert qu'au dégradé de secours (sans 3D) : avec la 3D, le changer à chaque image
    // recalculait le style de toute la page pendant la descente (saccades)
    if (!escalier && Math.abs(r.prof - profAffichee) > 0.002) {
      profAffichee = r.prof;
      racine.style.setProperty('--prof', r.prof.toFixed(3));
    }
    // île visée (menu) et île atteinte par la caméra (animations des fenêtres)
    const u = palier(y), iu = Math.round(u);
    if (Math.abs(u - iu) < 0.25 && iu !== ileVisee) {
      ileVisee = iu;
      window.dispatchEvent(new CustomEvent('ile-change', { detail: elements[iu].id }));
    }
    if (escalier) {
      const uc = escalier.position(), ic = Math.round(uc);
      if (Math.abs(uc - ic) < 0.06 && ic !== ileAtteinte) {
        ileAtteinte = ic;
        window.dispatchEvent(new CustomEvent('ile-arrivee', { detail: elements[ic].id }));
      }
    }
    const z = r.nuit > 0.5 ? 'zone-nuit' : 'zone-soir';
    if (z !== zone) {
      if (zone) racine.classList.remove(zone);
      racine.classList.add((zone = z));
    }
  }
  requestAnimationFrame(image);
})();
