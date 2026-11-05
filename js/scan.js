// Lecteur de bail : une photo de la première page du bail (formulaire obligatoire du TAL) est lue
// sur l'appareil avec Tesseract.js (reconnaissance de texte en WebAssembly, js/vendor/tesseract/).
// La photo n'est envoyée nulle part : la bibliothèque et les données de langue viennent de ce site.
// Le texte reconnu sert à pré-remplir le nom et l'adresse du locataire, l'adresse du logement et
// les coordonnées du locateur ; la personne vérifie et corrige chaque champ.
//
// Sections du bail utilisées (français / anglais) :
//   A « Entre le locateur » / « Between the lessor »  → nom et adresse du locateur
//     « Et le locataire » / « And the lessee »        → nom (et courriel, téléphone) du locataire
//   B « Description et destination du logement »     → adresse du logement, ville, code postal

(function () {
  const VENDOR = 'js/vendor/tesseract/';
  const MAX_SIDE = 2400; // px : assez pour un formulaire, sans ralentir les téléphones

  // ---------- Analyse du texte reconnu (fonction pure, testable) ----------

  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  // Libellés imprimés sur le formulaire, retirés des lignes avant de chercher les valeurs.
  const LABELS = [
    'ECRIRE LISIBLEMENT', 'PRINT IN BLOCK LETTERS', 'ENTRE LE LOCATEUR', 'BETWEEN THE LESSOR',
    'ET LE LOCATAIRE', 'ET LES LOCATAIRES', 'AND THE LESSEE', 'AND THE LESSEES',
    'AUTRE NO DE TELEPHONE', 'OTHER TELEPHONE NO', 'NO DE TELEPHONE', 'TELEPHONE NO',
    'ADRESSE COURRIEL', 'EMAIL ADDRESS', 'E-MAIL ADDRESS', 'CODE POSTAL', 'POSTAL CODE',
    'MUNICIPALITE', 'MUNICIPALITY', 'CELLULAIRE', 'CELL', 'NOM', 'NAME', 'RUE', 'STREET',
    'APP.', 'APT.', 'APP', 'APT', 'NO.', 'NO', 'ADRESSE', 'ADDRESS', '(', ')',
  ];
  const NOISE = /LISIBLEMENT|BLOCK|REPRESENT|MANDATAIRE|MANDATARY|NOMS INDIQUES|NAMES INDICATED|DOIVENT|MUST BE|FORMULAIRE|FORM|TRIBUNAL|BAIL|LEASE|LOCATEUR|LOCATAIRE|LESSOR|LESSEE|DESCRIPTION|DESTINATION|SECTION|PAGE|QUEBEC|COURRIEL|EMAIL|TELEPHONE/;

  const POSTAL = /\b([A-CEGHJ-NPR-TVXY])\s?(\d)\s?([A-CEGHJ-NPR-TV-Z])\s?-?\s?(\d)\s?([A-CEGHJ-NPR-TV-Z])\s?(\d)\b/;
  const PHONE = /(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/;
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const STREET = /^\s*(\d{1,6}[A-Z]?)\b[\s,.-]+(.*[A-ZÀ-Ÿ]{2,}.*)$/i;

  // Code postal canadien : lettre-chiffre-lettre chiffre-lettre-chiffre. La reconnaissance confond
  // souvent les deux (« L » lu « 1 », « J » lu « 3 », « O » lu « 0 ») : on corrige selon la position.
  const TO_LETTER = { 0: 'O', 1: 'L', 2: 'Z', 3: 'J', 4: 'A', 5: 'S', 6: 'G', 7: 'T', 8: 'B' };
  const TO_DIGIT = { O: '0', Q: '0', D: '0', I: '1', L: '1', '|': '1', Z: '2', S: '5', B: '8', G: '6', A: '4', T: '7' };
  function findPostal(foldedLine) {
    const exact = foldedLine.match(POSTAL);
    if (exact) return { code: `${exact[1]}${exact[2]}${exact[3]} ${exact[4]}${exact[5]}${exact[6]}`, raw: exact[0] };
    const re = /(^|[^A-Z0-9])([A-Z0-9|]{3})\s?-?\s?([A-Z0-9|]{3})(?=$|[^A-Z0-9])/g;
    let m;
    while ((m = re.exec(foldedLine))) {
      const chars = (m[2] + m[3]).split('').map((c, i) => (i % 2 === 0 ? (TO_LETTER[c] || c) : (TO_DIGIT[c] || c)));
      const fixed = chars.join('');
      // Le Québec commence par G, H ou J ; on exige au moins 4 caractères déjà bien placés.
      const ok = chars.filter((c, i) => (i % 2 === 0 ? /[A-Z]/ : /\d/).test((m[2] + m[3])[i])).length;
      if (/^[GHJ]/.test(fixed) && ok >= 4 && POSTAL.test(fixed)) {
        return { code: `${fixed.slice(0, 3)} ${fixed.slice(3)}`, raw: m[0].replace(/^[^A-Z0-9]/, '') };
      }
    }
    return null;
  }

  function stripLabels(line) {
    let out = ' ' + line + ' ';
    const folded = () => fold(out);
    LABELS.forEach((label) => {
      let idx;
      // Retire chaque occurrence du libellé (comparaison sans accents ni casse, mots entiers).
      while ((idx = folded().search(new RegExp('(^|[\\s:])' + label.replace(/[.()]/g, '\\$&') + '(?=$|[\\s:.,])'))) !== -1) {
        const start = idx + (folded()[idx].match(/[\s:]/) ? 1 : 0);
        out = out.slice(0, start) + ' ' + out.slice(start + label.length);
      }
    });
    return out.replace(/\s{2,}/g, ' ').replace(/^[\s:;,.|_-]+|[\s:;,|_-]+$/g, '').trim();
  }

  function findSection(text, starts, after) {
    const f = fold(text);
    let best = -1;
    starts.forEach((re) => {
      re.lastIndex = 0;
      const m = re.exec(f.slice(after));
      if (m && (best === -1 || after + m.index < best)) best = after + m.index;
    });
    return best;
  }

  // « 3725 avenue Laval 3 » → « 3725, avenue Laval, app. 3 » (dernier nombre seul = appartement).
  function formatAddress(line) {
    const clean = line.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',');
    const m = clean.match(/^(\d{1,6}[A-Z]?)[\s,]+(.+?)[\s,]+(?:(?:APP|APT|APPARTEMENT|APARTMENT|UNIT|BUREAU|SUITE)\.?\s*)?#?(\d{1,5}[A-Z]?)$/i);
    if (m && /[A-Za-zÀ-ÿ]{2,}/.test(m[2])) {
      const en = document.querySelector('input[name="lease_lang"][value="en"]');
      const app = en && en.checked ? 'apt.' : 'app.'; // abréviation dans la langue du bail
      return `${m[1]}, ${m[2]}, ${app} ${m[3]}`;
    }
    const n = clean.match(/^(\d{1,6}[A-Z]?)[\s,]+(.+)$/);
    return n ? `${n[1]}, ${n[2]}` : clean;
  }

  function readBlock(block) {
    const result = {};
    const lines = block.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((raw, i) => {
      if (i === 0) raw = raw.replace(/^.*?(LOCATEUR|LOCATAIRES?|LESSOR|LESSEES?|LOGEMENT|DWELLING)\b/i, '');
      const email = raw.match(EMAIL);
      if (email && !result.email) result.email = email[0];
      const noEmail = raw.replace(EMAIL, ' ');
      const postal = !STREET.test(noEmail.trim()) && findPostal(fold(noEmail));
      if (postal && !result.postal) {
        result.postal = postal.code;
        // La ville est sur la même ligne, juste avant le code postal.
        const before = stripLabels(noEmail.slice(0, fold(noEmail).indexOf(postal.raw))).replace(/[\d,;]+$/, '').trim();
        if (/^[A-Za-zÀ-ÿ' .-]{2,40}$/.test(before) && !NOISE.test(fold(before))) result.city = before;
        return;
      }
      const phone = noEmail.match(PHONE);
      if (phone && !STREET.test(stripLabels(noEmail)) && !result.phone) {
        result.phone = `${phone[1]} ${phone[2]}-${phone[3]}`;
        return;
      }
      // Ligne d'adresse : on la garde telle quelle (« rue », « avenue » font partie de la valeur).
      const rawLine = noEmail.replace(/^[\s:;,.|_-]+|[\s:;,|_-]+$/g, '').trim();
      if (!result.address && STREET.test(rawLine) && !PHONE.test(rawLine.replace(/\s/g, ''))) {
        result.address = formatAddress(rawLine);
        return;
      }
      const line = stripLabels(noEmail);
      if (!line || line.length < 3) return;
      const words = line.split(/\s+/);
      if (!result.name && !/\d/.test(line) && words.length >= 2 && words.length <= 6 && line.length <= 60
          && /^[A-Za-zÀ-ÿ' .,&-]+$/.test(line) && !NOISE.test(fold(line))) {
        result.name = line.replace(/,+$/, '');
      }
    });
    return result;
  }

  function parseLease(text) {
    const lessor = findSection(text, [/ENTRE LE LOCATEUR|BETWEEN THE LESSOR|\bLOCATEUR\b|\bLESSOR\b/g], 0);
    const lessee = findSection(text, [/ET LES? LOCATAIRES?|AND THE LESSEES?|\bLOCATAIRES?\b|\bLESSEES?\b/g], lessor === -1 ? 0 : lessor + 8);
    const dwelling = findSection(text, [/DESCRIPTION ET DESTINATION|DESCRIPTION AND DESTINATION|\bLOGEMENT LOUE|\bLEASED DWELLING|\bDESCRIPTION\b/g], lessee === -1 ? 0 : lessee + 8);
    const end = (from) => {
      const e = findSection(text, [/\bC\s+DUREE|DUREE DU BAIL|TERM OF (THE )?LEASE|\bD\s+LOYER|\bRENT\b/g], from);
      return e === -1 ? Math.min(text.length, from + 900) : e;
    };
    const slice = (a, b) => (a === -1 ? '' : text.slice(a, b === -1 ? a + 700 : b));
    return {
      landlord: readBlock(slice(lessor, lessee)),
      tenant: readBlock(slice(lessee, dwelling)),
      dwelling: dwelling === -1 ? {} : readBlock(text.slice(dwelling, end(dwelling + 10))),
    };
  }

  // Langue du bail d'après les mots imprimés sur le formulaire (le TAL publie une version française
  // et une version anglaise). Renvoie 'fr', 'en' ou null si le texte ne permet pas de trancher.
  const FR_WORDS = /\b(LOCATEUR|LOCATAIRES?|BAIL|LOGEMENT|ENTRE LE|ECRIRE LISIBLEMENT|MUNICIPALITE|CODE POSTAL|DUREE|LOYER|ADRESSE COURRIEL|DEPENDANCES)\b/g;
  const EN_WORDS = /\b(LESSOR|LESSEES?|LEASE|DWELLING|BETWEEN THE|PRINT IN BLOCK|MUNICIPALITY|POSTAL CODE|TERM OF|RENT|EMAIL ADDRESS|DEPENDENCIES)\b/g;
  function detectLeaseLang(text) {
    // Le nom du Tribunal est en français sur les deux versions du formulaire : on ne le compte pas.
    const f = fold(text).replace(/TRIBUNAL ADMINISTRATIF DU LOGEMENT|REGIE DU LOGEMENT/g, ' ');
    const fr = (f.match(FR_WORDS) || []).length;
    const en = (f.match(EN_WORDS) || []).length;
    if (fr >= 3 && fr >= en * 1.5) return 'fr';
    if (en >= 3 && en >= fr * 1.5) return 'en';
    return null;
  }

  window.locataireParseLease = parseLease; // pour les tests
  window.locataireDetectLeaseLang = detectLeaseLang;

  // ---------- Interface ----------

  // Un encadré à l'étape 4 (locataire) et un à l'étape 6 (locateur) : une seule photo remplit les deux.
  const boxes = document.querySelectorAll('.scan-box');
  if (!boxes.length) return;
  let busy = false;

  const lang = () => document.documentElement.lang || 'fr';
  const tr = (key, vars) => {
    let s = t(key, lang());
    Object.entries(vars || {}).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
    return s;
  };
  function say(box, key, vars, kind) {
    const status = box.querySelector('.scan-status');
    status.hidden = false;
    status.className = 'scan-status' + (kind ? ' ' + kind : '');
    status.textContent = tr(key, vars);
  }

  function loadScript(src) {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Photo → canevas en niveaux de gris, côté le plus long ramené à MAX_SIDE.
  async function toCanvas(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.filter = 'grayscale(1) contrast(1.15)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function leaseLang() {
    const checked = document.querySelector('input[name="lease_lang"]:checked');
    return checked && checked.value === 'en' ? 'eng' : 'fra';
  }

  // Les champs de l'étape où l'on a pris la photo et des étapes suivantes sont toujours remplis
  // (photo à l'étape 4 → étapes 4, 5 et 6 remplies directement). Ceux des étapes déjà passées
  // (photo prise à l'étape 6 → étapes 4 et 5) seulement s'ils sont vides ou à leur valeur par
  // défaut (ex. « Montréal »), pour ne pas écraser ce que la personne a déjà vérifié.
  function stepIndex(el) {
    const all = [...document.querySelectorAll('.wizard-step')];
    return all.indexOf(el && el.closest('.wizard-step'));
  }
  function fill(id, value, filled, step) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    const earlier = step && stepIndex(el) < stepIndex(step);
    if (earlier && el.value.trim() && el.value !== el.defaultValue) return;
    if (el.type === 'email' && !EMAIL.test(value)) return;
    el.value = value;
    // Prévenir le reste de l'application (brouillon, validation), puis teinter le champ
    // jusqu'à ce que la personne le modifie.
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.classList.add('autofilled');
    el.addEventListener('input', () => el.classList.remove('autofilled'), { once: true });
    const label = document.querySelector(`label[for="${id}"] span[data-i18n]`) || document.querySelector(`label[for="${id}"]`);
    if (label) filled.push(label.textContent.replace(/\s*\(.*?\)\s*$/, '').trim());
  }

  function apply(found, step) {
    const filled = [];
    const home = found.dwelling.address ? found.dwelling : found.tenant;
    fill('tenant_name', found.tenant.name, filled, step);
    fill('tenant_address', home.address, filled, step);
    fill('tenant_city', home.city || found.tenant.city, filled, step);
    fill('tenant_postal', home.postal || found.tenant.postal, filled, step);
    fill('tenant_email', found.tenant.email, filled, step);
    fill('tenant_phone', found.tenant.phone, filled, step);
    fill('landlord_name', found.landlord.name, filled, step);
    const l = found.landlord;
    const landlordAddress = [l.address, [l.city, l.postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    fill('landlord_address', landlordAddress, filled, step);
    return filled;
  }

  // Avertir si la langue lue sur le bail n'est pas celle choisie à l'étape 3 (la lettre est rédigée
  // dans la langue du bail), avec un bouton pour corriger le choix.
  function checkLeaseLang(box, found) {
    const warn = box.querySelector('.scan-lang');
    warn.hidden = true;
    const chosen = document.querySelector('input[name="lease_lang"]:checked');
    if (!found || !chosen || chosen.value === found) return;
    const name = (code) => t(`wizard.leaseLang.${code}`, lang());
    warn.querySelector('.scan-lang-text').textContent = tr('scan.langMismatch', { found: name(found), chosen: name(chosen.value) });
    const btn = warn.querySelector('.scan-lang-btn');
    btn.hidden = false;
    btn.textContent = tr('scan.langSwitch', { found: name(found) });
    btn.onclick = () => {
      const radio = document.querySelector(`input[name="lease_lang"][value="${found}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      btn.hidden = true;
      warn.querySelector('.scan-lang-text').textContent = tr('scan.langSwitched', { found: name(found) });
      warn.classList.add('done');
    };
    warn.classList.remove('done');
    warn.hidden = false;
  }

  async function scan(box, file) {
    if (!file || busy) return;
    busy = true;
    box.classList.add('busy');
    say(box, 'scan.loading');
    box.querySelector('.scan-lang').hidden = true;
    let worker = null;
    try {
      const base = new URL(VENDOR, location.href).href;
      await loadScript(base + 'tesseract.min.js');
      const canvas = await toCanvas(file);
      worker = await window.Tesseract.createWorker(leaseLang(), 1, {
        workerPath: base + 'worker.min.js',
        corePath: base,
        langPath: base + 'lang',
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === 'recognizing text') say(box, 'scan.reading', { p: Math.round(m.progress * 100) });
        },
      });
      const { data } = await worker.recognize(canvas);
      const text = data.text || '';
      const filled = apply(parseLease(text), box.closest('.wizard-step'));
      if (filled.length) say(box, 'scan.done', { fields: filled.join(', ') }, 'ok');
      else say(box, 'scan.none', null, 'warn');
      checkLeaseLang(box, detectLeaseLang(text));
    } catch (e) {
      say(box, 'scan.error', null, 'warn');
    } finally {
      if (worker) worker.terminate();
      box.querySelectorAll('input[type="file"]').forEach((i) => { i.value = ''; });
      box.classList.remove('busy');
      busy = false;
    }
  }

  boxes.forEach((box) => {
    box.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => scan(box, input.files && input.files[0]));
    });
  });
})();
