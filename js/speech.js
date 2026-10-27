// Reads the letter generator's questions aloud, for tenants who have difficulty reading.
// Uses the browser's built-in speech synthesis (the voices installed on the user's device),
// in the interface language. Only the questions and their choices are read — never the letter.
// Each part is highlighted on screen while it is being read, so the tenant can follow along.

(function () {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  const synth = window.speechSynthesis;
  const form = document.getElementById('letter-form');
  const root = document.documentElement;
  const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

  let activeButton = null;
  let highlighted = null;
  let currentUtterance = null;
  let session = 0;

  function currentLang() {
    return root.lang || 'fr';
  }

  // Best voice for a language: prefer Canadian variants, then voices that run on the device.
  function voiceFor(lang) {
    const voices = synth.getVoices().filter((v) => {
      const tag = v.lang.replace('_', '-').toLowerCase();
      return tag === lang || tag.startsWith(`${lang}-`);
    });
    if (!voices.length) return null;
    const score = (v) => (v.lang.replace('_', '-').toLowerCase() === `${lang}-ca` ? 2 : 0) + (v.localService ? 1 : 0);
    return voices.sort((a, b) => score(b) - score(a))[0];
  }

  // Hide the buttons when the device has no voice for the interface language.
  function updateAvailability() {
    root.classList.toggle('no-tts', !voiceFor(currentLang()));
  }

  function clean(text) {
    return (text || '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    return !el.closest('[hidden]') && el.getClientRects().length > 0;
  }

  // ---------- What to read ----------

  function choicesText(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('.choice-card, .check'))
      .filter(isVisible)
      .map((choice) => {
        const parts = choice.querySelectorAll('.choice-title, .choice-desc, span[data-i18n]');
        return { text: Array.from(new Set(parts)).map((p) => p.textContent).join('. '), el: choice };
      });
  }

  function item(el) {
    return { text: el.textContent, el };
  }

  function fieldText(field) {
    const label = field.querySelector('[data-i18n]');
    return label ? [item(label)] : [];
  }

  // A question shown as a paragraph (e.g. "Check what applies") followed by its choices.
  function groupText(labelEl) {
    const texts = [item(labelEl)];
    let next = labelEl.closest('.q-row').nextElementSibling;
    while (next && !next.matches('.checkbox-grid, .lang-choice, .choice-grid')) next = next.nextElementSibling;
    texts.push(...choicesText(next));
    const hint = next && next.nextElementSibling;
    if (hint && hint.matches('.field-hint')) texts.push(item(hint));
    return texts;
  }

  function stepText(step) {
    const texts = [item(step.querySelector('legend'))];
    const units = step.querySelectorAll('.choice-grid, .q-row > p.field-label, label.field');
    units.forEach((unit) => {
      if (!isVisible(unit)) return;
      if (unit.matches('.choice-grid')) {
        // Choices that directly follow the legend (no paragraph label of their own).
        const prev = unit.previousElementSibling;
        if (!prev || !prev.matches('.q-row')) texts.push(...choicesText(unit));
      } else if (unit.matches('p.field-label')) {
        texts.push(...groupText(unit));
      } else {
        texts.push(...fieldText(unit));
      }
    });
    return texts;
  }

  // ---------- Speaking ----------

  function setButtonState(button, speaking) {
    button.classList.toggle('speaking', speaking);
    button.setAttribute('aria-pressed', String(speaking));
    if (button.classList.contains('speak-step')) {
      const key = speaking ? 'speech.stop' : 'speech.listenStep';
      button.setAttribute('data-i18n', key);
      button.textContent = t(key, currentLang());
    }
  }

  function highlight(el) {
    if (highlighted) highlighted.classList.remove('speaking-now');
    highlighted = el || null;
    if (highlighted) highlighted.classList.add('speaking-now');
  }

  function stop() {
    session += 1; // invalidates callbacks from the reading being stopped
    currentUtterance = null;
    synth.cancel();
    highlight(null);
    if (activeButton) setButtonState(activeButton, false);
    activeButton = null;
  }

  // Parts are spoken one at a time, each one highlighted as it is handed to the voice.
  // Queuing them all at once is unreliable: Safari (and sometimes Chrome) can garbage-collect
  // queued utterances and never fire their events, so the highlight would not follow the voice.
  function speakParts(parts, voice, index, id) {
    if (id !== session) return;
    if (index >= parts.length) {
      stop();
      return;
    }
    const part = parts[index];
    const utterance = new SpeechSynthesisUtterance(part.text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.95;
    utterance.onend = () => speakParts(parts, voice, index + 1, id);
    utterance.onerror = () => {
      if (id === session) stop();
    };
    currentUtterance = utterance; // keep a reference so its events are not lost
    highlight(part.el);
    synth.speak(utterance);
  }

  function speak(items, button) {
    const wasActive = activeButton === button;
    stop();
    if (wasActive) return; // second click on the same button stops the reading

    const voice = voiceFor(currentLang());
    const parts = items
      .map(({ text, el }) => ({ text: clean(text), el }))
      .filter(({ text }) => text);
    if (!voice || !parts.length) return;

    // Don't read aloud while the microphone is listening (see dictation.js).
    document.dispatchEvent(new CustomEvent('locataire:stop-dictation'));
    activeButton = button;
    setButtonState(button, true);
    speakParts(parts, voice, 0, session);
  }

  // ---------- Buttons ----------

  function iconButton(getTexts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'speak-icon';
    button.textContent = '🔊';
    button.setAttribute('data-i18n-aria-label', 'speech.listen');
    button.setAttribute('aria-label', t('speech.listen', currentLang()));
    button.addEventListener('click', (e) => {
      e.preventDefault(); // don't focus or toggle the field the label belongs to
      speak(getTexts(), button);
    });
    return button;
  }

  // Wraps a question's text with a 🔊 button. The text element keeps its data-i18n attribute,
  // so language changes still update it.
  function attachIcon(textEl, getTexts) {
    const row = document.createElement(textEl.tagName === 'P' ? 'div' : 'span');
    row.className = 'q-row';
    textEl.parentNode.insertBefore(row, textEl);
    row.appendChild(textEl);
    row.appendChild(iconButton(getTexts));
  }

  form.querySelectorAll('label.field').forEach((field) => {
    const label = field.querySelector(':scope > span[data-i18n]');
    if (label) attachIcon(label, () => fieldText(field));
  });
  form.querySelectorAll('p.field-label').forEach((p) => {
    attachIcon(p, () => groupText(p));
  });

  form.querySelectorAll('.wizard-step').forEach((step) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-small btn-ghost speak-step';
    button.setAttribute('data-i18n', 'speech.listenStep');
    button.textContent = t('speech.listenStep', currentLang());
    button.addEventListener('click', () => speak(stepText(step), button));
    step.querySelector('legend').insertAdjacentElement('afterend', button);
  });

  // ---------- Stop when the context changes ----------

  document.getElementById('lang-select').addEventListener('change', () => {
    stop();
    updateAvailability();
  });
  document.querySelectorAll('#btn-next, #btn-prev, #btn-generate, [data-goto], [data-view-link]').forEach((el) => {
    el.addEventListener('click', stop);
  });
  window.addEventListener('pagehide', stop);
  document.addEventListener('locataire:stop-speech', stop);

  updateAvailability();
  if ('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', updateAvailability);
})();
