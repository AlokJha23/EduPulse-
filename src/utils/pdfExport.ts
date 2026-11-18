import { jsPDF } from 'jspdf';

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator)
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function normalizeLogoToPngDataUrl(dataUrl?: string): Promise<string | null> {
  if (!dataUrl || typeof window === 'undefined') return null;
  if (dataUrl.startsWith('data:image/png')) return dataUrl;
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min((size - 12) / (img.width || size), (size - 12) / (img.height || size));
        const w = (img.width || size) * scale;
        const h = (img.height || size) * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function generateStudentReportCardPDF(data: {
  studentName: string;
  studentId: string;
  rollNumber: string;
  className: string;
  section: string;
  parentName: string;
  attendancePercentage: number;
  overallPercentage: number;
  marks: Array<{ subject: string; exam: string; obtained: number; max: number; grade: string }>;
  teacherName: string;
  institution: string;
  institutionLogo?: string;
}) {
  const doc = new jsPDF();

  // Header styling
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 38, 'F');

  const pngLogo = await normalizeLogoToPngDataUrl(data.institutionLogo);
  if (pngLogo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, 7, 24, 24, 3, 3, 'F');
      doc.addImage(pngLogo, 'PNG', 15, 8, 22, 22);
    } catch {
      // Ignore if jsPDF cannot embed logo
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.institution || 'ACADEMIQ ACADEMY', 105, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL ACADEMIC PROGRESS REPORT & MARKS TRANSCRIPT', 105, 26, { align: 'center' });

  // Student Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 36, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student Name: `, 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName, 48, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`Student ID: `, 115, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentId, 140, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`Class & Section: `, 18, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.className} - ${data.section} (Roll #${data.rollNumber})`, 52, 64);

  doc.setFont('helvetica', 'bold');
  doc.text(`Parent/Guardian: `, 115, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(data.parentName || 'N/A', 150, 64);

  doc.setFont('helvetica', 'bold');
  doc.text(`Attendance Record: `, 18, 74);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.attendancePercentage}% Present`, 56, 74);

  doc.setFont('helvetica', 'bold');
  doc.text(`Overall Aggregate: `, 115, 74);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.overallPercentage}%`, 154, 74);

  // Table Headers
  let yPos = 94;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, yPos, 182, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('SUBJECT', 18, yPos + 6);
  doc.text('EXAM / ASSESSMENT', 70, yPos + 6);
  doc.text('OBTAINED', 125, yPos + 6);
  doc.text('MAX MARKS', 155, yPos + 6);
  doc.text('GRADE', 180, yPos + 6);

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  if (data.marks && data.marks.length > 0) {
    data.marks.forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, yPos - 1, 182, 8, 'F');
      }
      doc.text(m.subject, 18, yPos + 5);
      doc.text(m.exam, 70, yPos + 5);
      doc.text(m.obtained.toString(), 125, yPos + 5);
      doc.text(m.max.toString(), 155, yPos + 5);
      doc.text(m.grade, 180, yPos + 5);
      yPos += 9;
    });
  } else {
    doc.text('No formal marks recorded for this academic period.', 18, yPos + 5);
    yPos += 9;
  }

  // Footer / Signatures
  yPos = Math.max(yPos + 25, 230);
  doc.setDrawColor(148, 163, 184);
  doc.line(18, yPos, 80, yPos);
  doc.line(130, yPos, 192, yPos);

  doc.setFontSize(9);
  doc.text(`Instructor: ${data.teacherName}`, 18, yPos + 6);
  doc.text('Head of Department / Seal', 130, yPos + 6);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated securely by Academiq Management Suite on ${new Date().toLocaleDateString()}`, 105, 280, { align: 'center' });

  doc.save(`${data.studentName.replace(/\s+/g, '_')}_ReportCard.pdf`);
}
