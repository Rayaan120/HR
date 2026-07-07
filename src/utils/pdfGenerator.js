import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const exportToPDF = async (elementId, filename = "document.pdf") => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const stylesWithOklch = [];
  const styleElements = Array.from(document.querySelectorAll('style'));

  // Temporary replacement of oklch to prevent html2canvas from crashing
  styleElements.forEach(style => {
    if (style.innerHTML.includes('oklch')) {
      stylesWithOklch.push({ element: style, originalText: style.innerHTML });
      style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)');
    }
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Canvas dimensions in mm (matching the pdf page width)
    const canvasWidthMm = pdfWidth;
    const canvasHeightMm = (canvas.height / canvas.width) * canvasWidthMm;

    // How many A4 pages do we need?
    const totalPages = Math.ceil(canvasHeightMm / pdfHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // y offset in mm for this page
      const yOffsetMm = page * pdfHeight;

      // Add image positioned so only the current page's slice is visible
      pdf.addImage(
        imgData,
        'PNG',
        0,
        -yOffsetMm,          // shift image up by the page offset
        canvasWidthMm,
        canvasHeightMm
      );
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF", error);
    alert("Error generating PDF: " + error.message);
  } finally {
    // Restore original styles
    stylesWithOklch.forEach(item => {
      item.element.innerHTML = item.originalText;
    });
  }
};

export const printDocument = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printContents = element.innerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = `
    <div class="print-only">
      ${printContents}
    </div>
  `;
  window.print();
  
  // Restore original content and reload app to reattach event listeners
  document.body.innerHTML = originalContents;
  window.location.reload(); 
};
