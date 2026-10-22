"""
Traduction : sort tous les textes de index.html vers lang/fr.js et met des clés à leur place.

  py -3.13 _outils/i18n_extraire.py            (à lancer une seule fois : index.html est réécrit)

- Texte simple       -> <p data-i18n="cle"></p>            (lang/fr.js : "cle": "le texte")
- Texte avec balises -> <p data-i18n-html="cle"></p>       (strong, br, span.ac… gardés dans la traduction)
- Texte mêlé à une icône (svg) -> le texte est enveloppé : <span data-i18n="cle"></span>
- Attributs (alt, title, placeholder, aria-label, data-palier, data-title, data-cert, content)
  -> data-i18n-attr="alt=cle;aria-label=cle2"
Dans <head>, le titre et la description gardent aussi leur texte français (pour les robots sans JavaScript).
Les textes sont recopiés tels quels (fautes comprises) ; seuls les blancs en trop sont réduits.
"""
import html
import json
import os
import re
from html.parser import HTMLParser

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDES = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
MISE_EN_FORME = {'strong', 'b', 'em', 'i', 'br', 'span', 'small', 'sup', 'sub', 'u', 'mark', 'abbr'}
ATTRIBUTS = ['alt', 'title', 'placeholder', 'aria-label', 'data-palier', 'data-title', 'data-cert']
LETTRE = re.compile(r'[A-Za-zÀ-ÖØ-öø-ÿ]')
ZONES = {'sidebar': 'nav', 'lightbox': 'lb', 'Accueil': 'accueil', 'APropos': 'apropos', 'Formation': 'formation',
         'Outils': 'outils', 'Projets': 'projets', 'Stage': 'stages', 'Certifications': 'certifs',
         'Veilles': 'veille', 'Evenements': 'evenements', 'Contact': 'contact'}
NOMS = {'sec-title': 'titre', 'sec-sub': 'sous', 'ct-title': 'titre', 'ct-sub': 'sous', 'sb-label': 'lien',
        'tl-step': 'etape', 'tl-title': 'etape_titre', 'tl-desc': 'etape_texte', 'tc-year': 'annee'}


class Noeud:
    def __init__(self, tag, attrs, debut, fin_ouv, parent):
        self.tag, self.attrs, self.debut, self.fin_ouv, self.parent = tag, dict(attrs), debut, fin_ouv, parent
        self.ferm = None            # position de '</tag>'
        self.enfants, self.textes = [], []   # textes : (début, fin) des morceaux de texte directs
        self.ignore = tag in ('svg', 'script', 'style') or (parent is not None and parent.ignore)


class Lecteur(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.src = source
        self.lignes = [0]
        for m in re.finditer('\n', source):
            self.lignes.append(m.end())
        self.racine = Noeud('#doc', [], 0, 0, None)
        self.pile = [self.racine]

    def pos(self):
        l, c = self.getpos()
        return self.lignes[l - 1] + c

    def handle_starttag(self, tag, attrs):
        d = self.pos()
        n = Noeud(tag, attrs, d, d + len(self.get_starttag_text()), self.pile[-1])
        self.pile[-1].enfants.append(n)
        if tag not in VIDES:
            self.pile.append(n)

    def handle_startendtag(self, tag, attrs):
        d = self.pos()
        n = Noeud(tag, attrs, d, d + len(self.get_starttag_text()), self.pile[-1])
        self.pile[-1].enfants.append(n)

    def handle_endtag(self, tag):
        d = self.pos()
        for k in range(len(self.pile) - 1, 0, -1):
            if self.pile[k].tag == tag:
                self.pile[k].ferm = d
                del self.pile[k:]
                return

    def _texte(self, longueur):
        d = self.pos()
        self.pile[-1].textes.append((d, d + longueur))

    def handle_data(self, data):
        self._texte(len(data))

    def handle_entityref(self, name):
        self._texte(len(name) + 2)

    def handle_charref(self, name):
        self._texte(len(name) + 3)


def main():
    chemin = os.path.join(RACINE, 'index.html')
    src = open(chemin, encoding='utf-8').read()
    lec = Lecteur(src)
    lec.feed(src)
    dico, compteurs, modifs, ajouts = {}, {}, [], {}

    def zone(n):
        while n is not None:
            if n.attrs.get('id') in ZONES:
                return ZONES[n.attrs['id']]
            if n.tag == 'head':
                return 'meta'
            n = n.parent
        return 'commun'

    def cle(n, nom=None):
        z = zone(n)
        if nom is None:
            classes = (n.attrs.get('class') or '').split()
            nom = NOMS.get(classes[0], classes[0].replace('-', '_')) if classes else n.tag
        base = f'{z}.{nom}'
        compteurs[base] = compteurs.get(base, 0) + 1
        return base if compteurs[base] == 1 else f'{base}_{compteurs[base]}'

    def a_du_texte(n):
        return any(LETTRE.search(src[a:b]) for a, b in n.textes)

    def tout_en_ligne(n):
        for e in n.enfants:
            if e.tag not in MISE_EN_FORME or 'id' in e.attrs or not tout_en_ligne(e):
                return False
        return True

    def propre(t):
        return re.sub(r'\s+', ' ', t).strip()

    def ajouter_attr(n, texte):
        ajouts.setdefault(n, []).append(texte)

    def parcourir(n):
        if n.ignore:
            return
        # attributs
        paires = []
        for a in ATTRIBUTS + (['content'] if n.tag == 'meta' and n.attrs.get('name') == 'description' else []):
            v = n.attrs.get(a)
            if v and LETTRE.search(v):
                k = cle(n, a.replace('-', '_') if a != 'content' else 'description')
                dico[k] = html.unescape(v)
                paires.append(f'{a}={k}')
        if paires:
            ajouter_attr(n, f' data-i18n-attr="{";".join(paires)}"')
        dans_tete = zone(n) == 'meta'
        # texte
        if n.ferm is not None and a_du_texte(n):
            interieur = src[n.fin_ouv:n.ferm]
            if tout_en_ligne(n):
                k = cle(n, 'titre' if n.tag == 'title' else None)
                avec_balises = bool(n.enfants) or '&' in interieur
                if n.enfants:
                    dico[k] = propre(interieur)
                    ajouter_attr(n, f' data-i18n-html="{k}"')
                else:
                    dico[k] = html.unescape(propre(interieur))
                    ajouter_attr(n, f' data-i18n="{k}"')
                if not dans_tete:
                    modifs.append((n.fin_ouv, n.ferm, ''))
                return
            # texte mêlé à des éléments non textuels (icônes) : on enveloppe chaque morceau de texte
            for a, b in n.textes:
                morceau = src[a:b]
                if not LETTRE.search(morceau):
                    continue
                k = cle(n)
                dico[k] = html.unescape(propre(morceau))
                gauche = morceau[:len(morceau) - len(morceau.lstrip())]
                droite = morceau[len(morceau.rstrip()):]
                modifs.append((a, b, f'{gauche}<span data-i18n="{k}"></span>{droite}'))
        for e in n.enfants:
            parcourir(e)

    parcourir(lec.racine)
    # balises ouvrantes : ajout des clés, et (hors <head>) attributs traduits vidés pour ne rien dupliquer
    for n, morceaux in ajouts.items():
        ouv = src[n.debut:n.fin_ouv]
        if zone(n) != 'meta':
            for a in ATTRIBUTS:
                ouv = re.sub(r'(\s' + re.escape(a) + r')="[^"]*"', lambda m: m.group(1) + '=""', ouv)
        fin = len(ouv) - (2 if ouv.endswith('/>') else 1)
        while ouv[fin - 1] == ' ':
            fin -= 1
        modifs.append((n.debut, n.fin_ouv, ouv[:fin] + ''.join(morceaux) + ouv[fin:]))
    # application de la fin vers le début (les positions restent justes)
    for a, b, r in sorted(modifs, key=lambda m: (m[0], m[1]), reverse=True):
        src = src[:a] + r + src[b:]
    open(chemin, 'w', encoding='utf-8', newline='').write(src)
    os.makedirs(os.path.join(RACINE, 'lang'), exist_ok=True)
    with open(os.path.join(RACINE, 'lang', 'fr-page.json'), 'w', encoding='utf-8') as f:
        json.dump(dico, f, ensure_ascii=False, indent=2)
    print(len(dico), 'textes extraits ->', 'lang/fr-page.json')


if __name__ == '__main__':
    main()
