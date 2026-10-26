/* =====================================================================
   lead-handler.js — Soumission AUTONOME du formulaire (LP exportee Webflow)
   ---------------------------------------------------------------------
   POURQUOI CE FICHIER EXISTE (source du "Oops! Something went wrong") :
   1) La librairie multistep (Formly) intercepte le clic sur "Valider"
      (preventDefault) puis declenche l'envoi via jQuery :
          $('[data-form="multistep"]').submit();
      -> ce n'est PAS un vrai evenement navigateur : seuls les handlers
         jQuery sont appeles. Les addEventListener natifs sont ignores.
   2) Le handler Webflow (delegue jQuery sur ".w-form form") envoie alors
      les donnees en AJAX vers https://webflow.com/api/v1/form/<site-id>
      -> hors hebergement Webflow (local file://, hebergeur statique),
         l'appel echoue et Webflow affiche ".w-form-fail" ("Oops!...").

   CORRECTIF (3 couches, dans ce fichier + index.html) :
   - [HTML]  Le wrapper n'a plus la classe "w-form" : le selecteur delegue
             de Webflow (".w-form form") ne correspond plus jamais.
   - [jQuery] On retire les anciens handlers submit du formulaire et on
             installe le notre : preventDefault + stopPropagation ->
             meme via .submit() de Formly, Webflow n'est jamais appele.
   - [Natif] Capture document : filet de securite pour les vrais envois
             (touche Entree, etc.). Aucune navigation native possible.

   COMPORTEMENT CONSERVE A L'IDENTIQUE : validation, dataLayer (GTM)
   "formulaire_lead" / "formulaire_micro_entrepreneur", localStorage,
   redirection ?ltm_typ=, message "Merci !". Aucun code SMS.

   >>> ENVOI VERS VOTRE CRM / GOOGLE SHEETS (optionnel, 1 ligne) <<<
   Collez ci-dessous l'URL de votre webhook (Make, Zapier, Apps Script,
   endpoint HelloLead...) : chaque lead y sera envoye en POST JSON.
   Laissez vide ('') pour ne rien envoyer (tracking GTM seul).
   ===================================================================== */
var LEAD_ENDPOINT = '';

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

  // Le panneau d'erreur Webflow ne doit plus jamais s'afficher
  if (fail) fail.style.display = 'none';

  // Zone de message d'erreur (sous le champ telephone)
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
  function derniereEtape() {
    // Vrai quand le bouton Valider est visible (derniere etape affichee)
    return !btn || btn.getClientRects().length > 0;
  }

  // ---- Traitement du lead (appele par la couche jQuery OU native) ----
  function traiterLead() {
    if (envoye) return;
    // Validation contact simple (telephone FR + consentement)
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

    // Collecte de toutes les reponses du formulaire
    var lead = {};
    try {
      new FormData(form).forEach(function (v, k) {
        lead[k] = (k in lead) ? (lead[k] + ', ' + v) : v;
      });
    } catch (err) {}
    lead.page = location.href;
    lead.date = new Date().toISOString();

    // 1) Tracking GTM (identique a l'original)
    try {
      var micro = form.querySelector('input[name="reponse_3"]:checked');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: (micro && micro.value === 'Oui') ? 'formulaire_micro_entrepreneur' : 'formulaire_lead' });
    } catch (err) {}

    // 2) Sauvegarde locale (identique a l'original)
    try {
      ['nom', 'prenom', 'societe', 'code_postal', 'mail', 'telephone', 'civilite', 'ville'].forEach(function (n) {
        var input = form.querySelector('input[name="' + n + '"]');
        if (input && input.value !== '') localStorage.setItem(n, input.value);
      });
      var src = form.querySelector('input[name="source"]');
      localStorage.setItem('source', (src ? src.value : '') + ' TYP');
    } catch (err) {}

    // 3) Envoi optionnel vers le CRM (jamais bloquant)
    if (LEAD_ENDPOINT) {
      try {
        fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
          keepalive: true
        }).catch(function () {});
      } catch (err) {}
    }

    // 4) Affichage du succes "Merci !"
    if (fail) fail.style.display = 'none';
    form.style.display = 'none';
    if (done) {
      done.style.display = 'block';
      if (done.scrollIntoView) done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 5) Redirection page de remerciement si demandee (?ltm_typ=...)
    try {
      var link = new URLSearchParams(location.search).get('ltm_typ');
      if (link) {
        setTimeout(function () {
          location.href = location.protocol + '//' + location.hostname + '/' + link;
        }, 3000);
      }
    } catch (err) {}
  }

  // ---- Couche jQuery : LE chemin reel (Formly appelle $form.submit()) ----
  function installerJQuery() {
    if (!window.jQuery) return;
    var $f = window.jQuery(form);
    $f.off('submit'); // retire les anciens handlers (form-redirect, form-ass...)
    $f.on('submit', function (e) {
      e.preventDefault();
      e.stopPropagation(); // <- empeche le handler delegue Webflow (document)
      e.stopImmediatePropagation();
      if (derniereEtape()) traiterLead();
      return false;
    });
  }
  if (window.jQuery) {
    window.jQuery(installerJQuery); // a DOM ready
    window.addEventListener('load', installerJQuery); // assurance anti-rebinding
  }

  // ---- Couche native : vrais evenements submit (Entree, etc.) ----
  document.addEventListener('submit', function (e) {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (derniereEtape()) traiterLead();
  }, true);
})();
