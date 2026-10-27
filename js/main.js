(function () {
  const TOTAL_STEPS = 5;
  let currentStep = 1;
  let currentLang = getSavedLanguage();

  const form = document.getElementById('letter-form');
  const langSelect = document.getElementById('lang-select');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGenerate = document.getElementById('btn-generate');
  const letterResult = document.getElementById('letter-result');
  const letterTextEl = document.getElementById('letter-text');

  // ---------- View routing ----------
  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${name}`);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-goto], [data-view-link]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const name = el.getAttribute('data-goto') || el.getAttribute('data-view-link');
      showView(name);
    });
  });

  // ---------- Language ----------
  function initLanguage() {
    langSelect.value = currentLang;
    applyLanguage(currentLang);
  }
  langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    applyLanguage(currentLang);
  });

  // ---------- Category toggle (salubrite vs grave) ----------
  form.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const category = form.querySelector('input[name="category"]:checked').value;
      form.querySelectorAll('[data-category-block]').forEach((block) => {
        block.hidden = block.getAttribute('data-category-block') !== category;
      });
    });
  });

  // ---------- Wizard navigation ----------
  function updateProgress() {
    document.querySelectorAll('.progress-dot').forEach((dot) => {
      const step = Number(dot.getAttribute('data-dot'));
      dot.classList.toggle('active', step === currentStep);
      dot.classList.toggle('done', step < currentStep);
    });
  }

  function goToStep(step) {
    currentStep = step;
    form.querySelectorAll('.wizard-step').forEach((fs) => {
      fs.classList.toggle('active', Number(fs.getAttribute('data-step')) === step);
    });
    updateProgress();
    btnPrev.style.visibility = step === 1 ? 'hidden' : 'visible';
    btnNext.hidden = step === TOTAL_STEPS;
    btnGenerate.hidden = step !== TOTAL_STEPS;
  }

  function validateCurrentStep() {
    const fieldset = form.querySelector(`.wizard-step[data-step="${currentStep}"]`);
    const requiredFields = Array.from(fieldset.querySelectorAll('[required]')).filter(
      (el) => el.offsetParent !== null // ignore hidden fields (e.g. issue block not shown)
    );
    for (const field of requiredFields) {
      if (!field.value || !field.value.trim()) {
        field.focus();
        alert(t('common.requiredError', currentLang));
        return false;
      }
    }
    return true;
  }

  btnNext.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
  });
  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // ---------- Letter generation ----------
  function collectFormData() {
    const fd = new FormData(form);
    return {
      lease_lang: fd.get('lease_lang'),
      category: fd.get('category'),
      tenant_name: (fd.get('tenant_name') || '').trim(),
      tenant_address: (fd.get('tenant_address') || '').trim(),
      tenant_city: (fd.get('tenant_city') || '').trim(),
      tenant_postal: (fd.get('tenant_postal') || '').trim(),
      tenant_email: (fd.get('tenant_email') || '').trim(),
      tenant_phone: (fd.get('tenant_phone') || '').trim(),
      lease_date: fd.get('lease_date'),
      landlord_name: (fd.get('landlord_name') || '').trim(),
      landlord_address: (fd.get('landlord_address') || '').trim(),
      issues: fd.getAll('issue'),
      grave: fd.getAll('grave'),
      issue_details: (fd.get('issue_details') || '').trim(),
      date_noticed: fd.get('date_noticed'),
      date_reported: fd.get('date_reported'),
      deadline_days: fd.get('deadline_days'),
      remedy: fd.get('remedy'),
    };
  }

  btnGenerate.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    const data = collectFormData();
    const letter = generateLetter(data);
    letterTextEl.textContent = letter;
    letterResult.hidden = false;
    try {
      localStorage.setItem('dat_draft', JSON.stringify(data));
    } catch (e) { /* storage unavailable, ignore */ }
    letterResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- Result actions ----------
  let copyResetTimer;
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy');
    try {
      await navigator.clipboard.writeText(letterTextEl.textContent);
      btn.textContent = '✅ ' + t('wizard.result.copied', currentLang);
      clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        btn.textContent = t('wizard.result.copy', currentLang);
      }, 1800);
    } catch (e) {
      // Fallback: select the text so the user can copy manually
      const range = document.createRange();
      range.selectNodeContents(letterTextEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  document.getElementById('btn-download').addEventListener('click', () => {
    const blob = new Blob([letterTextEl.textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mise-en-demeure.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // ---------- Draft restore ----------
  function restoreDraft() {
    try {
      const raw = localStorage.getItem('dat_draft');
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            const el = form.querySelector(`[name="${key === 'issues' ? 'issue' : 'grave'}"][value="${v}"]`);
            if (el) el.checked = true;
          });
        } else if (value) {
          const el = form.querySelector(`[name="${key}"]`);
          if (el && el.type === 'radio') {
            const target = form.querySelector(`[name="${key}"][value="${value}"]`);
            if (target) target.checked = true;
          } else if (el) {
            el.value = value;
          }
        }
      });
      const category = form.querySelector('input[name="category"]:checked');
      if (category) {
        form.querySelectorAll('[data-category-block]').forEach((block) => {
          block.hidden = block.getAttribute('data-category-block') !== category.value;
        });
      }
    } catch (e) { /* ignore malformed draft */ }
  }

  // ---------- Init ----------
  initLanguage();
  goToStep(1);
  restoreDraft();
})();
