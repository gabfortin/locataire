// Generates the tenant's letter: a formal "mise en demeure", or, when the landlord has not been
// told about the problem yet, a first written notice ("avis") that asks for the correction.
// IMPORTANT: the letter is written in the language of the lease (French or English),
// regardless of the interface language the tenant used to fill in the form.
//
// generateLetter() returns a list of lines { text, kind } so that the screen (letterToHtml),
// the copied text (letterToText) and the PDF (js/pdf.js) all use the same content:
//   kind 'headline'  big centred capitals (MISE EN DEMEURE / SOUS TOUTES RÉSERVES)
//   kind 'bold'      bold line (subject)
//   kind 'sigline'   signature line
//   kind 'esig'      name added by the electronic signature, in a handwriting font
//   kind 'normal'    everything else

const LETTER_TEXT = {
  fr: {
    issues: {
      moisissure: "présence de moisissure et/ou d'humidité excessive",
      vermine: 'présence de vermine (insectes, punaises, rongeurs)',
      chauffage: 'chauffage insuffisant ou non fonctionnel',
      eauchaude: "absence d'eau chaude",
      eaucourante: "absence d'eau courante",
      degatEau: "dégât d'eau ou infiltration",
      structurel: 'dommages structurels (plafond, mur ou plancher)',
      electricite: 'problème électrique',
      plomberie: 'problème de plomberie',
      securite: 'porte ou fenêtre brisée présentant un risque pour ma sécurité',
    },
    grave: {
      harcelement: 'harcèlement de la part du locateur',
      entree: 'entrée dans le logement sans préavis ni consentement',
      jouissance: 'atteinte à la jouissance paisible du logement',
      serrure: "pose ou changement d'une serrure ou d'un autre mécanisme restreignant l'accès au logement, sans mon consentement",
    },
    prejudice: {
      sante: 'des problèmes de santé, notamment respiratoires ou allergiques',
      sommeil: 'un sommeil perturbé et de la fatigue',
      stress: 'du stress et de l\'anxiété',
      piece: "l'impossibilité d'utiliser une partie du logement",
      biens: 'des dommages à mes biens',
      frais: 'des dépenses supplémentaires',
      enfants: 'des répercussions sur des enfants ou des personnes vulnérables qui vivent dans le logement',
      securite: "un sentiment d'insécurité dans mon propre logement",
    },
    demands: {
      reparation: 'que les réparations nécessaires soient effectuées',
      cessation: 'que ces agissements cessent immédiatement',
    },
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    formatDate: (d, month, y) => `${d === 1 ? '1er' : d} ${month} ${y}`,
    defaultCity: 'Montréal',
    placeLine: (city, date) => `${city}, le ${date}`,
    tenantNamePlaceholder: '[Votre nom]',
    tenantAddressPlaceholder: '[Adresse du logement]',
    recipient: (name) => `Destinataire : ${name || '[Nom du locateur]'}`,
    headlines: ['MISE EN DEMEURE', 'SOUS TOUTES RÉSERVES'],
    subject: (isGrave) => `OBJET : MISE EN DEMEURE — ${isGrave ? 'Atteinte à la jouissance paisible du logement' : "Défaut d'entretien / logement non salubre"}`,
    subjectAvis: (isGrave) => `OBJET : Avis — ${isGrave ? 'Atteinte à la jouissance paisible du logement' : "Problème d'entretien du logement"}`,
    salutation: 'Madame, Monsieur,',
    intro: (address, since) => `Je suis locataire du logement situé au ${address || '[adresse du logement]'}${since ? ` depuis le ${since}` : ''}.`,
    situation: (isGrave) => (isGrave
      ? 'Je vous écris au sujet de la situation suivante, qui porte atteinte à mon droit de jouir paisiblement de mon logement :'
      : 'Je vous écris au sujet de la situation suivante, qui affecte mon logement :'),
    detailsHeading: 'Description de la situation :',
    noticed: (date) => `Cette situation a été constatée le ${date} et persiste à ce jour.`,
    informed: (date) => `${date ? `Je vous ai informé de cette situation le ${date}` : 'Je vous ai déjà informé de cette situation'}, sans qu'elle ait été corrigée à ce jour.`,
    prejudiceIntro: 'Cette situation me cause un préjudice important, notamment :',
    lawGrave: "Je vous rappelle qu'en vertu du Code civil du Québec, le locateur doit garantir au locataire la jouissance paisible du logement pendant toute la durée du bail (article 1854 C.c.Q.) et doit, sauf urgence, donner un préavis de 24 heures avant de visiter le logement ou d'y effectuer des travaux (articles 1931 et 1932 C.c.Q.).",
    lawHarcelement: "Je vous rappelle également que l'article 1902 C.c.Q. interdit spécifiquement au locateur de harceler un locataire de manière à restreindre sa jouissance paisible du logement ou à l'amener à le quitter.",
    lawLock: "De plus, aucune serrure ou autre mécanisme restreignant l'accès au logement ne peut être posé ou changé sans le consentement du locateur et du locataire (article 1934 C.c.Q.).",
    lawSalubrite: "Je vous rappelle qu'en vertu du Code civil du Québec, le locateur est tenu de délivrer un logement en bon état d'habitabilité et de le maintenir ainsi pendant toute la durée du bail (articles 1854 et 1910 C.c.Q.), et qu'il ne peut offrir ni délivrer un logement impropre à l'habitation, c'est-à-dire dont l'état constitue une menace sérieuse pour la santé ou la sécurité des occupants ou du public (article 1913 C.c.Q.).",
    demand: (isGrave, days) => `Par la présente, je vous mets en demeure de ${isGrave ? 'mettre fin à' : 'remédier à'} cette situation dans un délai de ${days} jours ouvrables à compter de la réception de cette lettre.`,
    request: (isGrave, days) => `Je vous prie de ${isGrave ? 'faire cesser' : 'corriger'} cette situation dans un délai de ${days} jours ouvrables à compter de la réception de cette lettre.`,
    demandsIntro: 'Je vous demande plus précisément :',
    consequence: (rentReduction) => `À défaut de correction de la situation dans ce délai, je me verrai dans l'obligation de déposer une demande auprès du Tribunal administratif du logement (TAL), notamment afin d'obtenir l'exécution de vos obligations${rentReduction ? ', une diminution de loyer' : ''} ainsi que des dommages-intérêts, le cas échéant.`,
    avisConfirm: 'Je vous remercie de me confirmer par écrit les mesures que vous prendrez et la date à laquelle elles seront réalisées.',
    avisNext: "Sans réponse de votre part dans ce délai, je pourrais vous faire parvenir une mise en demeure et m'adresser au Tribunal administratif du logement (TAL).",
    tones: {
      neutre: ["Je vous prie d'agir avec diligence et vous remercie de votre collaboration.", 'Veuillez agréer, Madame, Monsieur, mes salutations distinguées.'],
      cordial: ['Je vous remercie à l\'avance de votre collaboration et souhaite que nous puissions régler cette situation rapidement.', "Je vous prie d'agréer, Madame, Monsieur, mes salutations les meilleures."],
      ferme: ["Je vous demande d'agir sans délai. Je conserve une copie de cette lettre comme preuve de son envoi.", 'Veuillez agréer, Madame, Monsieur, mes salutations.'],
    },
    esigned: (name) => `Signé électroniquement : ${name}`,
    emailSubject: (isAvis, name) => `${isAvis ? 'Avis au locateur' : 'Mise en demeure'}${name ? ` – ${name}` : ''}`,
    emailBody: (isAvis, date, name) => [
      'Bonjour,',
      '',
      `Veuillez prendre connaissance ${isAvis ? 'de la lettre' : 'de la mise en demeure'} ci-jointe, datée du ${date}, et m'en accuser réception.`,
      '',
      name || '',
    ].join('\n'),
  },
  en: {
    issues: {
      moisissure: 'presence of mould and/or excessive humidity',
      vermine: 'presence of vermin (insects, bedbugs, rodents)',
      chauffage: 'insufficient or non-functional heating',
      eauchaude: 'no hot water',
      eaucourante: 'no running water',
      degatEau: 'water damage or infiltration',
      structurel: 'structural damage (ceiling, wall, or floor)',
      electricite: 'electrical problem',
      plomberie: 'plumbing problem',
      securite: 'broken door or window posing a risk to my safety',
    },
    grave: {
      harcelement: 'harassment by the landlord',
      entree: 'entry into the dwelling without notice or consent',
      jouissance: 'disturbance of the peaceable enjoyment of the dwelling',
      serrure: 'installation or replacement of a lock or other device restricting access to the dwelling, without my consent',
    },
    prejudice: {
      sante: 'health problems, in particular respiratory problems or allergies',
      sommeil: 'disrupted sleep and fatigue',
      stress: 'stress and anxiety',
      piece: 'being unable to use part of the dwelling',
      biens: 'damage to my belongings',
      frais: 'additional expenses',
      enfants: 'effects on children or vulnerable people living in the dwelling',
      securite: 'feeling unsafe in my own home',
    },
    demands: {
      reparation: 'that the necessary repairs be carried out',
      cessation: 'that these actions stop immediately',
    },
    months: ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'],
    formatDate: (d, month, y) => `${month} ${d}, ${y}`,
    defaultCity: 'Montreal',
    placeLine: (city, date) => `${city}, ${date}`,
    tenantNamePlaceholder: '[Your name]',
    tenantAddressPlaceholder: '[Address of the dwelling]',
    recipient: (name) => `To: ${name || '[Landlord name]'}`,
    // Not "without prejudice": in English that phrase marks settlement talks that cannot be used
    // as evidence, the opposite of a formal notice.
    headlines: ['FORMAL NOTICE (MISE EN DEMEURE)', 'UNDER RESERVE OF ALL RIGHTS'],
    subject: (isGrave) => `RE: FORMAL NOTICE — ${isGrave ? 'Disturbance of the peaceable enjoyment of the dwelling' : 'Failure to maintain / unsanitary dwelling'}`,
    subjectAvis: (isGrave) => `RE: Notice — ${isGrave ? 'Disturbance of the peaceable enjoyment of the dwelling' : 'Maintenance problem in the dwelling'}`,
    salutation: 'Dear Sir or Madam,',
    intro: (address, since) => `I am the tenant of the dwelling located at ${address || '[address of the dwelling]'}${since ? ` since ${since}` : ''}.`,
    situation: (isGrave) => (isGrave
      ? 'I am writing to you about the following situation, which interferes with my right to the peaceable enjoyment of my dwelling:'
      : 'I am writing to you about the following situation, which affects my dwelling:'),
    detailsHeading: 'Description of the situation:',
    noticed: (date) => `This situation was observed on ${date} and persists to this day.`,
    informed: (date) => `${date ? `I informed you of this situation on ${date}` : 'I have already informed you of this situation'}, and it has not been corrected to date.`,
    prejudiceIntro: 'This situation is causing me significant harm, in particular:',
    lawGrave: 'I remind you that under the Civil Code of Québec, the lessor must provide the lessee with peaceable enjoyment of the dwelling throughout the term of the lease (article 1854 C.C.Q.) and must, except in an emergency, give 24 hours\' notice before visiting the dwelling or carrying out work in it (articles 1931 and 1932 C.C.Q.).',
    lawHarcelement: 'I further remind you that article 1902 C.C.Q. specifically prohibits the lessor from harassing a lessee in a way that restricts their peaceable enjoyment of the dwelling or is intended to cause them to leave it.',
    lawLock: 'Furthermore, no lock or other device restricting access to the dwelling may be installed or changed without the consent of both the lessor and the lessee (article 1934 C.C.Q.).',
    lawSalubrite: 'I remind you that under the Civil Code of Québec, the lessor is bound to deliver the dwelling in good habitable condition and to maintain it in that condition throughout the term of the lease (articles 1854 and 1910 C.C.Q.), and may not offer or deliver a dwelling that is unfit for habitation — that is, one whose condition poses a serious threat to the health or safety of the occupants or the public (article 1913 C.C.Q.).',
    demand: (isGrave, days) => `I hereby formally demand that you ${isGrave ? 'put an end to' : 'remedy'} this situation within ${days} business days of receipt of this letter.`,
    request: (isGrave, days) => `Please ${isGrave ? 'put an end to' : 'correct'} this situation within ${days} business days of receipt of this letter.`,
    demandsIntro: 'More specifically, I am asking:',
    consequence: (rentReduction) => `Should the situation not be corrected within this time, I will have no choice but to file an application with the Tribunal administratif du logement (TAL), in particular to obtain the performance of your obligations${rentReduction ? ', a reduction of rent' : ''} and damages, if applicable.`,
    avisConfirm: 'Please confirm in writing the measures you will take and the date on which they will be carried out.',
    avisNext: 'If I do not hear from you within this time, I may send you a formal notice (mise en demeure) and apply to the Tribunal administratif du logement (TAL).',
    tones: {
      neutre: ['I ask that you act diligently and thank you for your cooperation.', 'Yours truly,'],
      cordial: ['Thank you in advance for your cooperation; I hope we can resolve this situation quickly.', 'Kind regards,'],
      ferme: ['I ask that you act without delay. I am keeping a copy of this letter as proof that it was sent.', 'Sincerely,'],
    },
    esigned: (name) => `Electronically signed: ${name}`,
    emailSubject: (isAvis, name) => `${isAvis ? 'Notice to the landlord' : 'Formal notice (mise en demeure)'}${name ? ` – ${name}` : ''}`,
    emailBody: (isAvis, date, name) => [
      'Hello,',
      '',
      `Please read the attached ${isAvis ? 'letter' : 'formal notice (mise en demeure)'}, dated ${date}, and acknowledge receipt.`,
      '',
      name || '',
    ].join('\n'),
  },
};

function letterLang(data) {
  return LETTER_TEXT[data.lease_lang] || LETTER_TEXT.fr;
}

function formatLetterDate(L, isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return L.formatDate(d, L.months[m - 1], y);
}

function letterToday(L) {
  const now = new Date();
  return L.formatDate(now.getDate(), L.months[now.getMonth()], now.getFullYear());
}

// The tenant chose "No, help me write a first letter": a notice, not a formal demand.
function isAvisLetter(data) {
  return data.informed === 'non_aide';
}

function letterEmailSubject(data) {
  return letterLang(data).emailSubject(isAvisLetter(data), data.tenant_name);
}

function letterEmailBody(data) {
  const L = letterLang(data);
  return L.emailBody(isAvisLetter(data), letterToday(L), data.tenant_name);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateLetter(data) {
  const L = letterLang(data);
  const city = (data.tenant_city || L.defaultCity).trim();
  const days = data.deadline_days && Number(data.deadline_days) > 0 ? Number(data.deadline_days) : 10;
  const isGrave = data.category === 'grave';
  const isAvis = isAvisLetter(data);
  const tone = L.tones[data.tone] || L.tones.neutre;

  const lines = [];
  const add = (text = '', kind = 'normal') => lines.push({ text, kind });
  const bullets = (items) => items.forEach((item) => add(`- ${capitalize(item)}`));

  // Header
  add(L.placeLine(city, letterToday(L)));
  add();
  add(data.tenant_name || L.tenantNamePlaceholder);
  add(data.tenant_address || L.tenantAddressPlaceholder);
  const cityPostal = [city, data.tenant_postal].filter(Boolean).join(', ');
  if (cityPostal) add(cityPostal);
  const contact = [data.tenant_phone, data.tenant_email].filter(Boolean).join(' — ');
  if (contact) add(contact);
  add();
  add(L.recipient(data.landlord_name));
  if (data.landlord_address) add(data.landlord_address);
  add();

  if (!isAvis) {
    L.headlines.forEach((h) => add(h, 'headline'));
    add();
  }
  add(isAvis ? L.subjectAvis(isGrave) : L.subject(isGrave), 'bold');
  add();
  add(L.salutation);
  add();
  add(L.intro(data.tenant_address, formatLetterDate(L, data.lease_date)));
  add();

  // 1. The situation first
  const codes = isGrave ? (data.grave || []) : (data.issues || []);
  const labels = codes.map((code) => (isGrave ? L.grave : L.issues)[code]).filter(Boolean);
  add(L.situation(isGrave));
  add();
  bullets(labels);
  if (labels.length) add();
  if (data.issue_details) {
    add(L.detailsHeading);
    add(data.issue_details);
    add();
  }
  const noticed = formatLetterDate(L, data.date_noticed);
  if (noticed) {
    add(L.noticed(noticed));
    add();
  }

  // 2. "I informed you…" (only when the tenant already did)
  if (data.informed === 'oui') {
    add(L.informed(formatLetterDate(L, data.date_reported)));
    add();
  }

  // 3. Harm caused by the situation
  const harms = (data.prejudices || []).map((code) => L.prejudice[code]).filter(Boolean);
  if (harms.length || data.prejudice_details) {
    add(L.prejudiceIntro);
    add();
    bullets(harms);
    if (harms.length) add();
    if (data.prejudice_details) {
      add(data.prejudice_details);
      add();
    }
  }

  // 4. Legal basis
  if (isGrave) {
    const law = [L.lawGrave];
    if (codes.includes('harcelement')) law.push(L.lawHarcelement);
    if (codes.includes('serrure')) law.push(L.lawLock);
    add(law.join(' '));
  } else {
    add(L.lawSalubrite);
  }
  add();

  // 5. The demand (or request) and the deadline
  add(isAvis ? L.request(isGrave, days) : L.demand(isGrave, days));
  const asks = (data.demands || []).map((code) => L.demands[code]).filter(Boolean);
  if (data.demand_other) asks.push(data.demand_other);
  if (asks.length) {
    add();
    add(L.demandsIntro);
    add();
    bullets(asks);
  }
  add();

  // 6. What happens next
  if (isAvis) {
    add(L.avisConfirm);
    add();
    add(L.avisNext);
  } else {
    add(L.consequence((data.demands || []).includes('diminution')));
  }
  add();
  add(tone[0]);
  add();
  add(tone[1]);
  add();

  // Signature
  if (data.esign && data.tenant_name) add(data.tenant_name, 'esig');
  else add();
  add('_______________________________', 'sigline');
  add(data.tenant_name || L.tenantNamePlaceholder);
  if (data.esign && data.tenant_name) add(L.esigned(data.tenant_name));

  return lines;
}

// Plain text (copy, email body, .txt fallback). The handwritten name is only a visual mark:
// in plain text, the "Electronically signed: …" line below the signature line carries it.
function letterToText(lines) {
  return lines.map((l) => (l.kind === 'esig' ? '' : l.text)).join('\n');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// HTML for the on-screen letter (inside a <pre>): one span per line, styled by kind.
function letterToHtml(lines) {
  return lines.map((l) => {
    const text = escapeHtml(l.text);
    if (l.kind === 'normal') return `${text}\n`;
    // Block-level lines (headline) already break the line: no extra newline after them.
    if (l.kind === 'headline') return `<span class="letter-${l.kind}">${text}</span>`;
    return `<span class="letter-${l.kind}">${text}</span>\n`;
  }).join('');
}
