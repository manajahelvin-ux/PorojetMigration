# UBEPro complet - Version 2 FONCTIONNELLE
_Application du traitement des 6 LP du depot (PR #5 a #9) a l'ensemble du site contenu dans `ubpro_complet_foctionnel.rar` : **176 pages**. 2026-10-27. Les 6 LP precedemment traitees a la racine du depot restent la reference fine (heros generes, docs par LP)._

## Audit de l'existant (contenu du .rar)
Exports Webflow convertis (lp2site), `lang=fr` partout. Sur 175 pages, chaque `script.js` se termine par un **gestionnaire integre minifie commun** (`2026-10-26-ubepro-autonome`) qui : s'attache a **tous** les `<form>` (y compris panier/recherche/mot de passe), affiche le « Merci » **avant** l'envoi, envoie en aveugle (beacon/fetch no-cors, erreurs ignorees), sans validation, sans honeypot bloquant, sans filtrage de consentement, sans SMS, avec un `formId` = id HTML du formulaire (non enregistrable proprement au CRM).

## Classification et traitement applique (176 pages)
| Categorie | Pages | Traitement |
|---|---|---|
| **A - Formulaire lead avec telephone** | 97 | Traitement complet (ci-dessous) |
| **B - Formulaire lead sans telephone** | 2 (`fuso-v2`, `solutions-agv`) | Complet, sans verification SMS (aucun champ telephone) |
| **C - Qualification seule** (questions, pas de coordonnees : tunnel en 2 temps vers les `formulaires-typ`) | 56 | **Inchanges** (voir choix) |
| **D - Pages/contenus/TYP/commerce/utilitaires/portails** | 21 | Gestionnaire integre retire (il interceptait panier, recherche, mot de passe) |

### Traitement complet (categories A et B, 99 pages)
1. Gestionnaire integre retire du bundle, remplace par **`lead-handler.js`** (le standard du parc, adapte) : livraisons **CRM + Google Sheets verifiees** (succes affiche seulement si l'une confirme, sinon erreur + reessai), validations e-mail/code postal/telephone, honeypot, garde derniere etape, message « Merci » de secours si la page n'en a pas.
2. **Verification SMS** (`verification-sms.js`, 97 pages A) : mobile 06/07, `envoyer_code`/`verifier_code`, code 6 chiffres/10 min/usage unique, renvoi bloque 120 s, erreurs 422/404/409/410/429/502 lues dans le JSON. **L'envoi du lead est bloque tant que le numero n'est pas verifie** ; `telephone_verifie` transmis au CRM, a Sheets et a GTM.
3. **Tracking URL filtre par le consentement** (banniere `user_cookie_preferences` / `ubeproCookiePreferencesV1`) : UTM/page si analytics, click IDs + `user_data` si marketing ; champs caches completes (~1 250 ajoutes) ; source de secours propre a chaque page (le placeholder `SOURCE PAR DEFAUT` elimine).
4. **Noms de champs Webflow variables** (`telephone-2`, `Nom 2`, `Email`...) resolus par nom normalise (casse/accents/separateurs/suffixes) dans le handler et le module SMS.
5. **GTM-53SH7D7F ajoute** aux 26 pages lead qui n'avaient aucun conteneur (les autres conservent le leur : GTM-WMVZJKS ou 53SH7D7F).
6. **H1 prudent** (42 pages) : pages a H1 multiples retrogradees en un H1 unique (classes conservees), titre hero promu en H1 quand il est identifiable sans ambiguite. Rendu inchange.
7. APIs QA conservees/compatibles : `lpLead.preview()`, `lpTracking.inspect()`, alias `ubeproLead`/`agvLead`/`tnsLead`, `smsVerification.estVerifie()`.

### Choix assumes (ecarts par rapport aux traitements unitaires)
- **Categorie C inchangee fonctionnellement** : ces formulaires ne collectent aucune coordonnee (qualification) ; la capture se fait sur les formulaires coordonnees (notamment les `formulaires-typ/*`, traites en categorie A). Modifier leur tunnel (redirections Formly obfusquees) sans pouvoir le tester de bout en bout aurait ete risqué. Le gestionnaire integre y est donc conserve tel quel.
- **Images hero conservees** : aucun visuel hors-sujet detecte (recherche par empreinte de l'ancienne image defaut : 0 occurrence) et chaque verticale a son visuel metier ; pas de regeneration en masse.
- **Documents** : ce rapport global remplace les `docs/` par LP (les 6 LP de la racine du depot conservent leur documentation fine, dont `docs/VERIFICATION-SMS.md` de reference).
- **Format d'archive** : la v2 est livree en **.zip** (la creation .rar exige WinRAR proprietaire, indisponible dans cet environnement ; contenu strictement identique, extractible partout).

## Tests effectues
- **99/99 formulaires** testes en jsdom + vrai jQuery (formulaires reels extraits des pages) : envoi refuse sans verification SMS -> envoi du code -> verification -> lead CRM recu avec le bon `formId`, `telephone_verifie=oui` et envoi Sheets. Pages B : envoi direct controle.
- 315 fichiers JS valides par `node --check` (bundles modifies + handlers + modules).
- Controles statiques : 99 handlers, 97 modules SMS ; aucun endpoint SMS residuel hors des modules ; bloc integre uniquement conserve sur la categorie C (56) ; HTTP 200 sur echantillon servi localement.
- Correctif issu des tests : champs Webflow suffixes (`telephone-2` sur `ds-automobiles-nouvelle-gamme-pallas`) — resolution par nom normalise ajoutee puis banc complet relance (99/99).

## Checklist de lancement
1. **CRM** : enregistrer/valider les `formId` ci-dessous (convention `ADW_LP_<SLUG>` derivee du dossier) puis verifier un lead reel par famille. `ADW_LP_SOLUTIONS_AGV_AMR` est deja en production ; `ADW_LP_ASSURANCE_TNS_PRO` (page `assurance-tns-pro`) correspond a la LP deja traiteee a la racine du depot.
2. **API SMS (CORS)** : autoriser chaque origine de deploiement cote `mc.hellolead.pro` (appels directs navigateur).
3. **GTM** : apercu par famille de pages (evenements `formulaire_lead` / `formulaire_micro_entrepreneur`).
4. **Tunnel complet** : LP de qualification (categorie C) -> formulaire coordonnees -> SMS reel -> lead CRM visible.
5. Pages portails a iframes internes (`typ-categories`, `verisure`...) : les formulaires enfants appelleront l'API directement ; le tracking parent reste celui de la page enfant.

## Annexe - Identites CRM des 99 formulaires traites
| Dossier | formId | source de secours | SMS |
|---|---|---|---|
| `actiflip-rayonnage` | `ADW_LP_ACTIFLIP_RAYONNAGE` | LP ACTIFLIP RAYONNAGE | oui |
| `assurance-tns-pro` | `ADW_LP_ASSURANCE_TNS_PRO` | LP TNS PRO | oui |
| `assurances-professionnelles` | `ADW_LP_ASSURANCES_PROFESSIONNELLES` | LP ASSURANCES PROFESSIONNELLES | oui |
| `avantages-salaries` | `ADW_LP_AVANTAGES_SALARIES` | LP AVANTAGES SALARIES | oui |
| `bar-business-canalplus` | `ADW_LP_BAR_BUSINESS_CANALPLUS` | LP BAR BUSINESS CANALPLUS | oui |
| `cartes-cadeaux-noel` | `ADW_LP_CARTES_CADEAUX_NOEL` | LP CARTES CADEAUX NOEL | oui |
| `cartes-et-cheques-cadeaux-salaries-kadeos` | `ADW_LP_CARTES_ET_CHEQUES_CADEAUX_SALARIES_KADEOS` | LP CARTES ET CHEQUES CADEAUX SALARIES KA | oui |
| `celebrez-le-noel-des-salaries-avec-kadeos` | `ADW_LP_CELEBREZ_LE_NOEL_DES_SALARIES_AVEC_KADEOS` | LP CELEBREZ LE NOEL DES SALARIES AVEC KA | oui |
| `citroen` | `ADW_LP_CITROEN` | LP CITROEN | oui |
| `commerce` | `ADW_LP_COMMERCE` | LP COMMERCE | oui |
| `comparer-caisse-enregistreuse-commerce-2025` | `ADW_LP_COMPARER_CAISSE_ENREGISTREUSE_COMMERCE_2025` | LP COMPARER CAISSE ENREGISTREUSE COMMERC | oui |
| `courtier-energies-industries` | `ADW_LP_COURTIER_ENERGIES_INDUSTRIES` | LP COURTIER ENERGIES INDUSTRIES | oui |
| `destockage-fuso-ecanter` | `ADW_LP_DESTOCKAGE_FUSO_ECANTER` | LP DESTOCKAGE FUSO ECANTER | oui |
| `devis-securite` | `ADW_LP_DEVIS_SECURITE` | LP DEVIS SECURITE | oui |
| `devispro-solaire` | `ADW_LP_DEVISPRO_SOLAIRE` | LP DEVISPRO SOLAIRE | oui |
| `diagnostic-accessibilite-erp` | `ADW_LP_DIAGNOSTIC_ACCESSIBILITE_ERP` | LP DIAGNOSTIC ACCESSIBILITE ERP | oui |
| `ds-automobiles-business-days` | `ADW_LP_DS_AUTOMOBILES_BUSINESS_DAYS` | LP DS AUTOMOBILES BUSINESS DAYS | oui |
| `ds-automobiles-nouvelle-gamme-pallas` | `ADW_LP_DS_AUTOMOBILES_NOUVELLE_GAMME_PALLAS` | LP DS AUTOMOBILES NOUVELLE GAMME PALLAS | oui |
| `ds-automobiles-nouvelle-gamme-pallas-v1` | `ADW_LP_DS_AUTOMOBILES_NOUVELLE_GAMME_PALLAS_V1` | LP DS AUTOMOBILES NOUVELLE GAMME PALLAS  | oui |
| `ds-business-days` | `ADW_LP_DS_BUSINESS_DAYS` | LP DS BUSINESS DAYS | oui |
| `ecomobility` | `ADW_LP_ECOMOBILITY` | LP ECOMOBILITY | oui |
| `ecomobility-construction` | `ADW_LP_ECOMOBILITY_CONSTRUCTION` | LP ECOMOBILITY CONSTRUCTION | oui |
| `ecomobility-geolocalisation` | `ADW_LP_ECOMOBILITY_GEOLOCALISATION` | LP ECOMOBILITY GEOLOCALISATION | oui |
| `ecomobility-transport` | `ADW_LP_ECOMOBILITY_TRANSPORT` | LP ECOMOBILITY TRANSPORT | oui |
| `edenred-kadeos` | `ADW_LP_EDENRED_KADEOS` | LP EDENRED KADEOS | oui |
| `edenred-la-nouvelle-ere-du-ticket-restaurant` | `ADW_LP_EDENRED_LA_NOUVELLE_ERE_DU_TICKET_RESTAURANT` | LP EDENRED LA NOUVELLE ERE DU TICKET RES | oui |
| `edf-solutions` | `ADW_LP_EDF_SOLUTIONS` | LP EDF SOLUTIONS | oui |
| `edf-solutions-solaires-professionnels` | `ADW_LP_EDF_SOLUTIONS_SOLAIRES_PROFESSIONNELS` | LP EDF SOLUTIONS SOLAIRES PROFESSIONNELS | oui |
| `energie` | `ADW_LP_ENERGIE` | LP ENERGIE | oui |
| `energie-commerce-bouche` | `ADW_LP_ENERGIE_COMMERCE_BOUCHE` | LP ENERGIE COMMERCE BOUCHE | oui |
| `energie-industrie` | `ADW_LP_ENERGIE_INDUSTRIE` | LP ENERGIE INDUSTRIE | oui |
| `energie-pros` | `ADW_LP_ENERGIE_PROS` | LP ENERGIE PROS | oui |
| `energie-service` | `ADW_LP_ENERGIE_SERVICE` | LP ENERGIE SERVICE | oui |
| `exploitation-agricole` | `ADW_LP_EXPLOITATION_AGRICOLE` | LP EXPLOITATION AGRICOLE | oui |
| `fiat-pro` | `ADW_LP_FIAT_PRO` | LP FIAT PRO | oui |
| `financez-les-repas-de-vos-salaries-en-etant-exonere-a-100` | `ADW_LP_FINANCEZ_LES_REPAS_DE_VOS_SALARIES_EN_ETANT_EXONER` | LP FINANCEZ LES REPAS DE VOS SALARIES EN | oui |
| `form-energie` | `ADW_LP_FORM_ENERGIE` | LP FORM ENERGIE | oui |
| `form-securite` | `ADW_LP_FORM_SECURITE` | LP FORM SECURITE | oui |
| `formation-bureautique` | `ADW_LP_FORMATION_BUREAUTIQUE` | ADW | oui |
| `formation-management-pme` | `ADW_LP_FORMATION_MANAGEMENT_PME` | LP FORMATION MANAGEMENT PME | oui |
| `formation-wordpress` | `ADW_LP_FORMATION_WORDPRESS` | LP FORMATION WORDPRESS | oui |
| `formulaire-calendly` | `ADW_LP_FORMULAIRE_CALENDLY` | LP FORMULAIRE CALENDLY | oui |
| `formulaires-typ/formulaire-caisses` | `ADW_LP_FORMULAIRE_CAISSES` | LP FORMULAIRE CAISSES | oui |
| `formulaires-typ/formulaire-energie` | `ADW_LP_FORMULAIRE_ENERGIE` | LP FORMULAIRE ENERGIE | oui |
| `formulaires-typ/formulaire-leads` | `ADW_LP_FORMULAIRE_LEADS` | LP FORMULAIRE LEADS | oui |
| `formulaires-typ/formulaire-panneaux` | `ADW_LP_FORMULAIRE_PANNEAUX` | LP FORMULAIRE PANNEAUX | oui |
| `formulaires-typ/formulaire-securite` | `ADW_LP_FORMULAIRE_SECURITE` | LP FORMULAIRE SECURITE | oui |
| `formulaires-typ/formulaire-vehicules` | `ADW_LP_FORMULAIRE_VEHICULES` | LP FORMULAIRE VEHICULES | oui |
| `fuso` | `ADW_LP_FUSO` | LP FUSO | oui |
| `fuso-ecanter` | `ADW_LP_FUSO_ECANTER` | LP FUSO ECANTER | oui |
| `fuso-v2` | `ADW_LP_FUSO_V2` | LP FUSO V2 | non (pas de telephone) |
| `gamme-de-rayonnage-actiflip-hd` | `ADW_LP_GAMME_DE_RAYONNAGE_ACTIFLIP_HD` | LP GAMME DE RAYONNAGE ACTIFLIP HD | oui |
| `kiwatch` | `ADW_LP_KIWATCH` | LP KIWATCH | oui |
| `manutention-robotisee-rocla-agv-solutions` | `ADW_LP_MANUTENTION_ROBOTISEE_ROCLA_AGV_SOLUTIONS` | LP MANUTENTION ROBOTISEE ROCLA AGV SOLUT | oui |
| `methanisation-agricole` | `ADW_LP_METHANISATION_AGRICOLE` | LP METHANISATION AGRICOLE | oui |
| `mitsubishi-motors` | `ADW_LP_MITSUBISHI_MOTORS` | LP MITSUBISHI MOTORS | oui |
| `nettoyage-locaux-professionnels` | `ADW_LP_NETTOYAGE_LOCAUX_PROFESSIONNELS` | LP NETTOYAGE LOCAUX PROFESSIONNELS | oui |
| `nordpass-business` | `ADW_LP_NORDPASS_BUSINESS` | LP NORDPASS BUSINESS | oui |
| `panneaux-photovoltaiques` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES` | LP PANNEAUX PHOTOVOLTAIQUES | oui |
| `panneaux-photovoltaiques-passez-a-l-energie-solaire` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES_PASSEZ_A_L_ENERGIE_SOLAIR` | LP PANNEAUX PHOTOVOLTAIQUES PASSEZ A L E | oui |
| `panneaux-photovoltaiques-passez-a-lenergie-solaire-v2` | `ADW_LP_PANNEAUX_PHOTOVOLTAIQUES_PASSEZ_A_LENERGIE_SOLAIRE` | LP PANNEAUX PHOTOVOLTAIQUES PASSEZ A LEN | oui |
| `recrutement` | `ADW_LP_RECRUTEMENT` | LP RECRUTEMENT | oui |
| `recrutement-cadres-dirigeants` | `ADW_LP_RECRUTEMENT_CADRES_DIRIGEANTS` | LP RECRUTEMENT CADRES DIRIGEANTS | oui |
| `recrutement-commerciaux` | `ADW_LP_RECRUTEMENT_COMMERCIAUX` | LP RECRUTEMENT COMMERCIAUX | oui |
| `recrutement-fonctions-marketing` | `ADW_LP_RECRUTEMENT_FONCTIONS_MARKETING` | LP RECRUTEMENT FONCTIONS MARKETING | oui |
| `recrutement-industrie-btp-hotellerie-restauration` | `ADW_LP_RECRUTEMENT_INDUSTRIE_BTP_HOTELLERIE_RESTAURATION` | LP RECRUTEMENT INDUSTRIE BTP HOTELLERIE  | oui |
| `recrutement-it-tech` | `ADW_LP_RECRUTEMENT_IT_TECH` | LP RECRUTEMENT IT TECH | oui |
| `remerciements-assurances-collectives` | `ADW_LP_REMERCIEMENTS_ASSURANCES_COLLECTIVES` | LP REMERCIEMENTS ASSURANCES COLLECTIVES | oui |
| `remerciements-cartes-cadeaux` | `ADW_LP_REMERCIEMENTS_CARTES_CADEAUX` | LP REMERCIEMENTS CARTES CADEAUX | oui |
| `remerciements-geolocalisation` | `ADW_LP_REMERCIEMENTS_GEOLOCALISATION` | LP REMERCIEMENTS GEOLOCALISATION | oui |
| `remerciements-panneaux-solaire-2` | `ADW_LP_REMERCIEMENTS_PANNEAUX_SOLAIRE_2` | LP REMERCIEMENTS PANNEAUX SOLAIRE 2 | oui |
| `remerciements-panneaux-solaires` | `ADW_LP_REMERCIEMENTS_PANNEAUX_SOLAIRES` | LP REMERCIEMENTS PANNEAUX SOLAIRES | oui |
| `remerciements-ticket-restaurant` | `ADW_LP_REMERCIEMENTS_TICKET_RESTAURANT` | LP REMERCIEMENTS TICKET RESTAURANT | oui |
| `renault-trucks` | `ADW_LP_RENAULT_TRUCKS` | LP RENAULT TRUCKS | oui |
| `rothelec` | `ADW_LP_ROTHELEC` | LP ROTHELEC | oui |
| `securite` | `ADW_LP_SECURITE` | LP SECURITE | oui |
| `securite-devis` | `ADW_LP_SECURITE_DEVIS` | LP SECURITE DEVIS | oui |
| `securite-pro` | `ADW_LP_SECURITE_PRO` | LP SECURITE PRO | oui |
| `securite-telephone` | `ADW_LP_SECURITE_TELEPHONE` | LP SECURITE TELEPHONE | oui |
| `securite-v2` | `ADW_LP_SECURITE_V2` | LP SECURITE V2 | oui |
| `smart-electricite` | `ADW_LP_SMART_ELECTRICITE` | LP SMART ELECTRICITE | oui |
| `solutions-agv` | `ADW_LP_SOLUTIONS_AGV` | SMS | non (pas de telephone) |
| `solutions-agv-amr` | `ADW_LP_SOLUTIONS_AGV_AMR` | ADW | oui |
| `solutions-agv-amr-v2` | `ADW_LP_SOLUTIONS_AGV_AMR_V2` | LP SOLUTIONS AGV AMR V2 | oui |
| `still-manutention` | `ADW_LP_STILL_MANUTENTION` | LP STILL MANUTENTION | oui |
| `telesurveillance` | `ADW_LP_TELESURVEILLANCE` | LP TELESURVEILLANCE | oui |
| `test/form-assurance` | `ADW_LP_FORM_ASSURANCE` | LP FORM ASSURANCE | oui |
| `test/form-panneaux` | `ADW_LP_FORM_PANNEAUX` | LP FORM PANNEAUX | oui |
| `test/formulaire` | `ADW_LP_FORMULAIRE` | LP FORMULAIRE | oui |
| `ticket-restaurant` | `ADW_LP_TICKET_RESTAURANT` | LP TICKET RESTAURANT | oui |
| `ticket-restaurant-black-friday` | `ADW_LP_TICKET_RESTAURANT_BLACK_FRIDAY` | LP TICKET RESTAURANT BLACK FRIDAY | oui |
| `ticket-restaurant-commencez-l-annee-sans-frais` | `ADW_LP_TICKET_RESTAURANT_COMMENCEZ_L_ANNEE_SANS_FRAIS` | LP TICKET RESTAURANT COMMENCEZ L ANNEE S | oui |
| `ticket-restaurant-la-solution-defiscalisee-qui-regale-tout-le-monde` | `ADW_LP_TICKET_RESTAURANT_LA_SOLUTION_DEFISCALISEE_QUI_REG` | LP TICKET RESTAURANT LA SOLUTION DEFISCA | oui |
| `tout-schuss-sur-la-carte-ticket-restaurant` | `ADW_LP_TOUT_SCHUSS_SUR_LA_CARTE_TICKET_RESTAURANT` | LP TOUT SCHUSS SUR LA CARTE TICKET RESTA | oui |
| `toyota-gamme-vehicules-professionnels` | `ADW_LP_TOYOTA_GAMME_VEHICULES_PROFESSIONNELS` | LP TOYOTA GAMME VEHICULES PROFESSIONNELS | oui |
| `toyota-proace-max` | `ADW_LP_TOYOTA_PROACE_MAX` | LP TOYOTA PROACE MAX | oui |
| `une-rentree-sous-le-signe-du-pouvoir-dachat` | `ADW_LP_UNE_RENTREE_SOUS_LE_SIGNE_DU_POUVOIR_DACHAT` | LP UNE RENTREE SOUS LE SIGNE DU POUVOIR  | oui |
| `vehicules-de-societe` | `ADW_LP_VEHICULES_DE_SOCIETE` | LP VEHICULES DE SOCIETE | oui |
| `vehicules-utilitaires` | `ADW_LP_VEHICULES_UTILITAIRES` | LP VEHICULES UTILITAIRES | oui |
