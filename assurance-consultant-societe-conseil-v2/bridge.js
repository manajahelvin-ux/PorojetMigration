/**
 * Pont parent (page wrapper) -> iframe de la LP Assurance, SANS SMS.
 * Protocole : ubepro-assurance-v1
 *
 * Roles :
 * - relayer l'etat de consentement (CookieConsent ou la banniere de la page
 *   parente) vers l'iframe ;
 * - transmettre l'URL publique complete de la page parente (UTM, click IDs,
 *   ltm_*...) pour que la LP attribue correctement le lead ;
 * - repondre aux demandes de l'enfant (consent-state-request / landing-url-request).
 *
 * AUCUN relais SMS : conforme a la demande (recuperation du contact simple).
 * La LP chargee dans l'iframe doit etre une version SANS SMS (voir
 * docs/CONFIGURATION-IFRAME.md).
 */
(function () {
  'use strict';

  var FRAME_ID = 'lp-assurance-frame';
  var CHILD_ORIGIN = 'https://www.ubepro.com';
  var allowedParents = [
    'https://www.comparateurpro.fr',
    'https://comparateurpro.fr',
    'https://assurance-consultant-societe-conseil-v2.lp.comparateurpro.fr',
    'https://comparateur-pro.webflow.io'
  ];

  var iframe = null;
  var manualConsent = null;

  function getIframe() {
    iframe = iframe || document.getElementById(FRAME_ID);
    return iframe;
  }

  function parentIsAllowed() {
    return allowedParents.indexOf(window.location.origin) !== -1;
  }

  function post(type, payload) {
    var frame = getIframe();
    if (!frame || !frame.contentWindow || !parentIsAllowed()) {
      return false;
    }
    var message = {
      bridge: 'ubepro-assurance-v1',
      type: type
    };
    Object.keys(payload || {}).forEach(function (key) {
      message[key] = payload[key];
    });
    frame.contentWindow.postMessage(message, CHILD_ORIGIN);
    return true;
  }

  function denied() {
    return {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
  }

  function granted() {
    return {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    };
  }

  function getConsent() {
    if (manualConsent !== null) {
      return manualConsent ? granted() : denied();
    }
    try {
      if (window.CookieConsent) {
        return {
          analytics_storage: window.CookieConsent.acceptedCategory('analytics') ? 'granted' : 'denied',
          ad_storage: window.CookieConsent.acceptedCategory('marketing') ? 'granted' : 'denied',
          ad_user_data: window.CookieConsent.acceptedCategory('marketing') ? 'granted' : 'denied',
          ad_personalization: window.CookieConsent.acceptedCategory('marketing') ? 'granted' : 'denied'
        };
      }
      var raw = window.localStorage &&
        window.localStorage.getItem('user_cookie_preferences');
      if (raw) {
        var preferences = JSON.parse(raw);
        return {
          analytics_storage: preferences.analytics ? 'granted' : 'denied',
          ad_storage: preferences.marketing ? 'granted' : 'denied',
          ad_user_data: preferences.marketing ? 'granted' : 'denied',
          ad_personalization: preferences.marketing ? 'granted' : 'denied'
        };
      }
    } catch (e) {}
    return denied();
  }

  function sendConsent() {
    // Le parent refuse les envois depuis un domaine non autorise.
    if (!parentIsAllowed()) {
      post('consent-state', { consent: denied() });
      return denied();
    }
    post('consent-state', { consent: getConsent() });
    return getConsent();
  }

  function sendLandingUrl(force) {
    var url = parentIsAllowed() || force ? window.location.href : '';
    return post('landing-url', { url: url });
  }

  /**
   * API manuelle pour le CMP ou les tests :
   * window.setAssuranceConsent(true|false|null)
   */
  window.setAssuranceConsent = function (value) {
    manualConsent = value === null ? null : Boolean(value);
    return sendConsent();
  };

  [
    'cookieconsent_accept',
    'cookieconsent_deHarbor',
    'user_cookie_preferences_changed'
  ].forEach(function (eventName) {
    document.addEventListener(eventName, function () {
      sendConsent();
    });
  });

  window.addEventListener('message', function (event) {
    var frame = getIframe();
    if (event.origin !== CHILD_ORIGIN ||
        !frame ||
        event.source !== frame.contentWindow ||
        !event.data ||
        event.data.bridge !== 'ubepro-assurance-v1') {
      return;
    }
    if (event.data.type === 'consent-state-request') {
      sendConsent();
    } else if (event.data.type === 'landing-url-request') {
      sendLandingUrl(false);
    }
  });

  function initialize() {
    if (!getIframe()) {
      return;
    }
    sendConsent();
    sendLandingUrl(false);
    [300, 1000, 3000].forEach(function (delay) {
      window.setTimeout(function () {
        sendConsent();
        sendLandingUrl(false);
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
