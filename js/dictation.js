// Voice dictation for the letter generator's text fields, using the browser's built-in speech
// recognition (Chrome, Edge, Safari). The browser sends the audio to its vendor (Google, Microsoft
// or Apple) to turn it into text, so the tenant is asked for consent before the first use.
// Multiple-choice questions are not dictated: ticking a box is simpler and more reliable.

(function () {
  const form = document.getElementById('letter-form');
  const root = document.documentElement;
  const hintButton = document.querySelector('.dictation-hint [data-i18n="dictation.hintButton"]');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return; // e.g. Firefox: only the keyboard-dictation hint is shown

  if (hintButton) hintButton.hidden = false;

  // Interface language → recognition language (Montreal variants where they exist).
  const RECOGNITION_LANGS = {
    fr: 'fr-CA', en: 'en-CA', es: 'es-US', it: 'it-IT',
    ar: 'ar-SA', ht: 'ht-HT', pa: 'pa-IN', ur: 'ur-PK',
  };
  const ERROR_KEYS = {
    'not-allowed': 'dictation.denied',
    'service-not-allowed': 'dictation.denied',
    'language-not-supported': 'dictation.unsupportedLang',
    'no-speech': 'dictation.noSpeech',
  };

  let consented = false;
  let active = null; // { recognition, field, button, status }

  function lang() {
    return root.lang || 'fr';
  }

  function setStatus(status, key) {
    if (!key) {
      status.hidden = true;
      status.removeAttribute('data-i18n');
      return;
    }
    status.hidden = false;
    status.setAttribute('data-i18n', key);
    status.textContent = t(key, lang());
  }

  function setListening(button, listening) {
    const key = listening ? 'dictation.stopButton' : 'dictation.button';
    button.classList.toggle('listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute('data-i18n-aria-label', key);
    button.setAttribute('aria-label', t(key, lang()));
  }

  function stop() {
    if (!active) return;
    const { recognition } = active;
    active = null;
    recognition.abort();
  }

  function start(field, button, status) {
    const wasActive = active && active.field === field;
    stop();
    if (wasActive) return; // second click on the same microphone stops the dictation

    if (!consented) {
      if (!window.confirm(t('dictation.consent', lang()))) return;
      consented = true;
    }

    // Don't let the microphone pick up the read-aloud voice.
    document.dispatchEvent(new CustomEvent('locataire:stop-speech'));

    const recognition = new Recognition();
    const multiline = field.tagName === 'TEXTAREA';
    recognition.lang = RECOGNITION_LANGS[lang()] || lang();
    recognition.interimResults = true;
    recognition.continuous = multiline;

    // Text fields are replaced by what is said; the description is appended to.
    const base = multiline && field.value.trim() ? `${field.value.trim()} ` : '';
    const session = { recognition, field, button, status };
    active = session;

    recognition.onstart = () => {
      setListening(button, true);
      setStatus(status, 'dictation.listening');
    };
    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
      field.value = base + text.trim();
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      setStatus(status, ERROR_KEYS[event.error] || 'dictation.error');
      session.failed = true;
    };
    recognition.onend = () => {
      setListening(button, false);
      if (!session.failed) setStatus(status, null);
      if (active === session) active = null;
    };

    try {
      recognition.start();
    } catch (e) {
      active = null;
      setStatus(status, 'dictation.error');
    }
  }

  // Adds a microphone button next to a text field, and a status line under it.
  function attachMic(field) {
    const row = document.createElement('span');
    row.className = 'input-row';
    field.parentNode.insertBefore(row, field);
    row.appendChild(field);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mic-btn';
    button.setAttribute('data-icon', 'mic');
    setListening(button, false);
    row.appendChild(button);

    const status = document.createElement('span');
    status.className = 'dictation-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    row.insertAdjacentElement('afterend', status);

    button.addEventListener('click', (e) => {
      e.preventDefault(); // don't focus or toggle the field the label belongs to
      start(field, button, status);
    });
  }

  form.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(attachMic);

  // Stop when the context changes.
  document.addEventListener('locataire:stop-dictation', stop);
  document.getElementById('lang-select').addEventListener('change', stop);
  document.querySelectorAll('#btn-next, #btn-prev, #btn-generate, [data-goto], [data-view-link]').forEach((el) => {
    el.addEventListener('click', stop);
  });
  window.addEventListener('pagehide', stop);
})();
