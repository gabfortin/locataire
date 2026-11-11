(function () {
  const MAX_WORDS = 250; // description of the problem: one or two good paragraphs
  let currentLang = getSavedLanguage();

  const form = document.getElementById('letter-form');
  const langSelect = document.getElementById('lang-select');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGenerate = document.getElementById('btn-generate');
  const letterResult = document.getElementById('letter-result');
  const letterTextEl = document.getElementById('letter-text');
  const errorEl = document.getElementById('wz-error');
  const steps = Array.from(form.querySelectorAll('.wizard-step'));
  let currentIndex = 0;

  // ---------- View routing ----------
  // Moves focus to the new view's heading so screen reader and keyboard users notice the
  // navigation (the trigger element they just activated is now off-screen or gone).
  function focusHeading(el, preventScroll) {
    if (!el) return;
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: !!preventScroll });
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${name}`);
    if (target) {
      target.classList.add('active');
      focusHeading(target.querySelector('h1'), true);
    }
    document.body.classList.toggle('on-wizard', name === 'wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-goto], [data-view-link]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const name = el.getAttribute('data-goto') || el.getAttribute('data-view-link');
      // The generator opens only once « À propos et avis légal » has been read and accepted.
      if (name === 'wizard' && !termsAccepted()) openTerms(() => showView('wizard'));
      else showView(name);
    });
  });

  // ---------- Language ----------
  function setLanguage(lang) {
    currentLang = lang;
    langSelect.value = lang;
    applyLanguage(lang);
    updateProgress();
    updateWordCount();
    if (typeof showLetter === 'function' && lastLetterData && !letterResult.hidden) showLetter();
  }
  langSelect.addEventListener('change', () => setLanguage(langSelect.value));

  // ---------- « À propos et avis légal » : à lire et à accepter avant d'ouvrir le générateur ----------
  // Shown in the language selected on the site at that moment (already applied by applyLanguage).
  const termsDialog = document.getElementById('terms-dialog');
  const termsBody = document.getElementById('terms-body');
  const termsAccept = document.getElementById('terms-accept');

  function termsAccepted() {
    try {
      return localStorage.getItem('dat_terms') === '1';
    } catch (e) {
      return false;
    }
  }
  // The button is enabled once the text has been scrolled to the end (or fits without scrolling).
  function checkTermsScrolled() {
    if (termsBody.scrollTop + termsBody.clientHeight >= termsBody.scrollHeight - 8) {
      termsAccept.disabled = false;
    }
  }
  let afterTerms = null;
  function openTerms(then) {
    afterTerms = then || null;
    termsAccept.disabled = true;
    termsDialog.showModal();
    termsBody.scrollTop = 0;
    termsBody.focus();
    requestAnimationFrame(checkTermsScrolled);
  }
  termsBody.addEventListener('scroll', checkTermsScrolled);
  window.addEventListener('resize', () => termsDialog.open && checkTermsScrolled());
  // Escape closes it without accepting: the person stays where they were.
  termsDialog.addEventListener('cancel', () => { afterTerms = null; });
  termsAccept.addEventListener('click', () => {
    try {
      localStorage.setItem('dat_terms', '1');
    } catch (e) { /* storage unavailable: it will be asked again next visit */ }
    termsDialog.close();
    const next = afterTerms;
    afterTerms = null;
    if (next) next();
  });

  // ---------- Voice features (read-aloud / dictation) ----------
  // Off by default: a floating pill beside the form turns them on for those who want them.
  const voiceToggle = document.getElementById('voice-toggle');
  function setVoiceEnabled(enabled) {
    voiceToggle.setAttribute('aria-pressed', String(enabled));
    document.body.classList.toggle('voice-enabled', enabled);
    try {
      localStorage.setItem('dat_voice', enabled ? '1' : '0');
    } catch (e) { /* storage unavailable, ignore */ }
    if (!enabled) {
      document.dispatchEvent(new CustomEvent('locataire:stop-speech'));
      document.dispatchEvent(new CustomEvent('locataire:stop-dictation'));
    }
  }
  voiceToggle.addEventListener('click', () => setVoiceEnabled(voiceToggle.getAttribute('aria-pressed') !== 'true'));

  // ---------- Answers that change what is shown ----------
  const value = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;

  // "No, help me write a first letter": a notice, not a formal demand.
  function letterKind() {
    return value('informed') === 'non_aide' ? 'avis' : 'med';
  }

  function updateConditional() {
    const category = value('category') || 'salubrite';
    const kind = letterKind();
    const informed = value('informed');

    form.querySelectorAll('[data-category-block]').forEach((block) => {
      block.hidden = block.getAttribute('data-category-block') !== category;
    });
    form.querySelectorAll('[data-category-only], [data-letter-only]').forEach((el) => {
      const okCategory = !el.hasAttribute('data-category-only') || el.getAttribute('data-category-only') === category;
      const okKind = !el.hasAttribute('data-letter-only') || el.getAttribute('data-letter-only') === kind;
      el.hidden = !(okCategory && okKind);
      if (el.hidden) el.querySelectorAll('input').forEach((input) => { input.checked = false; });
    });
    form.querySelectorAll('[data-show-informed]').forEach((el) => {
      el.hidden = el.getAttribute('data-show-informed') !== informed;
    });
    const other = document.getElementById('demand-autre');
    document.getElementById('demand-other-field').hidden = !other.checked;
    document.getElementById('demand_other').required = other.checked;
    updateAside();
  }
  form.addEventListener('change', updateConditional);

  // Dates: no date after today (the problem can't have been noticed in the future).
  const today = new Date();
  const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  form.querySelectorAll('input[type="date"]').forEach((input) => { input.max = todayIso; });

  // ---------- Description: word limit ----------
  const details = document.getElementById('issue_details');
  const wordCountEl = document.getElementById('word-count');
  function countWords(text) {
    return (text.trim().match(/\S+/g) || []).length;
  }
  function updateWordCount() {
    const n = countWords(details.value);
    wordCountEl.textContent = t('wz.description.count', currentLang).replace('{n}', n).replace('{max}', MAX_WORDS);
    wordCountEl.classList.toggle('over', n > MAX_WORDS);
  }
  details.addEventListener('input', updateWordCount);

  // ---------- Sidebar: information and legal basis of the current step ----------
  // Après les 13 questions : étape 14 « Votre lettre » et étape 15 « Envoi » (hors du formulaire).
  const RESULT_STAGES = ['letter', 'send'];
  let resultStage = null; // null pendant les questions

  function updateAside() {
    const id = resultStage || steps[currentIndex].getAttribute('data-step-id');
    const category = value('category') || 'salubrite';
    document.querySelectorAll('.wz-aside').forEach((aside) => {
      const forStep = aside.getAttribute('data-aside') === id;
      const forCategory = !aside.hasAttribute('data-category') || aside.getAttribute('data-category') === category;
      aside.hidden = !(forStep && forCategory);
    });
  }

  // ---------- Wizard navigation ----------
  function updateProgress() {
    const total = steps.length + RESULT_STAGES.length;
    const n = resultStage ? steps.length + RESULT_STAGES.indexOf(resultStage) + 1 : currentIndex + 1;
    const percent = Math.round((n / total) * 100);
    document.getElementById('wz-percent').textContent = `${percent} %`;
    document.getElementById('wz-progress-fill').style.width = `${percent}%`;
    document.getElementById('wizard-step-label').textContent = t('wizard.stepOf', currentLang).replace('{n}', n).replace('{total}', total);
  }

  function goToStep(index, moveFocus) {
    currentIndex = index;
    resultStage = null;
    steps.forEach((fs, i) => fs.classList.toggle('active', i === index));
    hideError();
    updateConditional();
    updateProgress();
    btnPrev.style.visibility = index === 0 ? 'hidden' : 'visible';
    btnNext.hidden = index === steps.length - 1;
    btnGenerate.hidden = index !== steps.length - 1;
    if (moveFocus) {
      focusHeading(steps[index].querySelector('legend'), true);
      document.querySelector('.wizard-layout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function showError(key, field) {
    errorEl.textContent = t(key, currentLang);
    errorEl.hidden = false;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.addEventListener('input', clearInvalid, { once: true });
      field.addEventListener('change', clearInvalid, { once: true });
      field.focus();
    }
  }
  function hideError() {
    errorEl.hidden = true;
  }
  function clearInvalid(e) {
    e.target.removeAttribute('aria-invalid');
    hideError();
  }

  function validateCurrentStep() {
    const fieldset = steps[currentIndex];
    const visible = (el) => !el.closest('[hidden]');

    for (const group of fieldset.querySelectorAll('[data-required-group]')) {
      const name = group.getAttribute('data-required-group');
      const inputs = Array.from(group.querySelectorAll(`input[name="${name}"]`)).filter(visible);
      if (inputs.length && !inputs.some((input) => input.checked)) {
        showError('wz.error.choose', inputs[0]);
        return false;
      }
    }
    for (const field of fieldset.querySelectorAll('[required]')) {
      if (visible(field) && !(field.value || '').trim()) {
        showError('common.requiredError', field);
        return false;
      }
    }
    if (fieldset.contains(details) && countWords(details.value) > MAX_WORDS) {
      showError('wz.error.tooLong', details);
      return false;
    }
    return true;
  }

  btnNext.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentIndex < steps.length - 1) goToStep(currentIndex + 1, true);
  });
  btnPrev.addEventListener('click', () => {
    if (currentIndex > 0) goToStep(currentIndex - 1, true);
  });

  // ---------- Letter generation ----------
  function collectFormData() {
    const fd = new FormData(form);
    const text = (name) => (fd.get(name) || '').trim();
    return {
      informed: fd.get('informed'),
      lease_lang: fd.get('lease_lang'),
      category: fd.get('category'),
      tenant_name: text('tenant_name'),
      tenant_address: text('tenant_address'),
      tenant_city: text('tenant_city'),
      tenant_postal: text('tenant_postal'),
      tenant_email: text('tenant_email'),
      tenant_phone: text('tenant_phone'),
      lease_date: fd.get('lease_date'),
      landlord_name: text('landlord_name'),
      landlord_address: text('landlord_address'),
      issues: fd.getAll('issue'),
      grave: fd.getAll('grave'),
      issue_details: text('issue_details'),
      date_noticed: fd.get('date_noticed'),
      date_reported: fd.get('informed') === 'oui' ? fd.get('date_reported') : '',
      prejudices: fd.getAll('prejudice'),
      prejudice_details: text('prejudice_details'),
      deadline_days: fd.get('deadline_days'),
      demands: fd.getAll('demand').filter((d) => d !== 'autre'),
      demand_other: fd.getAll('demand').includes('autre') ? text('demand_other') : '',
      tone: fd.get('tone'),
      esign: fd.get('esign') === '1',
    };
  }

  let lastLetterData = null;
  let letterLines = [];
  let letterPdf = null; // Promise of the PDF Blob (null if it could not be built)
  const emailNote = document.getElementById('email-note');

  // Lettre affichée : dans la langue du bail (« lease », celle qui est envoyée) ou, pour la
  // lire seulement, dans la langue de l'interface (« mine », js/lettre-traductions.js).
  let letterView = 'lease';
  const RTL = ['ar', 'ur'];
  const viewBox = document.getElementById('letter-view');
  const viewLease = document.getElementById('letter-view-lease');
  const viewMine = document.getElementById('letter-view-mine');
  const viewNote = document.getElementById('letter-view-note');
  const langName = (code) => {
    const opt = langSelect.querySelector(`option[value="${code}"]`);
    return opt ? opt.textContent.replace(/^[^\p{L}]+/u, '').trim() : code;
  };
  const shownLang = () => (letterView === 'mine' ? currentLang : (lastLetterData || {}).lease_lang || 'fr');
  const shownLines = () => (letterView === 'mine' ? generateLetter(lastLetterData, currentLang) : letterLines);

  function showLetter() {
    if (!lastLetterData) return;
    const leaseLang = lastLetterData.lease_lang || 'fr';
    const translatable = currentLang !== leaseLang && Boolean(LETTER_TEXT[currentLang]);
    if (!translatable) letterView = 'lease';
    viewBox.hidden = !translatable;
    viewLease.textContent = `${langName(leaseLang)} (${t('wz.letterView.sent', currentLang)})`;
    viewMine.textContent = langName(currentLang);
    viewLease.setAttribute('aria-pressed', String(letterView === 'lease'));
    viewMine.setAttribute('aria-pressed', String(letterView === 'mine'));
    viewNote.hidden = letterView !== 'mine';
    const lang = shownLang();
    letterTextEl.lang = lang;
    letterTextEl.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
    letterTextEl.innerHTML = letterToHtml(shownLines());
  }
  viewLease.addEventListener('click', () => { letterView = 'lease'; showLetter(); });
  viewMine.addEventListener('click', () => { letterView = 'mine'; showLetter(); });

  function renderLetter() {
    // Signature électronique : choisie à l'étape 13 (case « J'accepte de signer électroniquement »).
    // letterLines : toujours la lettre dans la langue du bail (PDF, courriel, impression).
    letterLines = generateLetter(lastLetterData);
    showLetter();
    letterPdf = null;
    getLetterPdf().catch(() => {}); // créé tout de suite : le PDF est prêt quand on clique sur Envoyer ou Télécharger
  }

  btnGenerate.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    lastLetterData = collectFormData();
    renderLetter();
    emailNote.hidden = true;
    form.hidden = true;
    letterResult.hidden = false;
    try {
      localStorage.setItem('dat_draft', JSON.stringify(lastLetterData));
    } catch (e) { /* storage unavailable, ignore */ }
    showStage('letter');
  });

  // Étape 14 (la lettre) ou 15 (envoi : Bravo, par courriel, par la poste).
  function showStage(name) {
    resultStage = name;
    document.getElementById('stage-letter').hidden = name !== 'letter';
    document.getElementById('stage-send').hidden = name !== 'send';
    updateProgress();
    updateAside();
    // « Bravo » animé en haut de chaque étape (14 : relire la lettre ; 15 : l'envoyer)
    const panel = document.getElementById(name === 'letter' ? 'ready-panel' : 'done-panel');
    panel.classList.remove('celebrate');
    void panel.offsetWidth; // restart the animation
    panel.classList.add('celebrate');
    focusHeading(document.getElementById(name === 'letter' ? 'letter-title' : 'send-title'), true);
    document.querySelector('.wizard-layout').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.getElementById('btn-send-letter').addEventListener('click', () => showStage('send'));
  document.getElementById('btn-back-letter').addEventListener('click', () => showStage('letter'));

  // « Précédent » à l'étape 14 : retour à la dernière question (13 : ton et signature),
  // d'où le bouton « Précédent » du formulaire remonte aux autres étapes.
  document.getElementById('btn-back-step').addEventListener('click', () => {
    letterResult.hidden = true;
    form.hidden = false;
    goToStep(steps.length - 1, true);
  });

  document.getElementById('btn-edit').addEventListener('click', () => {
    letterResult.hidden = true;
    form.hidden = false;
    goToStep(0, true);
  });

  // ---------- Result actions ----------
  // Nom du fichier selon le type de lettre : « avis » (première lettre) ou mise en demeure.
  const pdfName = () => (isAvisLetter(lastLetterData || {}) ? 'avis-au-locateur.pdf' : 'mise-en-demeure.pdf');

  // Le PDF est créé dans le navigateur (jsPDF chargé à la demande). Un échec n'est pas gardé en
  // mémoire : un nouvel essai est fait (ex. connexion coupée pendant le chargement de jsPDF).
  function getLetterPdf() {
    if (!letterPdf) {
      letterPdf = buildLetterPdf(letterLines, letterEmailSubject(lastLetterData || {})).catch((e) => {
        letterPdf = null;
        throw e;
      });
    }
    return letterPdf;
  }

  async function getPdfFile() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const pdf = await getLetterPdf();
        return new File([pdf], pdfName(), { type: 'application/pdf' });
      } catch (e) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    return null;
  }

  const pdfError = document.getElementById('pdf-error');

  function telecharger(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.getElementById('btn-download').addEventListener('click', async () => {
    pdfError.hidden = true;
    const file = await getPdfFile();
    if (!file) {
      pdfError.hidden = false; // jamais de .txt à la place : la personne réessaie
      return;
    }
    telecharger(file);
  });

  // La lettre part TOUJOURS en PDF (jamais en texte ni en .txt) : le PDF est téléchargé, puis le
  // client de courriel s'ouvre directement (lien mailto:) avec l'objet et le message ; la personne
  // y joint le PDF. Un lien mailto: ne peut pas joindre de fichier lui-même. Le menu de partage
  // du système (navigator.share) n'est pas utilisé : il n'ouvre pas directement le courriel.
  document.getElementById('btn-email').addEventListener('click', async () => {
    pdfError.hidden = true;
    emailNote.hidden = true;
    const data = lastLetterData || {};
    const subject = letterEmailSubject(data);
    const message = letterEmailBody(data);
    const file = await getPdfFile();
    if (!file) {
      pdfError.hidden = false;
      return;
    }
    telecharger(file);
    emailNote.hidden = false;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replace(/\n/g, '\r\n'))}`;
    setTimeout(() => { window.location.href = mailto; }, 400); // laisser partir le téléchargement
  });

  // Impression : toujours la lettre dans la langue du bail, même si la traduction est affichée.
  document.getElementById('btn-print').addEventListener('click', () => {
    const vue = letterView;
    if (vue !== 'lease') { letterView = 'lease'; showLetter(); }
    window.print();
    if (vue !== 'lease') { letterView = vue; showLetter(); }
  });

  // ---------- Read aloud: what the tenant wrote, and the letter ----------
  document.getElementById('btn-read-details').addEventListener('click', (e) => {
    if (window.locataireSpeech) window.locataireSpeech.speakText(details.value, currentLang, e.currentTarget);
  });
  document.getElementById('btn-read-letter').addEventListener('click', (e) => {
    if (window.locataireSpeech) {
      // La version affichée : la lettre (langue du bail) ou sa traduction
      window.locataireSpeech.speakText(letterToText(shownLines()), shownLang(), e.currentTarget);
    }
  });

  // ---------- Draft restore ----------
  const ARRAY_FIELDS = { issues: 'issue', grave: 'grave', prejudices: 'prejudice', demands: 'demand' };
  function restoreDraft() {
    try {
      const raw = localStorage.getItem('dat_draft');
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          const name = ARRAY_FIELDS[key];
          if (!name) return;
          val.forEach((v) => {
            const el = form.querySelector(`[name="${name}"][value="${v}"]`);
            if (el) el.checked = true;
          });
        } else if (val) {
          const el = form.querySelector(`[name="${key}"]`);
          if (el && (el.type === 'radio' || el.type === 'checkbox')) {
            const target = form.querySelector(`[name="${key}"][value="${val}"]`);
            if (target) target.checked = true;
          } else if (el) {
            el.value = val;
          }
        }
      });
      if (data.demand_other) document.getElementById('demand-autre').checked = true;
      form.querySelector('[name="esign"]').checked = data.esign === true;
    } catch (e) { /* ignore malformed draft */ }
  }

  // ---------- Init ----------
  setLanguage(currentLang);
  try {
    setVoiceEnabled(localStorage.getItem('dat_voice') === '1');
  } catch (e) {
    setVoiceEnabled(false);
  }
  restoreDraft();
  goToStep(0, false);
  updateWordCount();
})();
