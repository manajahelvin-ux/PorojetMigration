/* =====================================================================
   lead-handler.js - Soumission autonome + CRM + Google Sheets + GTM
                     + Tracking URL (LP exportee Webflow, sans SMS)
   ---------------------------------------------------------------------
   >> CONFIGURATION (2 URL a coller, voir docs/CONFIGURATION-*.md) <<
   - crm.url          : webhook de votre CRM (HelloLead, Make, Zapier,
                        HubSpot...). Vide = pas d'envoi CRM.
   - googleSheet.url  : URL de l'application Web Apps Script deployee
                        depuis docs/Code.gs. Vide = pas d'envoi Sheets.
   Le tracking URL et le GTM fonctionnent meme sans ces URL.
   ===================================================================== */
var LEAD_CONFIG = {
  crm: {
    url: '',            // ex : 'https://votre-crm.exemple/webhook/leads'
    format: 'json'      // 'json' ou 'form' (x-www-form-urlencoded)
  },
  googleSheet: {
    url: ''             // ex : 'https://script.google.com/macros/s/AKfyc.../exec'
  }
};

(function () {
  'use strict';
  var form = document.querySelector('.form-ass');
  if (!form) return;
  var wrap = form.parentElement;
  var phone = form.querySelector('input[name="telephone"]');
  var btn = form.querySelector('.bouton-valider');
  var done = wrap ? wrap.querySelector('.w-form-done') : null;
  var fail = wrap ? wrap.querySelector('.w-form-fail') : null;
  var BTN_TEXT = btn ? btn.value : 'Valider'; // Formly ecrase en "Please wait..." au clic
  var envoye = false;

  if (fail) fail.style.display = 'none'; // panneau d'erreur Webflow : jamais

  /* ================= TRACKING URL =================
     Capture des parametres d'URL (publicite + partenaire), persistance
     entre visites (localStorage) et remplissage des champs caches.
     Priorites source : ltm_source > utm_source > source (comme l'original). */
  var TRACKING_DIRECT = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];
  var tracking = {};
  (function captureTracking() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem('tracking_params') || '{}') || {}; } catch (e) {}
    function depuisUrl(cle) { return params ? (params.get(cle) || '') : ''; }
    TRACKING_DIRECT.forEach(function (k) {
      tracking[k] = depuisUrl(k) || (k === 'msclkid' ? depuisUrl('MSCLKID') : '') || stored[k] || '';
    });
    // Champs metier (mapping d'origine de la LP)
    tracking.source = depuisUrl('ltm_source') || depuisUrl('utm_source') || depuisUrl('source') || stored.source || '';
    tracking.categorie = depuisUrl('ltm_category') || depuisUrl('utm_category') || depuisUrl('categorie') || stored.categorie || '';
    tracking.user = depuisUrl('ltm_user') || depuisUrl('user') || stored.user || '';
    try { localStorage.setItem('tracking_params', JSON.stringify(tracking)); } catch (e) {}
    // Remplissage des champs caches (sans ecraser une valeur deja presente,
    // sauf la source par defaut remplacee par la vraie source detectee)
    Object.keys(tracking).forEach(function (k) {
      var input = form.querySelector('input[name="' + k + '"]');
      if (!input || !tracking[k]) return;
      if (input.value === '' || (k === 'source' && input.value === 'SOURCE PAR DEFAUT')) {
        input.value = tracking[k];
      }
    });
    var pu = form.querySelector('input[name="page_url"]');
    if (pu && !pu.value) pu.value = location.href;
    var rf = form.querySelector('input[name="referrer"]');
    if (rf && !rf.value) rf.value = document.referrer || '';
  })();

  /* ================= Messages d'erreur ================= */
  var msg = null;
  if (phone) {
    msg = document.createElement('p');
    msg.setAttribute('role', 'status');
    msg.style.cssText = 'margin:8px 0;font-size:14px;color:#c62828;display:none';
    phone.insertAdjacentElement('afterend', msg);
    phone.addEventListener('input', function () { msg.style.display = 'none'; });
  }
  function erreur(t) {
    if (msg) { msg.textContent = t; msg.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.value = BTN_TEXT; }
  }
  function derniereEtape() { return !btn || btn.getClientRects().length > 0; }

  /* ================= Construction du lead ================= */
  function valeurChamp(nom) {
    var el = form.querySelector('input[name="' + nom + '"]');
    return el ? el.value : '';
  }
  function libellesCoches(prefixe, prefixeLib) {
    // Cases cochees -> libelles lisibles (champ cache reponse_lib_* ou texte affiche)
    var res = [];
    var cases = form.querySelectorAll('input[type="checkbox"]:checked');
    for (var i = 0; i < cases.length; i++) {
      var n = cases[i].name || '';
      if (n.indexOf(prefixe) !== 0) continue;
      var suffixe = n.slice(prefixe.length);
      var lib = valeurChamp(prefixeLib + suffixe);
      if (!lib) {
        var span = cases[i].closest('label') ? cases[i].closest('label').querySelector('span') : null;
        lib = span ? span.textContent.trim() : n;
      }
      res.push(lib);
    }
    return res.join(' | ');
  }
  function construireLead(champs) {
    var telBrut = champs.telephone || '';
    var telChiffres = telBrut.replace(/[\s.\-]/g, '');
    var assureur = '';
    var radio7 = form.querySelector('input[type="radio"][name="reponse_7"]:checked');
    if (radio7) assureur = radio7.value;
    else {
      var texte7 = form.querySelector('input[type="text"][name="reponse_7"]');
      assureur = texte7 ? texte7.value : '';
    }
    var lead = {
      formulaire: 'Assurance-TNS-Pro-Form',
      date: new Date().toISOString(),
      nom: champs.nom || '', prenom: champs.prenom || '',
      email: champs.mail || '',
      telephone: telBrut,
      telephone_e164: /^0[1-9]\d{8}$/.test(telChiffres) ? '+33' + telChiffres.slice(1) : telChiffres,
      societe: champs.societe || '', code_postal: champs.code_postal || '',
      type_contrat: libellesCoches('reponse_1_', 'reponse_lib_1_'),
      regime: champs.reponse_2 || '',
      auto_entrepreneur: champs.reponse_3 || '',
      nb_salaries: champs.reponse_4 || '',
      assurances_pro: libellesCoches('reponse_5_', 'reponse_lib_5_'),
      nb_vehicules: champs.reponse_champ_5_5 || '',
      assureur_actuel: assureur,
      societe_existante: champs.reponse_8 || '',
      consentement: champs.consentement || '',
      source: champs.source || tracking.source || 'SOURCE PAR DEFAUT',
      categorie: champs.categorie || tracking.categorie || '',
      user: champs.user || tracking.user || '',
      coordonnee: champs.coordonnee || '1',
      page: location.href,
      referrer: document.referrer || ''
    };
    TRACKING_DIRECT.forEach(function (k) { lead[k] = champs[k] || tracking[k] || ''; });
    // Payload final : champs bruts (compatibilite Webflow/CRM) + champs normalises
    var payload = {};
    Object.keys(champs).forEach(function (k) { payload[k] = champs[k]; });
    Object.keys(lead).forEach(function (k) { payload[k] = lead[k]; });
    payload._normalise = lead;
    return { lead: lead, payload: payload };
  }

  /* ================= Envois CRM / Google Sheets (jamais bloquants) ================= */
  function envoyerCRM(payload) {
    var cfg = LEAD_CONFIG.crm;
    if (!cfg || !cfg.url) return;
    try {
      if (cfg.format === 'form') {
        var body = new URLSearchParams();
        Object.keys(payload).forEach(function (k) {
          if (k.charAt(0) !== '_') body.append(k, payload[k]);
        });
        fetch(cfg.url, { method: 'POST', body: body, keepalive: true }).catch(function () {});
      } else {
        fetch(cfg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {
          // Repli sans preflight CORS (webhooks simples)
          fetch(cfg.url, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload), keepalive: true
          }).catch(function () {});
        });
      }
    } catch (e) {}
  }
  function envoyerGoogleSheet(lead) {
    var cfg = LEAD_CONFIG.googleSheet;
    if (!cfg || !cfg.url) return;
    try {
      // Apps Script : requete "simple" (text/plain + no-cors) pour eviter le preflight
      fetch(cfg.url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(lead),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* ================= Traitement du lead ================= */
  function traiterLead() {
    if (envoye) return;
    var tel = phone ? phone.value.replace(/[\s.\-]/g, '') : '';
    if (phone && !/^0[1-9]\d{8}$/.test(tel)) {
      erreur('Veuillez saisir un num\u00e9ro de t\u00e9l\u00e9phone fran\u00e7ais valide (10 chiffres).');
      phone.focus();
      return;
    }
    var consent = form.querySelector('input[name="consentement"]:checked');
    if (!consent || consent.value !== 'oui') {
      erreur('Vous devez accepter les termes et conditions.');
      return;
    }
    envoye = true;
    if (btn) { btn.value = btn.getAttribute('data-wait') || 'Patienter...'; btn.disabled = true; }

    var champs = {};
    try {
      new FormData(form).forEach(function (v, k) {
        champs[k] = (k in champs) ? (champs[k] + ', ' + v) : v;
      });
    } catch (e) {}
    var construit = construireLead(champs);
    var lead = construit.lead, payload = construit.payload;
    try {
      sessionStorage.setItem('dernier_lead', JSON.stringify(payload)); // QA / page de remerciement
      if (window.console) console.log('[lead-handler] Lead capture :', payload);
    } catch (e) {}

    /* ---- GTM / dataLayer : evenement + tracking + conversions ameliorees ---- */
    try {
      var micro = form.querySelector('input[name="reponse_3"]:checked');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: (micro && micro.value === 'Oui') ? 'formulaire_micro_entrepreneur' : 'formulaire_lead',
        form_name: 'Assurance-TNS-Pro-Form',
        lead_source: lead.source,
        lead_categorie: lead.categorie,
        utm_source: lead.utm_source, utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign, utm_term: lead.utm_term, utm_content: lead.utm_content,
        gclid: lead.gclid, fbclid: lead.fbclid, msclkid: lead.msclkid,
        user_data: {
          email: lead.email,
          phone_number: lead.telephone_e164,
          address: {
            first_name: lead.prenom, last_name: lead.nom,
            postal_code: lead.code_postal, country: 'FR'
          }
        }
      });
    } catch (e) {}

    /* ---- Sauvegarde locale (identique a l'original, page de remerciement) ---- */
    try {
      ['nom', 'prenom', 'societe', 'code_postal', 'mail', 'telephone', 'civilite', 'ville'].forEach(function (n) {
        var input = form.querySelector('input[name="' + n + '"]');
        if (input && input.value !== '') localStorage.setItem(n, input.value);
      });
      localStorage.setItem('source', (lead.source || '') + ' TYP');
    } catch (e) {}

    /* ---- Livraison CRM + Google Sheets (en parallele, non bloquante) ---- */
    envoyerCRM(payload);
    envoyerGoogleSheet(lead);

    /* ---- Succes "Merci !" ---- */
    if (fail) fail.style.display = 'none';
    form.style.display = 'none';
    if (done) {
      done.style.display = 'block';
      if (done.scrollIntoView) done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ---- Redirection remerciement (?ltm_typ=...) : conserve le tracking ---- */
    try {
      var link = new URLSearchParams(location.search).get('ltm_typ');
      if (link) {
        setTimeout(function () {
          location.href = location.protocol + '//' + location.hostname + '/' + link;
        }, 3000);
      }
    } catch (e) {}
  }

  /* ---- Couche jQuery : chemin reel (Formly appelle $form.submit()) ---- */
  function installerJQuery() {
    if (!window.jQuery) return;
    var $f = window.jQuery(form);
    $f.off('submit');
    $f.on('submit', function (e) {
      e.preventDefault();
      e.stopPropagation(); // empeche le handler delegue Webflow (document)
      e.stopImmediatePropagation();
      if (derniereEtape()) traiterLead();
      return false;
    });
  }
  if (window.jQuery) {
    window.jQuery(installerJQuery);
    window.addEventListener('load', installerJQuery);
  }

  /* ---- Couche native : vrais evenements submit (Entree, etc.) ---- */
  document.addEventListener('submit', function (e) {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (derniereEtape()) traiterLead();
  }, true);
})();
