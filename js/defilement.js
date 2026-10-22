/* ══════════════════════════════════════════════════════════════
   DÉFILEMENT — vitesse plafonnée (repris de Clipsco, validé par Jordan)
   La molette, le clavier et les liens du menu font glisser la page sans jamais dépasser
   VITESSE px/s : l'escalier suit sans décrocher. Pas de « scroll-jacking » : le doigt et la
   barre de défilement gardent leur comportement normal. Rien de tout ça avec « réduire les animations ».
══════════════════════════════════════════════════════════════ */
(function () {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VITESSE = 2200;   // px/s, au plus
  const AVANCE = 1.2;     // une grande rafale de molette ne s'accumule pas au-delà de 1,2 écran
  const TOUCHES = { ArrowDown: 80, ArrowUp: -80, PageDown: 0.9, PageUp: -0.9, ' ': 0.9 };
  let cible = scrollY, enCours = false, dernier = 0;
  const max = () => document.documentElement.scrollHeight - innerHeight;
  const borne = (y) => Math.max(0, Math.min(max(), y));
  const bloque = () => document.body.style.overflow === 'hidden';
  // Mode fenêtres (grand écran) : on ne passe d'île en île que par la barre de navigation (et les liens) ;
  // la molette et le clavier ne déplacent plus la caméra
  const parLaNavSeulement = () => document.documentElement.classList.contains('mode-fenetres');

  function aller(y, limiterAvance = true) {
    if (reduit) { scrollTo(0, borne(y)); return; }
    cible = borne(limiterAvance ? Math.max(scrollY - innerHeight * AVANCE, Math.min(scrollY + innerHeight * AVANCE, y)) : y);
    if (!enCours) { enCours = true; dernier = 0; requestAnimationFrame(glisser); }
  }

  function glisser(now) {
    const dt = dernier ? Math.min(0.05, (now - dernier) / 1000) : 1 / 60;
    dernier = now;
    const ecart = cible - scrollY;
    if (Math.abs(ecart) < 0.5) { enCours = false; return; }
    const pas = Math.sign(ecart) * Math.min(Math.abs(ecart) * (1 - Math.exp(-dt * 9)) + 0.5, VITESSE * dt);
    scrollTo(0, scrollY + pas);
    requestAnimationFrame(glisser);
  }

  if (!reduit) {
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || bloque()) return;
      // Zones qui défilent elles-mêmes (texte, code, modales) : on les laisse faire
      if (e.target.closest && e.target.closest('textarea, select, pre, .proj-modal, .lightbox, .lb-body')) return;
      e.preventDefault();
      if (parLaNavSeulement()) return;
      const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      aller((enCours ? cible : scrollY) + d);
    }, { passive: false });

    addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || bloque() || (e.target.closest && e.target.closest('input, textarea, select, button, [contenteditable], [role="button"]'))) return;
      if (parLaNavSeulement()) { if (TOUCHES[e.key] !== undefined || e.key === 'Home' || e.key === 'End') e.preventDefault(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); aller(e.key === 'Home' ? 0 : max(), false); return; }
      const v = TOUCHES[e.key];
      if (v === undefined) return;
      e.preventDefault();
      const d = Math.abs(v) < 1 ? v * innerHeight : v;
      aller((enCours ? cible : scrollY) + (e.shiftKey && e.key === ' ' ? -d : d));
    });
  }

  // Liens internes (#Projets…) : on descend les marches jusqu'à la partie, à la même vitesse
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const dest = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!dest) return;
    e.preventDefault();
    const partir = () => {
      // mode fenêtres : la partie est une fenêtre sur son île ; on descend jusqu'à l'île
      const pos = window.positionIle ? window.positionIle(dest.id) : null;
      aller(pos != null ? pos : dest.getBoundingClientRect().top + scrollY - 24, false);
      history.replaceState(null, '', a.getAttribute('href'));
      dest.setAttribute('tabindex', '-1');
      dest.focus({ preventScroll: true });
    };
    // sur l'île de la veille, Lugulabre nous dit d'abord au revoir (main.js)
    if (window.Veille && window.Veille.actif && dest.id !== 'Veilles') window.Veille.partir(partir);
    else partir();
  });

  addEventListener('scroll', () => { if (!enCours) cible = scrollY; }, { passive: true });
})();
