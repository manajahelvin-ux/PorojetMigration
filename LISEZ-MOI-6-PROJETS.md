# Les 6 projets FONCTIONNELS — ZIP final
_Regroupement des 6 landing pages traitées (même principe pour toutes, identité de chacune préservée). Généré le 2026-10-26 depuis `main` (PR #1 à #9 mergées)._

## Contenu du ZIP
| Dossier | Projet | Particularité |
|---|---|---|
| `assurance-tns-pro-v2-adw/` | Assurance TNS Pro | LP de référence du traitement |
| `assurance-tns/` | Assurance TNS | Hero bleu nuit d'origine conservé |
| `agriculteur/` | Assurance Agriculteur | Questions agricoles lues automatiquement |
| `assurance-consultants-societe-conseil/` | Consultants & Société de Conseil | Nouveau visuel hero consultants |
| `assurance-consultant-societe-conseil-v2/` | Wrapper iframe v2 | Page iframe + pont parent (GTM + relais SMS), pas de formulaire propre |
| `solutions-agv-amr/` | Solutions AGV & AMR | Nouveau visuel entrepôt automatisé, H1 unique |

Chaque dossier est **autonome** : il suffit de l'héberger tel quel (statique / HTTPS). Il contient son `RAPPORT-MODIFICATIONS.md` et un dossier `docs/` (analyse, configuration CRM / Google Sheets / GTM, vérification SMS, `Code.gs`).

## Fonctionnement commun (5 LP à formulaire)
- Envoi autonome (hors Webflow) via `lead-handler.js` → **CRM HelloLead** + **Google Sheets** en parallèle, succès affiché seulement si l'une des livraisons confirme ; honeypot anti-spam.
- **Vérification du numéro par SMS** (`verification-sms.js`) : mobile 06/07, code à 6 chiffres (10 min, usage unique), renvoi bloqué 120 s, erreurs 422/404/409/410/429/502 affichées. **L'envoi du lead est bloqué tant que le numéro n'est pas vérifié** ; `telephone_verifie=oui` est transmis au CRM, à la feuille et à GTM.
- Tracking URL complet (UTM, `ltm_*`, click IDs) **filtré par le consentement** cookies ; événement GTM `formulaire_lead` / `formulaire_micro_entrepreneur` ; pont iframe prêt.
- QA navigateur (console) : `lpLead.preview()`, `lpTracking.inspect()`, `smsVerification.estVerifie()`.

## Wrapper iframe
`bridge.js` relaie le consentement et l'URL publique vers l'iframe, et exécute les appels SMS pour la LP hébergée (`sms-request` → API → `sms-response`, poignée de main avec nonce). Conditions : la LP enfant doit autoriser l'origine du wrapper comme parent, et l'API SMS doit autoriser cette origine en CORS (voir `assurance-consultant-societe-conseil-v2/docs/VERIFICATION-SMS.md`).

## Checklist de mise en production
1. **CRM (HelloLead)** — enregistrer les `formId` puis vérifier un lead réel :
   - `ADW_LP_ASSURANCE_TNS_PRO`, `ADW_LP_ASSURANCE_TNS`, `ADW_LP_ASSURANCE_AGRICULTEUR`, `ADW_LP_ASSURANCE_CONSULTANTS_SOCIETE_CONSEIL`
   - `ADW_LP_SOLUTIONS_AGV_AMR` : déjà en production, rien à enregistrer.
2. **API SMS (CORS)** — autoriser l'origine publique de chaque LP (et du wrapper) côté `mc.hellolead.pro`, sinon le navigateur ne pourra pas lire les réponses SMS.
3. **GTM** (`GTM-53SH7D7F`) — contrôler en mode Aperçu les événements et variables avec consentement accepté.
4. **Test réel de bout en bout** par LP, dans un **nouveau dossier/onglet** (cache) : parcours complet → SMS reçu → code vérifié → lead visible dans le CRM **et** la feuille Google.
5. Si un dossier est servi dans une iframe, suivre son `docs/` (embed parent, `publicLandingPath`).

## Historique (dépôt GitHub)
- PR #5 : TNS Pro FONCTIONNEL · PR #6 : TNS · PR #7 : Agriculteur + Consultants + Wrapper · PR #8 : Solutions AGV & AMR · PR #9 : vérification SMS sur les 6.
