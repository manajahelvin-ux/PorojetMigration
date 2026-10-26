# Rapport de modifications — `assurance-tns-pro-v2-adw`
_Intervention « solution rapide & efficace » — 2026-10-26_

## 1. Analyse rapide (avant intervention)
- Landing page Webflow convertie (lp2site) pour **ComparateurPro / HelloLead** : assurance protection sociale TNS (mutuelle santé, prévoyance, épargne-retraite Madelin).
- Formulaire **multistep 10 étapes** : type de contrat → régime → statut → nb salariés → assurances pro → assureur actuel → e-mail → société/CP → société existante → nom/prénom → téléphone + consentement.
- Tracking : **GTM-53SH7D7F**, Consent Mode V2, bandeau cookies, événement `dataLayer` = `formulaire_lead` (ou `formulaire_micro_entrepreneur`), sauvegarde `localStorage` + redirection `ltm_typ`.
- ⚠️ Constat n°1 : l'image de fond du haut de page (`img/hero-background.jpg`) montrait un **salon de beauté / spa** — hors sujet total pour une assurance TNS.
- ⚠️ Constat n°2 : **deux** systèmes de vérification par code SMS dans `script.js`.

## 2. Nouvelle image de fond (haut de page)
- ✅ Nouvelle image générée : **`img/hero-tns-pro.jpg`** (1376×768, 120 Ko) — 3 dirigeants/indépendants français en bureau lumineux, sujets à gauche, zone claire à droite derrière le formulaire.
- ✅ `style.css` : règle `.background-assurance-professionel.right-form-assurance.form-2-assurance` → nouvelle image + `background-position: left center`.
- ✅ Ancienne image `img/hero-background.jpg` supprimée (récupérable via Git).
- ✅ `<link rel="preload" as="image">` ajouté (LCP).

## 3. Suppression de la confirmation par code SMS → contact simple
Retiré de `script.js` (≈ 12 400 caractères) :
- ❌ Système **actif** « smspartner » : API `mc.hellolead.pro/mon_compte/api/smspartner/envoi_code_verification.php`, boutons injectés « Recevoir le code / Vérifier », compte à rebours 120 s, champ masqué `telephone_verifie`, **blocage du bouton Valider** tant que le numéro n'était pas vérifié.
- ❌ Ancien système **Axialys** (code mort, aucun élément HTML) : `…/api/axialys/envoi_code_verification.php`, handlers `.btn-verification`, `.champ-telephone-verification`, etc.
- ❌ Blocage résiduel dans `verification_champ()` + masque de saisie de l'ancien champ code.

Remplacé par une **validation contact simple** (~1 Ko) :
- Le bouton **Valider** redevient piloté par la logique d'origine : champs requis + « J'accepte » coché.
- Au submit : simple contrôle du **format téléphone FR (10 chiffres, fixe ou mobile)** avec message d'erreur inline — **aucun envoi de SMS, aucun code, aucun appel API externe**.
- Le reste du parcours est inchangé : envoi du lead, `dataLayer`, `localStorage`, redirection TYP.

> ⚠️ **Côté CRM** : si un filtre rejetait les leads sans `telephone_verifie=oui`, le désactiver — ce champ n'est plus émis (comportement voulu : on récupère le contact, point).

## 4. Correctifs SEO rapides (bonus, signalés dans l'ancien rapport)
- `lang="en"` → **`lang="fr"`**
- **H1** ajouté (le titre principal était un `<div>`, 0 H1 avant)
- Meta description complétée (était tronquée : « …vous avez l'assuran »)

## 5. Vérifications effectuées
- `node --check script.js` ✅ syntaxe valide
- Recherche exhaustive des endpoints/classes SMS dans `script.js` + `index.html` → **0 occurrence** ✅
- Test serveur local : page + `style.css` + `script.js` + nouvelle image → HTTP 200 ✅
- Restent dans `style.css` quelques classes CSS orphelines de l'ancien OTP (`.champ-telephone-verification`, etc.) : inertes, sans effet.

## Checklist avant mise en ligne
1. Parcours complet du formulaire jusqu'à « Merci ! » (sans étape SMS).
2. Réception du lead en CRM / Google Sheets + Tag Assistant (`formulaire_lead`).
3. ~~Test OTP SMS~~ → remplacé par : tester un numéro invalide (message d'erreur) puis un numéro valide (envoi direct).
