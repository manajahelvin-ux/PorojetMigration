# Configuration — page wrapper `assurance-consultant-societe-conseil-v2`

## Structure
- `index.html` : Consent Mode V2 (default denied) + GTM-53SH7D7F + iframe pleine page vers la LP hébergée.
- `bridge.js` : pont parent sans SMS (consentement + URL parente) vers l'iframe `#lp-assurance-frame`.
- `style.css` : contient la règle `.lp-assurance-frame` (plein écran) — conservée telle quelle.

## Changer la LP embarquée
Éditer l'attribut `src` de l'iframe dans `index.html`. Pour être conforme « sans SMS », la cible doit être l'une des LP traitées de ce dépôt (hébergée publiquement), par ex. `assurance-consultants-societe-conseil` ou `assurance-tns-pro-v2-adw` — leurs `lead-handler.js` savent recevoir le pont (`consent-state` / `landing-url`).
Après changement de domaine cible, mettre à jour `CHILD_ORIGIN` dans `bridge.js`.

## Conditions d'efficacité du pont
- La LP enfant doit accepter l'origine de CE domaine comme parent autorisé (nos LP traitées : oui, via `document.referrer`).
- Servir en HTTPS : `postMessage` cible une origine explicite (jamais `*`), et le referrer peut être filtré sinon.
- Si la page parente est elle-même dans une iframe, définir l'URL publique côté enfant via `window.__TNS_ENTRY_URL__` ou `publicLandingPath` du handler.

## GTM
Conteneur `GTM-53SH7D7F` partagé avec les autres LP. Les conversions proviennent de l'iframe (dataLayer de la LP enfant) — à mesurer via le mode Aperçu sur le domaine de la LP enfant, pas sur ce wrapper.
