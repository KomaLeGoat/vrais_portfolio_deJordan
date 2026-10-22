/* ══════════════════════════════════════════════════════════════
   PORTFOLIO KOMA — v4 « Jujutsu » : sections, interactions, animations
══════════════════════════════════════════════════════════════ */

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const G = window.gsap && window.ScrollTrigger && !reduit ? window.gsap : null;
if (G) G.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════
   SIDEBAR (comme avant)
══════════════════════════════════ */
const sidebar = document.getElementById('sidebar');
document.getElementById('sbToggle').addEventListener('click', () => {
  const ouvert = sidebar.classList.toggle('open');
  document.body.classList.toggle('sb-open', ouvert);
  setTimeout(() => { window.dispatchEvent(new Event('resize')); if (G) ScrollTrigger.refresh(); }, 420);
});

document.querySelectorAll('a[href^="#"]').forEach(lien => {
  lien.addEventListener('click', e => {
    const cible = document.getElementById(lien.getAttribute('href').slice(1));
    if (!cible) return;
    e.preventDefault();
    cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
    if (window.innerWidth < 700) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sb-open');
    }
  });
});

const liensNav = document.querySelectorAll('.sb-link');
const obsSections = new IntersectionObserver(entrees => {
  entrees.forEach(e => {
    if (e.isIntersecting) liensNav.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach(s => obsSections.observe(s));

/* ══════════════════════════════════
   TITRES : lettres + trait de pinceau
══════════════════════════════════ */
document.querySelectorAll('.sec-title').forEach(t => {
  const texte = t.textContent.trim();
  t.setAttribute('aria-label', texte);
  t.innerHTML = texte.split(' ').map(mot =>
    `<span class="mot" aria-hidden="true">${[...mot].map(c => `<span class="ch"><span>${c}</span></span>`).join('')}</span>`
  ).join(' ') +
    '<svg class="trait-pinceau" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M4 13 C 50 5, 110 17, 170 10 S 260 6, 296 12"/></svg>';
});

/* ══════════════════════════════════
   ANIMATIONS (GSAP + ScrollTrigger)
══════════════════════════════════ */
if (G) {
  // barre de progression
  G.to('#progression', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // hero
  G.from('.hero-title .line-inner', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.1 });
  G.from('.hero-trait', { scaleX: 0, duration: 0.9, ease: 'power3.out', delay: 0.6 });
  G.from(['.hero-sur', '.hero-desc', '.hero-cta'], { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
  G.from('.hero-panel', { y: -40, rotation: 20, opacity: 0, duration: 1, ease: 'back.out(1.6)', delay: 0.8 });
  G.to('.hero-kanji', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '#Accueil', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.hero-layout', { y: -70, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '#Accueil', start: 'top top', end: 'bottom top', scrub: true } });

  // titres : les lettres montent une à une, puis le pinceau trace le trait
  document.querySelectorAll('.sec-title').forEach(t => {
    const tl = G.timeline({ scrollTrigger: { trigger: t, start: 'top 85%' } });
    tl.from(t.querySelectorAll('.ch > span'), { yPercent: 115, rotate: 10, duration: 0.8, ease: 'power4.out', stagger: 0.025 })
      .fromTo(t.querySelector('.trait-pinceau path'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.45');
  });

  // grands kanji de fond : léger parallaxe
  document.querySelectorAll('.sec-kanji').forEach(k => {
    G.fromTo(k, { yPercent: 25 }, { yPercent: -25, ease: 'none', scrollTrigger: { trigger: k.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // apparitions génériques, par petits groupes
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: lot => G.to(lot, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true })
  });

  // à propos : images révélées par un rideau d'encre
  document.querySelectorAll('.ap-img').forEach((img, i) => {
    G.fromTo(img, { clipPath: i % 2 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0%)', duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: img, start: 'top 82%' } });
  });

  // formation
  G.from('.fm-list li', { x: -40, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.fm-list', start: 'top 85%' } });

  // pokédex : il s'allume
  ScrollTrigger.create({
    trigger: '#pokedex', start: 'top 75%', once: true,
    onEnter: () => document.getElementById('pokedex').classList.add('allume')
  });

  // certifications : les badges tombent et tournent
  G.from('.cert-card', { y: 70, opacity: 0, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.1, scrollTrigger: { trigger: '#certGrid', start: 'top 82%' } });
  ScrollTrigger.create({
    trigger: '#certGrid', start: 'top 82%', once: true,
    onEnter: () => document.querySelectorAll('.cert-card').forEach((c, i) => setTimeout(() => c.classList.add('entree'), i * 110))
  });

  // événements : cartes qui arrivent de chaque côté + tronc qui pousse
  document.querySelectorAll('.tc').forEach(c => {
    const gauche = c.classList.contains('tc--g') || window.innerWidth <= 900;
    G.from(c, { x: gauche ? -90 : 90, opacity: 0, rotation: gauche ? -3 : 3, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 85%' } });
  });
  G.to('#arbreTronc', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#arbre', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } });

  // contact
  G.from('.social-links .btn-s', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(2)', scrollTrigger: { trigger: '.social-links', start: 'top 92%' } });
} else {
  // sans GSAP : simple apparition au défilement
  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  document.querySelectorAll('.tl-rail i, #arbreTronc').forEach(r => { r.style.transform = 'scaleY(1)'; });
}

/* ══════════════════════════════════
   OUTILS — Pokédex (orbite de cartes)
══════════════════════════════════ */
(function () {
  const jsonIcon = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="22" font-size="18" font-weight="900" font-family="monospace" fill="#b5a10c" text-anchor="middle" x="16">{}</text></svg>');
  const DEV = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/';
  const outils = [
    { name: 'XAMPP', icon: 'images/xampp.svg' },
    { name: 'JavaScript', icon: DEV + 'javascript/javascript-original.svg' },
    { name: 'HTML', icon: DEV + 'html5/html5-original.svg' },
    { name: 'CSS', icon: DEV + 'css3/css3-original.svg' },
    { name: 'Java', icon: DEV + 'java/java-original.svg' },
    { name: 'Docker', icon: DEV + 'docker/docker-original.svg' },
    { name: 'Python', icon: DEV + 'python/python-original.svg' },
    { name: 'JSON', icon: jsonIcon },
    { name: 'SQL', icon: DEV + 'mysql/mysql-original.svg' },
    { name: 'PHP', icon: DEV + 'php/php-original.svg' },
  ];

  const scene = document.getElementById('toolsScene');
  const wrap = document.getElementById('toolsWrap');
  const dexNum = document.getElementById('dexNum');
  const dexNom = document.getElementById('dexNom');
  const n = outils.length;
  const pas = 360 / n;
  const pills = [];

  outils.forEach((t, i) => {
    const a = document.createElement('div');
    a.className = 'tool-anchor';
    const p = document.createElement('div');
    p.className = 'tool-pill';
    p.innerHTML = `<span class="tool-num">N°${String(i + 1).padStart(3, '0')}</span><img src="${t.icon}" alt="" onerror="this.style.visibility='hidden'"/><span class="tool-label">${t.name}</span>`;
    a.appendChild(p);
    scene.appendChild(a);
    pills.push({ a, p });
  });

  let angle = 0, vitesse = -16, glisse = null, auto = true, devant = -1, visible = false;
  const rayon = () => Math.round(n * (innerWidth < 640 ? 118 : 205) / (2 * Math.PI));

  // orbite : chaque carte reste face à l'écran, la profondeur fait le reste
  function placer() {
    const r = rayon();
    pills.forEach(({ a, p }, i) => {
      const ang = (i * pas + angle) * Math.PI / 180;
      const z = Math.cos(ang) * r;
      const prof = (z + r) / (2 * r);
      a.style.transform = `translate3d(${(Math.sin(ang) * r * 1.25).toFixed(1)}px, ${(-Math.cos(ang) * r * 0.1).toFixed(1)}px, ${(z - r).toFixed(1)}px)`;
      a.style.zIndex = Math.round(prof * 100);
      p.style.opacity = (0.25 + 0.75 * prof * prof).toFixed(3);
    });
  }

  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(wrap);
  wrap.addEventListener('pointerdown', e => {
    glisse = { x: e.clientX, t: performance.now() };
    auto = false;
    wrap.classList.add('drag');
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', e => {
    if (!glisse) return;
    const now = performance.now();
    const dx = e.clientX - glisse.x;
    angle += dx * 0.35;
    vitesse = dx * 0.35 / Math.max(0.008, (now - glisse.t) / 1000);
    glisse = { x: e.clientX, t: now };
  });
  const fin = () => { glisse = null; wrap.classList.remove('drag'); setTimeout(() => { auto = true; }, 2500); };
  wrap.addEventListener('pointerup', fin);
  wrap.addEventListener('pointercancel', fin);

  let prec = performance.now();
  (function boucle(now) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, (now - prec) / 1000);
    prec = now;
    if (!visible) return;
    if (!glisse) {
      angle += vitesse * dt;
      vitesse += ((auto ? -16 : 0) - vitesse) * Math.min(1, dt * (auto ? 0.8 : 2.2));
    }
    placer();
    const idx = ((Math.round(-angle / pas) % n) + n) % n;
    if (idx !== devant) {
      if (devant >= 0) pills[devant].p.classList.remove('devant');
      pills[idx].p.classList.add('devant');
      devant = idx;
      dexNum.textContent = 'N°' + String(idx + 1).padStart(3, '0');
      dexNom.textContent = outils[idx].name;
    }
  })(prec);
})();

/* ══════════════════════════════════
   LIGHTBOX (certificats, photos)
══════════════════════════════════ */
const lightbox = document.getElementById('lightbox');
const lbTitle = document.getElementById('lbTitle');
const lbBody = document.getElementById('lbBody');

function ouvrirLightbox(nom, src) {
  lbTitle.textContent = nom;
  if (/\.pdf$/i.test(src)) {
    lbBody.innerHTML = `<embed src="${src}" type="application/pdf" style="width:100%;height:75vh;border:none;border-radius:6px;background:#fff;"/>`;
  } else {
    lbBody.innerHTML = `<img class="lb-img" src="${src}" alt="${nom}"/>`;
    const img = lbBody.querySelector('.lb-img');
    img.onload = () => img.classList.add('loaded');
    img.onerror = () => { lbBody.innerHTML = `<div class="lb-placeholder"><strong>${nom}</strong></div>`; };
  }
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fermerLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('lbClose').addEventListener('click', fermerLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) fermerLightbox(); });
addEventListener('keydown', e => { if (e.key === 'Escape') fermerLightbox(); });

document.querySelectorAll('#certGrid .cert-card').forEach(carte => {
  const btn = document.createElement('button');
  btn.className = 'cert-photo-btn';
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Voir le certificat`;
  btn.addEventListener('click', () => ouvrirLightbox(carte.dataset.cert, carte.dataset.img));
  carte.appendChild(btn);
});

document.querySelectorAll('.tc-img-wrap').forEach(w => {
  const ouvrir = () => ouvrirLightbox(w.dataset.title || 'Événement', w.dataset.img);
  w.addEventListener('click', ouvrir);
  w.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
});

/* ══════════════════════════════════
   PROJETS — cartes holographiques
══════════════════════════════════ */
(function () {
  const grille = document.getElementById('projGrid');
  const projets = [
    {
      title: "Yo Game",
      desc: "Application web interactive comparant les statistiques, mécaniques et évolutions des jeux vidéo en temps réel.",
      img: "images/yogame.webp",
      type: '網',
      code: {
        lang: "SQL",
        label: "Vue top jeux",
        snippet:
`CREATE VIEW vue_top_jeux AS
SELECT
    j.id,
    j.nom,
    j.genre,
    j.plateforme,
    j.emoji,
    j.image,
    ROUND(AVG(n.note), 2)  AS note_moyenne,
    COUNT(DISTINCT n.id)   AS nb_votes,
    COUNT(DISTINCT c.id)   AS nb_commentaires
FROM jeux j
LEFT JOIN notes        n ON n.jeu_id = j.id
LEFT JOIN commentaires c ON c.jeu_id = j.id
GROUP BY j.id, j.nom, j.genre, j.plateforme, j.emoji, j.image
ORDER BY note_moyenne DESC
LIMIT 10;`
      }
    },
    {
      title: "La Voie du Cailloux",
      desc: "Création d'un jeu complet sur Roblox Studio. Conception du level design, modélisation et scripting Lua.",
      img: "images/roblox.webp",
      type: '岩',
      code: {
        lang: "Lua",
        label: "Cycle jour/nuit",
        snippet:
`local Lighting = game:GetService("Lighting")

local cycleSpeed = 60 -- secondes pour un cycle complet

while true do
    for hour = 0, 24, 0.1 do
        Lighting.TimeOfDay = string.format("%02d:%02d:%02d",
            math.floor(hour),
            math.floor((hour % 1) * 60),
            0)
        task.wait(cycleSpeed / 240)
    end
end`
      }
    },
    {
      title: "BTS SIO",
      desc: "Mon projet d'étude principal : réussir ma formation en surmontant les défis de l'IT et briser les chaînes de l'apprentissage !",
      img: "images/bts_sio.webp",
      gif: "images/evolie.webp",
      type: '学'
    },
    {
      title: "AFK Mon",
      desc: "Jeu idle/AFK sur le thème de la capture de monstres. Collecte de créatures, améliorations et progression automatique.",
      img: "images/afkmon.webp",
      type: '獣',
      code: {
        lang: "HTML",
        label: "Panel gacha",
        snippet:
`<div class="panel panel-right">
  <div class="panel-title">Tirages</div>
  <div class="gacha-section">
    <div class="gacha-banner">
      <div class="banner-label">Standard</div>
      <div class="banner-cost">10 🎱 / tirage</div>
    </div>
    <button class="btn-gacha" onclick="Gacha.pull(1)">
      × 1 Tirage — 10 🎱
    </button>
    <button class="btn-gacha" onclick="Gacha.pull(3)">
      × 3 Tirages — 30 🎱
    </button>
    <button class="btn-gacha gold" onclick="Gacha.pull(10)">
      × 10 Tirages — 300 🎱
    </button>
    <button class="btn-gacha gold mega-pull" onclick="Gacha.pull(100)">
      × 100 Tirages — 3000 🎱
    </button>
  </div>

  <div class="panel-title" style="margin-top:16px">Collection</div>
  <div class="collection-grid" id="collection-grid"></div>
</div>`
      }
    }
  ];

  const modale = document.createElement('div');
  modale.className = 'proj-modal';
  modale.setAttribute('role', 'dialog');
  modale.setAttribute('aria-modal', 'true');
  document.body.appendChild(modale);

  function ouvrir(p) {
    if (p.gif) {
      modale.innerHTML = `<div class="proj-modal-gif-wrap"><img class="proj-modal-gif" src="${p.gif}" alt="${p.title}"><button class="proj-modal-gif-close" aria-label="Fermer">✕</button></div>`;
    } else {
      modale.innerHTML = `
        <div class="proj-modal-box">
          <div class="proj-modal-header">
            <div><span class="proj-modal-lang">${p.code.lang}</span><span class="proj-modal-label">${p.code.label}</span></div>
            <button class="proj-modal-close" aria-label="Fermer">✕</button>
          </div>
          <pre class="proj-modal-code"><code>${p.code.snippet.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>
        </div>`;
    }
    modale.querySelector('button').addEventListener('click', fermer);
    modale.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function fermer() {
    modale.classList.remove('open');
    document.body.style.overflow = '';
  }
  modale.addEventListener('click', e => { if (e.target === modale) fermer(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); });

  projets.forEach((p, i) => {
    const clic = p.code || p.gif;
    const carte = document.createElement('article');
    carte.className = 'carte' + (clic ? ' carte--clic' : '');
    if (clic) { carte.tabIndex = 0; carte.setAttribute('role', 'button'); carte.setAttribute('aria-label', p.title + ' — voir'); }
    carte.innerHTML = `
      <div class="carte-inner">
        <div class="carte-face">
          <div class="carte-tete">
            <span class="carte-stade">PROJET</span>
            <h3>${p.title}</h3>
            <i class="carte-type" aria-hidden="true">${p.type}</i>
          </div>
          <div class="carte-image"><img src="${p.img}" alt="${p.title}" loading="lazy"></div>
          <div class="carte-bandeau">N°${String(i + 1).padStart(3, '0')} · ${p.code ? p.code.lang : 'GIF'}</div>
          <p class="carte-desc">${p.desc}</p>
          <div class="carte-pied">${clic ? '<span class="carte-voir">Voir →</span>' : '<span></span>'}<span>${String(i + 1).padStart(3, '0')}/${String(projets.length).padStart(3, '0')}</span></div>
        </div>
        <div class="carte-holo"></div>
        <div class="carte-reflet"></div>
      </div>`;
    if (clic) {
      carte.addEventListener('click', () => ouvrir(p));
      carte.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(p); } });
    }
    if (!reduit) {
      carte.addEventListener('pointermove', e => {
        const r = carte.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        carte.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        carte.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        carte.style.setProperty('--rx', ((0.5 - y) * 18).toFixed(2) + 'deg');
        carte.style.setProperty('--ry', ((x - 0.5) * 22).toFixed(2) + 'deg');
        carte.style.setProperty('--o', 1);
        carte.classList.add('actif');
      });
      carte.addEventListener('pointerleave', () => {
        carte.style.setProperty('--rx', '0deg');
        carte.style.setProperty('--ry', '0deg');
        carte.style.setProperty('--o', 0);
        carte.classList.remove('actif');
      });
    }
    grille.appendChild(carte);
  });

  // les cartes sont distribuées comme un paquet
  if (G) {
    G.from('#projGrid .carte', {
      y: 160, x: (i) => (1.5 - i) * 120, rotation: (i) => (i - 1.5) * 14, opacity: 0, duration: 1.1,
      ease: 'back.out(1.3)', stagger: 0.12, scrollTrigger: { trigger: '#projGrid', start: 'top 82%' }
    });
  }
})();

/* ══════════════════════════════════
   STAGES — deux missions, flèches et points
══════════════════════════════════ */
(function () {
  const stages = [
    {
      name: 'Lycée LMR — Solution GLPI',
      meta: 'Gestion de parc & Centre de services · 2025',
      desc: "Mise en place d'une solution complète GLPI de zéro : gestion de parc et centre de services (Helpdesk)."
    },
    {
      name: 'Caledonia — Application multiplateforme',
      meta: 'Web · Windows · Android · 2026',
      desc: "Conception d'une application 100 % autonome (sans serveur) pour la chaîne Caledonia : replays, direct, actualités, grille TV et météo — une seule base de code pour le Web, Windows et Android."
    }
  ];
  const panneaux = [...document.querySelectorAll('.stage-panel')];
  const points = [...document.querySelectorAll('.stage-dot')];
  const nom = document.getElementById('stageName');
  const meta = document.getElementById('stageMeta');
  const desc = document.getElementById('stageDesc');
  const compte = document.getElementById('stageCount');
  let actuel = 0;
  let declencheurs = [];

  function animerPanneau(p, sens) {
    if (!G) { p.querySelectorAll('.tl-rail i').forEach(r => { r.style.transform = 'scaleY(1)'; }); return; }
    declencheurs.forEach(t => t.kill());
    declencheurs = [];
    const items = p.querySelectorAll('.tl-item');
    G.fromTo(items, { x: 60 * sens, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    const rail = p.querySelector('.tl-rail i');
    const tw = G.fromTo(rail, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } });
    declencheurs.push(tw.scrollTrigger);
  }

  function afficher(i, sens) {
    if (i === actuel) return;
    const ancien = panneaux[actuel];
    const nouveau = panneaux[i];
    actuel = i;
    const s = stages[i];
    const majTexte = () => {
      nom.textContent = s.name;
      meta.textContent = s.meta;
      desc.textContent = s.desc;
      compte.textContent = `Stage ${i + 1} / ${stages.length}`;
    };
    points.forEach((p, k) => p.classList.toggle('active', k === i));
    if (G) {
      G.to([nom, meta, desc], { opacity: 0, y: -10, duration: 0.2, onComplete: () => { majTexte(); G.to([nom, meta, desc], { opacity: 1, y: 0, duration: 0.35 }); } });
      G.to(ancien, {
        x: -60 * sens, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
          ancien.hidden = true;
          G.set(ancien, { x: 0, opacity: 1 });
          nouveau.hidden = false;
          animerPanneau(nouveau, sens);
          ScrollTrigger.refresh();
        }
      });
    } else {
      majTexte();
      ancien.hidden = true;
      nouveau.hidden = false;
      animerPanneau(nouveau, sens);
    }
  }

  document.getElementById('stagePrev').addEventListener('click', () => afficher((actuel + stages.length - 1) % stages.length, -1));
  document.getElementById('stageNext').addEventListener('click', () => afficher((actuel + 1) % stages.length, 1));
  points.forEach((p, k) => p.addEventListener('click', () => afficher(k, k > actuel ? 1 : -1)));

  // premier panneau : les étapes arrivent au défilement
  if (G) {
    G.from(panneaux[0].querySelectorAll('.tl-item'), { x: -50, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: panneaux[0], start: 'top 80%' } });
    const tw = G.fromTo(panneaux[0].querySelector('.tl-rail i'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: panneaux[0], start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } });
    declencheurs.push(tw.scrollTrigger);
  } else {
    animerPanneau(panneaux[0], 1);
  }
})();

/* ══════════════════════════════════
   VEILLE — dialogue façon Pokémon Donjon Mystère
══════════════════════════════════ */
(function () {
  const dialogues = [
    {
      portrait: 'images/portrait1.png',
      sprite: 'images/dialogue1.webp',
      label: '01 / 03 — Histoire',
      html: `Depuis quelques années, l'<span class="mot-cle">IA</span> transforme radicalement notre façon de travailler. J'ai commencé à explorer ces outils lors de ma formation <span class="mot-cle">BTS SIO</span>, et ça a changé ma manière d'apprendre et de résoudre des problèmes techniques. Que ce soit pour générer du code, analyser des vulnérabilités ou automatiser des tâches répétitives… l'<span class="mot-cle">IA</span> est devenue un outil indispensable dans mon quotidien.`
    },
    {
      portrait: 'images/portrait2.png',
      sprite: 'images/dialogue2.webp',
      label: '02 / 03 — Actualité',
      html: `<span class="savais-tu-badge">Le savais-tu ?</span><br>En 2026, plus de <span class="mot-cle">85 %</span> des cyberattaques exploitent des techniques assistées par l'IA : deepfakes ultra-réalistes, phishing hyper-personnalisé, malwares auto-adaptatifs… Mais l'IA défend aussi : les <span class="mot-cle">SOC</span> l'utilisent pour détecter les intrusions en temps réel, réduisant le temps de réponse aux incidents de <span class="mot-cle">70 %</span>.`
    },
    {
      portrait: 'images/portrait3.png',
      sprite: 'images/dialogue3.webp',
      label: '03 / 03 — Dossier complet',
      html: `J'ai compilé tout ça dans un <span class="mot-cle">dossier complet</span> sur l'impact de l'IA en cybersécurité. Tu y trouveras des exemples concrets, des chiffres clés et mon analyse personnelle. Clique ci-dessous pour le télécharger !`,
      telecharger: true
    }
  ];

  const portrait = document.getElementById('dialogueImg');
  const sprite = document.getElementById('pmdSprite');
  const texte = document.getElementById('dialogueText');
  const label = document.getElementById('dialogueLabel');
  const boite = document.getElementById('pmdBoite');
  const suiv = document.getElementById('dialogueNext');
  const prec = document.getElementById('dialoguePrev');
  const boutons = document.getElementById('dialogueBoutons');
  const points = document.querySelectorAll('.dialogue-dots .dot');
  let etape = 0, minuteur = null, demarre = false;

  // précharge les images pour éviter tout clignotement
  dialogues.forEach(d => { new Image().src = d.portrait; new Image().src = d.sprite; });

  function finirFrappe() {
    clearTimeout(minuteur);
    minuteur = null;
    texte.innerHTML = dialogues[etape].html + '<span class="pmd-guillemet">」</span>';
    boite.classList.toggle('fini', !dialogues[etape].telecharger);
  }

  function taper(html) {
    clearTimeout(minuteur);
    boite.classList.remove('fini');
    if (reduit) { finirFrappe(); return; }
    const morceaux = html.split(/(<[^>]+>)/).filter(Boolean);
    let i = 0, j = 0, sortie = '';
    (function lettre() {
      if (i >= morceaux.length) { finirFrappe(); return; }
      const m = morceaux[i];
      if (m[0] === '<') { sortie += m; i++; lettre(); return; }
      sortie += m[j++];
      if (j >= m.length) { i++; j = 0; }
      texte.innerHTML = sortie;
      minuteur = setTimeout(lettre, 16);
    })();
  }

  function afficher(s) {
    etape = s;
    const d = dialogues[s];
    portrait.style.opacity = '0';
    sprite.style.opacity = '0';
    setTimeout(() => {
      portrait.src = d.portrait;
      sprite.src = d.sprite;
      portrait.style.opacity = '1';
      sprite.style.opacity = '1';
    }, 180);
    label.textContent = d.label;
    const ancien = document.getElementById('dialogueDownloadBtn');
    if (ancien) ancien.remove();
    if (d.telecharger) {
      suiv.style.display = 'none';
      const dl = document.createElement('a');
      dl.id = 'dialogueDownloadBtn';
      dl.href = 'docs/IA_Cyber_Actus2026.pptx';
      dl.target = '_blank';
      dl.className = 'pmd-btn pmd-btn--suivant';
      dl.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Télécharger le dossier`;
      boutons.appendChild(dl);
    } else {
      suiv.style.display = '';
    }
    prec.disabled = s === 0;
    points.forEach((p, i) => p.classList.toggle('active', i === s));
    taper(d.html);
  }

  function avancer() {
    if (minuteur) { finirFrappe(); return; }
    if (etape < dialogues.length - 1) afficher(etape + 1);
  }

  suiv.addEventListener('click', avancer);
  prec.addEventListener('click', () => { if (etape > 0) afficher(etape - 1); });
  points.forEach((p, i) => p.addEventListener('click', () => afficher(i)));
  boite.addEventListener('click', avancer);
  boite.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avancer(); } });

  texte.innerHTML = dialogues[0].html;
  new IntersectionObserver((e, o) => {
    if (e[0].isIntersecting && !demarre) { demarre = true; afficher(0); o.disconnect(); }
  }, { threshold: 0.35 }).observe(boite);
})();

/* ══════════════════════════════════
   FORMULAIRE DE CONTACT
══════════════════════════════════ */
(function () {
  const form = document.getElementById('contactForm');
  const retour = document.getElementById('formFeedback');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const span = form.querySelector('.btn-submit span');
    const initial = span.textContent;
    span.textContent = 'Envoi en cours...';

    if (location.protocol === 'file:') {
      setTimeout(() => {
        span.textContent = initial;
        retour.className = 'form-feedback success';
        retour.innerHTML = '✅ <strong>Message envoyé</strong><br>Je vous recontacterai très vite.';
        form.reset();
      }, 1500);
      return;
    }

    try {
      const rep = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const res = await rep.json();
      span.textContent = initial;
      if (res.ok) {
        retour.className = 'form-feedback success';
        retour.innerHTML = '✅ <strong>Message envoyé</strong><br>Je vous recontacterai très vite.';
        form.reset();
      } else {
        retour.className = 'form-feedback error';
        retour.innerHTML = `❌ <strong>Erreur</strong><br>${res.errors?.map(x => x.message).join(', ') || 'Une erreur est survenue.'}`;
      }
    } catch (err) {
      span.textContent = initial;
      retour.className = 'form-feedback error';
      retour.innerHTML = '❌ <strong>Un problème est survenu.</strong><br>Veuillez me contacter directement par email.';
    }
  });
})();
