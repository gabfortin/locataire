// Builds a PDF of the generated letter, entirely in the browser (the letter never leaves the device).
// jsPDF is vendored in js/vendor and only loaded the first time a PDF is needed.
// The letter is only ever in French or English, which the built-in Times font covers (accents,
// guillemets, dashes). The handwriting font of the electronic signature (Great Vibes, SIL OFL,
// fonts/GreatVibes-Regular.ttf, reduced to Latin characters) is only fetched when it is used.
//
// Input: the lines from generateLetter() (js/letter.js), each { text, kind }.

(function () {
  const JSPDF_SRC = 'js/vendor/jspdf.umd.min.js';
  const SIGNATURE_FONT_SRC = 'fonts/GreatVibes-Regular.ttf';
  const PAGE = { format: 'letter', margin: 72, fontSize: 12, lineHeight: 1.45 }; // points (1/72 in)
  const HEADLINE_SIZE = 15;
  const SIGNATURE_SIZE = 26;

  let jsPdfPromise = null;
  let signatureFontPromise = null;

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

  // Base64 of the signature font, as jsPDF's virtual file system expects it.
  function loadSignatureFont() {
    if (!signatureFontPromise) {
      signatureFontPromise = fetch(SIGNATURE_FONT_SRC)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('font'))))
        .then((buffer) => {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          }
          return btoa(binary);
        })
        .catch(() => {
          signatureFontPromise = null;
          return null; // the PDF is still built, with the name in the regular font
        });
    }
    return signatureFontPromise;
  }

  async function buildLetterPdf(lines, title) {
    const needsSignatureFont = lines.some((l) => l.kind === 'esig');
    const [{ jsPDF }, signatureFont] = await Promise.all([
      loadJsPdf(),
      needsSignatureFont ? loadSignatureFont() : Promise.resolve(null),
    ]);
    const doc = new jsPDF({ unit: 'pt', format: PAGE.format });
    doc.setProperties({ title });
    if (signatureFont) {
      doc.addFileToVFS('GreatVibes-Regular.ttf', signatureFont);
      doc.addFont('GreatVibes-Regular.ttf', 'GreatVibes', 'normal');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const width = pageWidth - PAGE.margin * 2;
    const bottom = doc.internal.pageSize.getHeight() - PAGE.margin;
    let y = PAGE.margin + PAGE.fontSize;

    function newPageIfNeeded(height) {
      if (y + height - PAGE.fontSize > bottom) {
        doc.addPage();
        y = PAGE.margin + PAGE.fontSize;
      }
    }

    lines.forEach(({ text, kind }) => {
      if (kind === 'headline') {
        doc.setFont('times', 'bold');
        doc.setFontSize(HEADLINE_SIZE);
        doc.splitTextToSize(text, width).forEach((part) => {
          newPageIfNeeded(HEADLINE_SIZE * PAGE.lineHeight);
          doc.text(part, pageWidth / 2, y, { align: 'center' });
          y += HEADLINE_SIZE * PAGE.lineHeight;
        });
        return;
      }
      if (kind === 'esig') {
        const size = signatureFont ? SIGNATURE_SIZE : PAGE.fontSize;
        newPageIfNeeded(size * 1.2 + PAGE.fontSize * PAGE.lineHeight * 2);
        doc.setFont(signatureFont ? 'GreatVibes' : 'times', signatureFont ? 'normal' : 'italic');
        doc.setFontSize(size);
        y += size * 0.35; // room for the tall handwritten letters above the line
        doc.text(text, PAGE.margin + 6, y);
        y += PAGE.fontSize * 0.6;
        return;
      }

      doc.setFont('times', kind === 'bold' ? 'bold' : 'normal');
      doc.setFontSize(PAGE.fontSize);
      const step = PAGE.fontSize * PAGE.lineHeight;
      // An empty line still takes vertical space (paragraph break).
      const wrapped = text.trim() ? doc.splitTextToSize(text, width) : [''];
      wrapped.forEach((part) => {
        newPageIfNeeded(step);
        doc.text(part, PAGE.margin, y);
        y += step;
      });
    });

    return doc.output('blob');
  }

  window.buildLetterPdf = buildLetterPdf;
})();
