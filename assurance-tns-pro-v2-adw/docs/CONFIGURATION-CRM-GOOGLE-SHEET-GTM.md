# Configuration production — CRM, Google Sheets, GTM, Tracking URL
_LP `assurance-tns-pro-v2-adw` — la confirmation par code SMS reste **supprimée** (contact simple)._

Toute la configuration se fait dans **`lead-handler.js`** (en-tête du fichier) :

```js
var LEAD_CONFIG = {
  crm:         { url: '', format: 'json' },  // ← collez l'URL CRM ici
  googleSheet: { url: '' }                     // ← collez l'URL Apps Script ici
};
```

Le tracking URL et le GTM fonctionnent **sans** ces URL. Chaque lead validé déclenche, en parallèle et sans bloquer l'affichage « Merci ! » : **dataLayer GTM → sauvegarde locale → POST CRM → POST Google Sheets**.

---

## 1) Google Sheets (2 minutes)
1. Créez un Google Sheet, ex. **« Leads Assurance TNS »**.
2. Menu **Extensions → Apps Script** : effacez le contenu, collez le fichier **`docs/Code.gs`** de ce dossier.
3. *(Optionnel)* Dans `Code.gs`, renseignez `EMAIL_NOTIFICATION = 'vous@exemple.fr'` pour recevoir un e-mail à chaque lead.
4. **Déployer → Nouveau déploiement → Application Web** :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde**
   - Autorisez les accès demandés, puis copiez l'URL `https://script.google.com/macros/s/AKfyc…/exec`.
5. Collez-la dans `lead-handler.js` → `googleSheet.url`. Re-déployez le site.
6. Test : soumettez le formulaire → une ligne apparaît dans l'onglet **Leads** (34 colonnes : identité, besoins en clair, UTM, click IDs…).

> ⚠️ Toute modification ultérieure de `Code.gs` nécessite un **nouveau déploiement** (ou « Gérer les déploiements → Modifier → Nouvelle version ») pour être prise en compte sur la même URL `/exec`.

## 2) CRM (HelloLead, HubSpot, Pipedrive, Make, Zapier…)
1. Récupérez l'URL de webhook/endpoint « nouveau lead » de votre CRM (pour HelloLead : demandez à votre contact l'endpoint de réception des leads de la LP, ou passez par Make/Zapier en relais).
2. Collez-la dans `lead-handler.js` → `crm.url`.
3. Format : laissez `'json'` (POST JSON). Si le CRM attend un formulaire classique, mettez `'form'` (POST `x-www-form-urlencoded`).
4. Le payload contient **tous les champs bruts** du formulaire (compatibilité Webflow : `nom`, `mail`, `reponse_1_1`…) **+** les champs normalisés (`email`, `telephone_e164`, `type_contrat` en libellés lisibles, `utm_*`, `gclid`…). Détail dans la console navigateur : `[lead-handler] Lead capture :` après chaque envoi, et dans `sessionStorage > dernier_lead`.

## 3) GTM (GTM-53SH7D7F déjà installé sur la page)
À chaque lead, la page pousse dans le `dataLayer` :
```js
{ event: 'formulaire_lead',               // ou 'formulaire_micro_entrepreneur' si auto-entrepreneur = Oui
  form_name: 'Assurance-TNS-Pro-Form',
  lead_source, lead_categorie,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  gclid, fbclid, msclkid,
  user_data: { email, phone_number,       // format +33… (conversions améliorées)
               address: { first_name, last_name, postal_code, country: 'FR' } } }
```
Réglages recommandés dans GTM :
- **Déclencheurs** → *Événement personnalisé* : `formulaire_lead` et `formulaire_micro_entrepreneur`.
- **Variables** → *Variable de couche de données* : `user_data`, `utm_campaign`, `gclid`, `lead_source` (selon vos besoins de reporting).
- **Balises** :
  - GA4 : événement `generate_lead` sur ces déclencheurs, paramètres = variables ci-dessus.
  - Google Ads : conversion avec **conversions améliorées** → variable « Données fournies par l'utilisateur » pointant sur `user_data` (le hachage SHA-256 est fait par Google).
- **Aperçu GTM** : soumettez un lead de test, vérifiez l'événement et les variables, puis publiez.
- Le **Consent Mode V2** de la page (tout refusé par défaut, mis à jour par le bandeau cookies) est déjà en place : pensez à vérifier vos paramètres de consentement par balise.

## 4) Tracking URL (automatique, rien à configurer)
Capturés dès l'arrivée (et conservés entre visites via `localStorage` → champs cachés → payload CRM/Sheets/GTM) :
`utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, gbraid, wbraid, fbclid, msclkid, ttclid` + convention partenaire : `source ← ltm_source > utm_source`, `categorie ← ltm_category > utm_category`, `user ← ltm_user`. S'y ajoutent `page_url` et `referrer`.

**URL de test complète :**
```
https://assurance-tns-pro-v2-adw.lp.comparateurpro.fr/?utm_source=google&utm_medium=cpc&utm_campaign=test_tns&gclid=TEST123&ltm_source=ADW_tns&ltm_user=42
```
→ après envoi du formulaire, la ligne Sheets / le lead CRM doivent montrer : Source = `ADW_tns`, UTM Source = `google`, GCLID = `TEST123`, User = `42`.
La redirection page de remerciement (`?ltm_typ=…`) et le pont iframe Hellodevis (`postMessage` → `source/categorie/user`, désormais fonctionnel grâce aux `id` ajoutés) restent inchangés.

## Checklist finale
- [ ] `googleSheet.url` renseignée → lead test visible dans l'onglet **Leads**
- [ ] `crm.url` renseignée → lead test visible dans le CRM (ou Make/Zapier)
- [ ] Aperçu GTM : `formulaire_lead` reçu avec `user_data` + UTM
- [ ] URL de test ci-dessus : attribution correcte end-to-end
- [ ] Parcours complet sans erreur jusqu'à « Merci ! »
