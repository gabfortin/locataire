// Generates the formal "mise en demeure" letter.
// IMPORTANT: the letter text is always produced in French, regardless of the
// interface language the tenant used to fill in the form.

const ISSUE_LABELS_FR = {
  moisissure: "présence de moisissure et/ou d'humidité excessive",
  vermine: "présence de vermine (insectes, punaises, rongeurs)",
  chauffage: "chauffage insuffisant ou non fonctionnel",
  eauchaude: "absence d'eau chaude",
  degatEau: "dégât d'eau ou infiltration",
  electricite: "problème électrique",
  plomberie: "problème de plomberie",
  securite: "porte ou fenêtre brisée présentant un risque pour ma sécurité",
};

const GRAVE_LABELS_FR = {
  harcelement: "harcèlement de la part du locateur",
  entree: "entrée dans le logement sans préavis ni consentement",
  jouissance: "atteinte à la jouissance paisible du logement",
};

const REMEDY_LABELS_FR = {
  reparation: "l'exécution des réparations nécessaires",
  cessation: "la cessation immédiate de ces agissements",
  remboursement: "une diminution de loyer",
  autre: "une solution appropriée à la situation",
};

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function toFrenchDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${FR_MONTHS[m - 1]} ${y}`;
}

function generateLetter(data) {
  const now = new Date();
  const todayStr = `${now.getDate()} ${FR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const city = (data.tenant_city || 'Montréal').trim();
  const deadline = data.deadline_days && Number(data.deadline_days) > 0 ? data.deadline_days : 10;

  const lines = [];

  // Header
  lines.push(`${city}, le ${todayStr}`);
  lines.push('');
  lines.push(data.tenant_name || '[Ton nom]');
  lines.push(data.tenant_address || '[Adresse du logement]');
  const cityPostal = [city, data.tenant_postal].filter(Boolean).join(', ');
  if (cityPostal) lines.push(cityPostal);
  const contactBits = [data.tenant_phone, data.tenant_email].filter(Boolean).join(' — ');
  if (contactBits) lines.push(contactBits);
  lines.push('');
  lines.push(`Destinataire : ${data.landlord_name || '[Nom du locateur]'}`);
  if (data.landlord_address) lines.push(data.landlord_address);
  lines.push('');
  lines.push('ENVOYÉ PAR COURRIER RECOMMANDÉ');
  lines.push('');

  const isGrave = data.category === 'grave';
  lines.push(`OBJET : MISE EN DEMEURE — ${isGrave ? 'Atteinte à la jouissance paisible du logement' : 'Défaut d\'entretien / logement non salubre'}`);
  lines.push('');
  lines.push('Madame, Monsieur,');
  lines.push('');

  let intro = `Je suis locataire du logement situé au ${data.tenant_address || '[adresse du logement]'}`;
  if (data.lease_date) {
    intro += ` depuis le ${toFrenchDate(data.lease_date)}`;
  }
  intro += '.';
  lines.push(intro);
  lines.push('');

  const problemLabels = isGrave
    ? (data.grave || []).map((code) => GRAVE_LABELS_FR[code]).filter(Boolean)
    : (data.issues || []).map((code) => ISSUE_LABELS_FR[code]).filter(Boolean);

  const actionVerb = isGrave ? 'cesser' : 'remédier';
  lines.push(`Par la présente, je vous mets en demeure de ${actionVerb}, dans un délai de ${deadline} jours à compter de la réception de cette lettre, à la situation suivante affectant mon logement :`);
  lines.push('');
  problemLabels.forEach((label) => lines.push(`- ${label.charAt(0).toUpperCase() + label.slice(1)}`));
  if (data.issue_details) {
    lines.push('');
    lines.push('Description détaillée de la situation :');
    lines.push(data.issue_details);
  }
  lines.push('');

  let noticedLine = '';
  if (data.date_noticed) {
    noticedLine = `Cette situation a été constatée le ${toFrenchDate(data.date_noticed)}`;
    if (data.date_reported) {
      noticedLine += `. Je vous en ai avisé le ${toFrenchDate(data.date_reported)}, sans qu'aucune correction n'ait été apportée à ce jour.`;
    } else {
      noticedLine += ' et persiste à ce jour.';
    }
    lines.push(noticedLine);
    lines.push('');
  } else if (data.date_reported) {
    lines.push(`Je vous en ai avisé le ${toFrenchDate(data.date_reported)}, sans qu'aucune correction n'ait été apportée à ce jour.`);
    lines.push('');
  }

  if (isGrave) {
    lines.push("Je vous rappelle qu'en vertu du Code civil du Québec, le locateur doit garantir au locataire la jouissance paisible du logement pendant toute la durée du bail (article 1854 C.c.Q.) et ne peut y accéder sans motif raisonnable, sans préavis suffisant et hors des heures prévues à la loi, sauf urgence (articles 1930 et 1931 C.c.Q.).");
  } else {
    lines.push("Je vous rappelle qu'en vertu du Code civil du Québec, le locateur est tenu de délivrer un logement en bon état d'habitabilité et de le maintenir ainsi pendant toute la durée du bail (articles 1854 et 1910 C.c.Q.), ainsi que de le rendre propre à l'usage auquel il est destiné (article 1913 C.c.Q.).");
  }
  lines.push('');

  const remedyLabel = REMEDY_LABELS_FR[data.remedy] || REMEDY_LABELS_FR.reparation;
  lines.push(`À défaut de correction de la situation dans le délai imparti, je me verrai dans l'obligation de déposer une demande auprès du Tribunal administratif du logement (TAL), notamment afin d'obtenir ${remedyLabel}, ainsi que des dommages-intérêts, le cas échéant.`);
  lines.push('');
  lines.push("Je vous prie d'agir avec diligence et vous remercie de votre collaboration.");
  lines.push('');
  lines.push('Veuillez agréer, Madame, Monsieur, mes salutations distinguées.');
  lines.push('');
  lines.push('');
  lines.push('_______________________________');
  lines.push(data.tenant_name || '[Ton nom]');

  return lines.join('\n');
}
