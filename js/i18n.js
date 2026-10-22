/* ══════════════════════════════════════════════════════════════
   TRADUCTION FR / EN — chargé AVANT les autres scripts du site
   - Langue : le choix enregistré (bouton FR/EN, localStorage) passe en premier ; sinon la langue du
     navigateur : si elle commence par « fr » (fr-FR, fr-NC, fr-CA…), français ; sinon anglais.
   - Textes : lang/fr.js et lang/en.js. Dans la page :
       data-i18n="cle"        -> texte
       data-i18n-html="cle"   -> texte avec balises (strong, br…)
       data-i18n-attr="alt=cle;aria-label=cle2" -> attributs
     Dans le JavaScript : I18N.t('cle') (et I18N.t('cle', { nom: … }) pour remplacer {nom}).
   - Changer de langue recharge la page : les titres découpés en lettres, les plaques des torii en 3D
     et les fenêtres sont construits au chargement, dans la bonne langue.
══════════════════════════════════════════════════════════════ */
window.I18N = (function () {
  const TEXTES = { fr: window.TEXTES_FR || {}, en: window.TEXTES_EN || {} };
  const CLE_STOCKAGE = 'portfolio-langue';

  function choisir() {
    try {
      const memo = localStorage.getItem(CLE_STOCKAGE);
      if (memo && TEXTES[memo]) return memo;
    } catch (e) { /* stockage indisponible (navigation privée…) */ }
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
    return /^fr\b/i.test(nav) ? 'fr' : 'en';
  }

  const langue = choisir();
  const dico = TEXTES[langue];

  /** Texte d'une clé (repli sur le français, puis sur la clé elle-même) ; {x} remplacés par vars.x. */
  function t(cle, vars) {
    let v = dico[cle];
    if (v === undefined) v = TEXTES.fr[cle];
    if (v === undefined) return cle;
    if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return v;
  }

  function appliquer(racine) {
    const r = racine || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    r.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((paire) => {
        const i = paire.indexOf('=');
        if (i > 0) el.setAttribute(paire.slice(0, i).trim(), t(paire.slice(i + 1).trim()));
      });
    });
  }

  function changer(l) {
    if (!TEXTES[l] || l === langue) return;
    try { localStorage.setItem(CLE_STOCKAGE, l); } catch (e) { /* tant pis : la page change quand même */ }
    location.reload();
  }

  /** Bouton FR / EN (dans la barre de navigation, en bas). */
  function installerBouton() {
    const pied = document.querySelector('.sb-footer');
    if (!pied) return;
    const groupe = document.createElement('div');
    groupe.className = 'sb-langue';
    groupe.setAttribute('role', 'group');
    groupe.setAttribute('aria-label', t('nav.langue'));
    ['fr', 'en'].forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.toUpperCase();
      b.lang = l;
      b.setAttribute('aria-label', t('nav.langue_' + l));
      b.setAttribute('aria-pressed', String(l === langue));
      if (l === langue) b.classList.add('actif');
      b.addEventListener('click', () => changer(l));
      groupe.appendChild(b);
    });
    pied.appendChild(groupe);
  }

  document.documentElement.lang = langue;
  appliquer();
  installerBouton();
  return { langue, t, appliquer, changer };
})();
