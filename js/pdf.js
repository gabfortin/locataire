// Builds a PDF of the generated letter, entirely in the browser (the letter never leaves the device).
// jsPDF is vendored in js/vendor and only loaded the first time a PDF is needed.
// The letter is only ever in French or English, which the built-in Times font covers (accents,
// guillemets, dashes), so no custom font is embedded.

(function () {
  const JSPDF_SRC = 'js/vendor/jspdf.umd.min.js';
  const PAGE = { format: 'letter', margin: 72, fontSize: 12, lineHeight: 1.45 }; // points (1/72 in)
  // Header lines of the letter shown in bold.
  const BOLD_LINE = /^(OBJET|RE:|ENVOYÉ PAR|SENT BY)/;

  let jsPdfPromise = null;

  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (jsPdfPromise) return jsPdfPromise;
    jsPdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSPDF_SRC;
      script.onload = () => resolve(window.jspdf);
      script.onerror = () => {
        jsPdfPromise = null;
        reject(new Error('jspdf'));
      };
      document.head.appendChild(script);
    });
    return jsPdfPromise;
  }

  async function buildLetterPdf(text, title) {
    const { jsPDF } = await loadJsPdf();
    const doc = new jsPDF({ unit: 'pt', format: PAGE.format });
    doc.setProperties({ title });

    const width = doc.internal.pageSize.getWidth() - PAGE.margin * 2;
    const bottom = doc.internal.pageSize.getHeight() - PAGE.margin;
    const step = PAGE.fontSize * PAGE.lineHeight;
    let y = PAGE.margin + PAGE.fontSize;

    doc.setFontSize(PAGE.fontSize);
    text.split('\n').forEach((line) => {
      doc.setFont('times', BOLD_LINE.test(line) ? 'bold' : 'normal');
      // An empty line still takes vertical space (paragraph break).
      const wrapped = line.trim() ? doc.splitTextToSize(line, width) : [''];
      wrapped.forEach((part) => {
        if (y > bottom) {
          doc.addPage();
          y = PAGE.margin + PAGE.fontSize;
        }
        doc.text(part, PAGE.margin, y);
        y += step;
      });
    });

    return doc.output('blob');
  }

  window.buildLetterPdf = buildLetterPdf;
})();
