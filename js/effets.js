/* ══════════════════════════════════════════════════════════════
   EFFETS — Black Flash, curseur, boutons magnétiques
══════════════════════════════════════════════════════════════ */
(function () {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Black Flash (黒閃) ─────────────────────────────────── */
  const toile = document.getElementById('blackFlash');
  const ctx = toile.getContext('2d');
  const kanji = document.getElementById('bfKanji');
  const main = document.getElementById('contenu');
  let animEnCours = 0;

  function eclair(x, y, angle, longueur, epaisseur, profondeur) {
    const pts = [[x, y]];
    const n = 7 + Math.floor(Math.random() * 5);
    let cx = x, cy = y;
    for (let i = 1; i <= n; i++) {
      const a = angle + (Math.random() - .5) * 1.1;
      cx += Math.cos(a) * longueur / n;
      cy += Math.sin(a) * longueur / n;
      pts.push([cx, cy]);
    }
    const branches = [];
    if (profondeur > 0) {
      for (let i = 2; i < pts.length - 1; i += 2 + Math.floor(Math.random() * 2)) {
        if (Math.random() < .6) {
          const da = (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .6);
          branches.push(eclair(pts[i][0], pts[i][1], angle + da, longueur * .38, epaisseur * .55, profondeur - 1));
        }
      }
    }
    return { pts, epaisseur, branches };
  }

  function tracer(b, alpha) {
    ctx.beginPath();
    b.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ff2a2a';
    ctx.lineWidth = b.epaisseur * 2.4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = b.epaisseur;
    ctx.stroke();
    b.branches.forEach(s => tracer(s, alpha));
  }

  window.blackFlash = function (x, y, force = 1, avecKanji = true) {
    if (reduit) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    toile.width = W * dpr;
    toile.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const nb = Math.round(6 + 4 * force);
    const longueur = Math.min(W, H) * (.28 + .22 * force);
    let eclairs = [];
    const regenerer = () => {
      eclairs = [];
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2 + Math.random() * .6;
        eclairs.push(eclair(x, y, a, longueur * (.6 + Math.random() * .5), 3 + 4 * force, 2));
      }
    };
    regenerer();

    const id = ++animEnCours;
    const t0 = performance.now();
    const duree = 560;
    let derniere = t0;
    (function image(now) {
      if (id !== animEnCours) return;
      const t = (now - t0) / duree;
      ctx.clearRect(0, 0, W, H);
      if (t < 1) {
        if (t < .08) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,42,42,.2)'; ctx.fillRect(0, 0, W, H); }
        else if (t < .16) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, W, H); }
        const r = 30 + 150 * force * Math.min(1, t * 3);
        ctx.globalAlpha = Math.max(0, 1 - t * 1.6);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ff2a2a';
        ctx.stroke();
        if (now - derniere > 55) { regenerer(); derniere = now; }
        eclairs.forEach(e => tracer(e, t < .45 ? 1 : Math.max(0, 1 - (t - .45) / .55)));
        ctx.globalAlpha = 1;
        requestAnimationFrame(image);
      }
    })(t0);

    if (avecKanji) {
      kanji.style.left = x + 'px';
      kanji.style.top = Math.max(90, y - 130) + 'px';
      kanji.classList.remove('on');
      void kanji.offsetWidth;
      kanji.classList.add('on');
    }
    main.classList.remove('secousse');
    void main.offsetWidth;
    main.classList.add('secousse');
  };

  if (reduit) return;
  const fin = window.matchMedia('(pointer: fine)').matches;

  /* ── Curseur : anneau rouge qui suit, grossit sur les éléments cliquables ── */
  const curseur = document.getElementById('curseur');
  if (curseur && fin) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      curseur.classList.add('visible');
      const cible = e.target.closest && e.target.closest('a, button, [role="button"], .carte--clic, .tc-img-wrap, #hero3d.survol, #slam3d, .tools-3d-wrap');
      curseur.classList.toggle('survol', !!cible);
    }, { passive: true });
    document.addEventListener('mouseleave', () => curseur.classList.remove('visible'));
    (function suivre() {
      cx += (tx - cx) * .22;
      cy += (ty - cy) * .22;
      curseur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(suivre);
    })();
  }

  /* ── Boutons magnétiques : attirés par la souris ── */
  if (fin) {
    document.querySelectorAll('.magnetique').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / r.width;
        const dy = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = `translate(${dx * 12}px, ${dy * 10}px)`;
      });
      b.addEventListener('mouseleave', () => {
        b.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, background .3s, color .3s';
        b.style.transform = '';
        setTimeout(() => { b.style.transition = ''; }, 500);
      });
    });
  }
})();
