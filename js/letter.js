// Generates the formal "mise en demeure" letter.
// IMPORTANT: the letter is written in the language of the lease (French or English),
// regardless of the interface language the tenant used to fill in the form.

const LETTER_TEXT = {
  fr: {
    issues: {
      moisissure: "présence de moisissure et/ou d'humidité excessive",
      vermine: "présence de vermine (insectes, punaises, rongeurs)",
      chauffage: "chauffage insuffisant ou non fonctionnel",
      eauchaude: "absence d'eau chaude",
      eaucourante: "absence d'eau courante",
      degatEau: "dégât d'eau ou infiltration",
      structurel: "dommages structurels (plafond, mur ou plancher)",
      electricite: "problème électrique",
      plomberie: "problème de plomberie",
      securite: "porte ou fenêtre brisée présentant un risque pour ma sécurité",
    },
    grave: {
      harcelement: "harcèlement de la part du locateur",
      entree: "entrée dans le logement sans préavis ni consentement",
      jouissance: "atteinte à la jouissance paisible du logement",
      serrure: "pose ou changement d'une serrure ou d'un autre mécanisme restreignant l'accès au logement, sans mon consentement",
    },
    remedies: {
      reparation: "l'exécution des réparations nécessaires",
      cessation: "la cessation immédiate de ces agissements",
      remboursement: "une diminution de loyer",
      autre: "une solution appropriée à la situation",
    },
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    formatDate: (d, month, y) => `${d === 1 ? '1er' : d} ${month} ${y}`,
    defaultCity: 'Montréal',
    placeLine: (city, date) => `${city}, le ${date}`,
    tenantNamePlaceholder: '[Votre nom]',
    tenantAddressPlaceholder: '[Adresse du logement]',
    recipient: (name) => `Destinataire : ${name || '[Nom du locateur]'}`,
    registered: 'ENVOYÉ PAR COURRIER RECOMMANDÉ',
    subject: (isGrave) => `OBJET : MISE EN DEMEURE — ${isGrave ? 'Atteinte à la jouissance paisible du logement' : "Défaut d'entretien / logement non salubre"}`,
    salutation: 'Madame, Monsieur,',
    intro: (address, since) => `Je suis locataire du logement situé au ${address || '[adresse du logement]'}${since ? ` depuis le ${since}` : ''}.`,
    demand: (isGrave, days) => `Par la présente, je vous mets en demeure de ${isGrave ? 'mettre fin' : 'remédier'}, dans un délai de ${days} jours à compter de la réception de cette lettre, à la situation suivante affectant mon logement :`,
    detailsHeading: 'Description détaillée de la situation :',
    noticed: (date) => `Cette situation a été constatée le ${date}`,
    noticedPersists: ' et persiste à ce jour.',
    reported: (date) => `Je vous en ai avisé le ${date}, sans qu'aucune correction n'ait été apportée à ce jour.`,
    lawGrave: "Je vous rappelle qu'en vertu du Code civil du Québec, le locateur doit garantir au locataire la jouissance paisible du logement pendant toute la durée du bail (article 1854 C.c.Q.) et doit, sauf urgence, donner un préavis de 24 heures avant de visiter le logement ou d'y effectuer des travaux (articles 1931 et 1932 C.c.Q.).",
    lawHarcelement: "Je vous rappelle également que l'article 1902 C.c.Q. interdit spécifiquement au locateur de harceler un locataire de manière à restreindre sa jouissance paisible du logement ou à l'amener à le quitter.",
    lawLock: "De plus, aucune serrure ou autre mécanisme restreignant l'accès au logement ne peut être posé ou changé sans le consentement du locateur et du locataire (article 1934 C.c.Q.).",
    lawSalubrite: "Je vous rappelle qu'en vertu du Code civil du Québec, le locateur est tenu de délivrer un logement en bon état d'habitabilité et de le maintenir ainsi pendant toute la durée du bail (articles 1854 et 1910 C.c.Q.), et qu'il ne peut offrir ni délivrer un logement impropre à l'habitation, c'est-à-dire dont l'état constitue une menace sérieuse pour la santé ou la sécurité des occupants ou du public (article 1913 C.c.Q.).",
    consequence: (remedy) => `À défaut de correction de la situation dans le délai imparti, je me verrai dans l'obligation de déposer une demande auprès du Tribunal administratif du logement (TAL), notamment afin d'obtenir ${remedy}, ainsi que des dommages-intérêts, le cas échéant.`,
    diligence: "Je vous prie d'agir avec diligence et vous remercie de votre collaboration.",
    closing: 'Veuillez agréer, Madame, Monsieur, mes salutations distinguées.',
    emailSubject: (address) => `Mise en demeure${address ? ` — ${address}` : ''}`,
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
    remedies: {
      reparation: 'the completion of the necessary repairs',
      cessation: 'the immediate cessation of these actions',
      remboursement: 'a reduction of rent',
      autre: 'an appropriate remedy for the situation',
    },
    months: ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'],
    formatDate: (d, month, y) => `${month} ${d}, ${y}`,
    defaultCity: 'Montreal',
    placeLine: (city, date) => `${city}, ${date}`,
    tenantNamePlaceholder: '[Your name]',
    tenantAddressPlaceholder: '[Address of the dwelling]',
    recipient: (name) => `To: ${name || '[Landlord name]'}`,
    registered: 'SENT BY REGISTERED MAIL',
    subject: (isGrave) => `RE: FORMAL NOTICE (DEMAND LETTER) — ${isGrave ? 'Disturbance of the peaceable enjoyment of the dwelling' : 'Failure to maintain / unsanitary dwelling'}`,
    salutation: 'Dear Sir or Madam,',
    intro: (address, since) => `I am the tenant of the dwelling located at ${address || '[address of the dwelling]'}${since ? ` since ${since}` : ''}.`,
    demand: (isGrave, days) => `I hereby formally demand that you ${isGrave ? 'put an end to' : 'remedy'}, within ${days} days of receipt of this letter, the following situation affecting my dwelling:`,
    detailsHeading: 'Detailed description of the situation:',
    noticed: (date) => `This situation was observed on ${date}`,
    noticedPersists: ' and persists to this day.',
    reported: (date) => `I notified you of it on ${date}, and no correction has been made to date.`,
    lawGrave: 'I remind you that under the Civil Code of Québec, the lessor must provide the lessee with peaceable enjoyment of the dwelling throughout the term of the lease (article 1854 C.C.Q.) and must, except in an emergency, give 24 hours\' notice before visiting the dwelling or carrying out work in it (articles 1931 and 1932 C.C.Q.).',
    lawHarcelement: 'I further remind you that article 1902 C.C.Q. specifically prohibits the lessor from harassing a lessee in a way that restricts their peaceable enjoyment of the dwelling or is intended to cause them to leave it.',
    lawLock: 'Furthermore, no lock or other device restricting access to the dwelling may be installed or changed without the consent of both the lessor and the lessee (article 1934 C.C.Q.).',
    lawSalubrite: 'I remind you that under the Civil Code of Québec, the lessor is bound to deliver the dwelling in good habitable condition and to maintain it in that condition throughout the term of the lease (articles 1854 and 1910 C.C.Q.), and may not offer or deliver a dwelling that is unfit for habitation — that is, one whose condition poses a serious threat to the health or safety of the occupants or the public (article 1913 C.C.Q.).',
    consequence: (remedy) => `Should the situation not be corrected within the time allowed, I will have no choice but to file an application with the Tribunal administratif du logement (TAL), in particular to obtain ${remedy}, as well as damages, if applicable.`,
    diligence: 'I ask that you act diligently and thank you for your cooperation.',
    closing: 'Yours truly,',
    emailSubject: (address) => `Formal notice (mise en demeure)${address ? ` — ${address}` : ''}`,
  },
};

function formatLetterDate(L, isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return L.formatDate(d, L.months[m - 1], y);
}

function letterEmailSubject(data) {
  const L = LETTER_TEXT[data.lease_lang] || LETTER_TEXT.fr;
  return L.emailSubject(data.tenant_address);
}

function generateLetter(data) {
  const L = LETTER_TEXT[data.lease_lang] || LETTER_TEXT.fr;
  const now = new Date();
  const todayStr = L.formatDate(now.getDate(), L.months[now.getMonth()], now.getFullYear());
  const city = (data.tenant_city || L.defaultCity).trim();
  const deadline = data.deadline_days && Number(data.deadline_days) > 0 ? data.deadline_days : 10;
  const isGrave = data.category === 'grave';

  const lines = [];

  // Header
  lines.push(L.placeLine(city, todayStr));
  lines.push('');
  lines.push(data.tenant_name || L.tenantNamePlaceholder);
  lines.push(data.tenant_address || L.tenantAddressPlaceholder);
  const cityPostal = [city, data.tenant_postal].filter(Boolean).join(', ');
  if (cityPostal) lines.push(cityPostal);
  const contactBits = [data.tenant_phone, data.tenant_email].filter(Boolean).join(' — ');
  if (contactBits) lines.push(contactBits);
  lines.push('');
  lines.push(L.recipient(data.landlord_name));
  if (data.landlord_address) lines.push(data.landlord_address);
  lines.push('');
  lines.push(L.registered);
  lines.push('');

  lines.push(L.subject(isGrave));
  lines.push('');
  lines.push(L.salutation);
  lines.push('');
  lines.push(L.intro(data.tenant_address, formatLetterDate(L, data.lease_date)));
  lines.push('');

  const problemCodes = isGrave ? (data.grave || []) : (data.issues || []);
  const problemLabels = problemCodes
    .map((code) => (isGrave ? L.grave : L.issues)[code])
    .filter(Boolean);

  lines.push(L.demand(isGrave, deadline));
  lines.push('');
  problemLabels.forEach((label) => lines.push(`- ${label.charAt(0).toUpperCase() + label.slice(1)}`));
  if (data.issue_details) {
    lines.push('');
    lines.push(L.detailsHeading);
    lines.push(data.issue_details);
  }
  lines.push('');

  const noticed = formatLetterDate(L, data.date_noticed);
  const reported = formatLetterDate(L, data.date_reported);
  if (noticed) {
    lines.push(L.noticed(noticed) + (reported ? `. ${L.reported(reported)}` : L.noticedPersists));
    lines.push('');
  } else if (reported) {
    lines.push(L.reported(reported));
    lines.push('');
  }

  if (isGrave) {
    const lawParts = [L.lawGrave];
    if (problemCodes.includes('harcelement')) lawParts.push(L.lawHarcelement);
    if (problemCodes.includes('serrure')) lawParts.push(L.lawLock);
    lines.push(lawParts.join(' '));
  } else {
    lines.push(L.lawSalubrite);
  }
  lines.push('');

  const remedyLabel = L.remedies[data.remedy] || L.remedies.reparation;
  lines.push(L.consequence(remedyLabel));
  lines.push('');
  lines.push(L.diligence);
  lines.push('');
  lines.push(L.closing);
  lines.push('');
  lines.push('');
  lines.push('_______________________________');
  lines.push(data.tenant_name || L.tenantNamePlaceholder);

  return lines.join('\n');
}
