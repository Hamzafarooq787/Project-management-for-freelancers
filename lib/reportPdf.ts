import type { BusinessProfile, Project, Task } from "./types";

export interface ReportTaskGroup {
  name: string;
  tasks: Task[];
}

export interface DailyReportInput {
  project: Project;
  businessProfile: BusinessProfile;
  reportTitle: string;
  date: string;
  displayDate: string;
  groups: ReportTaskGroup[];
  clientNote: string;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN_X;
const CONTENT_WIDTH = RIGHT_EDGE - MARGIN_X;

const COLORS = {
  headerBand: [18, 116, 74] as const,
  headerBandDark: [10, 74, 48] as const,
  sectionTint: [232, 248, 240] as const,
  sectionText: [15, 90, 58] as const,
  cardBorder: [225, 230, 227] as const,
  cardBg: [250, 252, 251] as const,
  textDark: [30, 35, 33] as const,
  textMuted: [110, 118, 114] as const,
  priorityHigh: [200, 50, 60] as const,
  priorityMedium: [190, 120, 20] as const,
  priorityLow: [120, 128, 124] as const,
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function dataUrlFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function fitBox(naturalW: number, naturalH: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / naturalW, maxH / naturalH, 1);
  return { w: naturalW * ratio, h: naturalH * ratio };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export async function generateDailyReportPdf(input: DailyReportInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  function fillColor(c: readonly [number, number, number]) {
    doc.setFillColor(c[0], c[1], c[2]);
  }
  function drawColor(c: readonly [number, number, number]) {
    doc.setDrawColor(c[0], c[1], c[2]);
  }
  function textColor(c: readonly [number, number, number]) {
    doc.setTextColor(c[0], c[1], c[2]);
  }

  const clientLogoDataUrl = await loadImageAsDataUrl(input.project.clientDetails.logoUrl);
  const companyLogoDataUrl = await loadImageAsDataUrl(input.businessProfile.logoUrl);

  const clientLabel =
    input.project.clientDetails.company || input.project.clientDetails.name || input.project.client || "Client";
  const companyLabel = input.businessProfile.companyName || "Your Company";

  function drawHeader() {
    fillColor(COLORS.headerBand);
    doc.rect(0, 0, PAGE_WIDTH, 96, "F");
    fillColor(COLORS.headerBandDark);
    doc.rect(0, 92, PAGE_WIDTH, 4, "F");

    const logoBoxSize = 46;
    const logoY = 25;

    // Company logo / name, left
    if (companyLogoDataUrl) {
      try {
        const props = doc.getImageProperties(companyLogoDataUrl);
        const { w, h } = fitBox(props.width, props.height, logoBoxSize, logoBoxSize);
        doc.addImage(companyLogoDataUrl, dataUrlFormat(companyLogoDataUrl), MARGIN_X, logoY, w, h);
      } catch {
        drawHeaderLabel(companyLabel, MARGIN_X, "left");
      }
    } else {
      drawHeaderLabel(companyLabel, MARGIN_X, "left");
    }

    // Client logo / name, right
    if (clientLogoDataUrl) {
      try {
        const props = doc.getImageProperties(clientLogoDataUrl);
        const { w, h } = fitBox(props.width, props.height, logoBoxSize, logoBoxSize);
        doc.addImage(clientLogoDataUrl, dataUrlFormat(clientLogoDataUrl), RIGHT_EDGE - w, logoY, w, h);
      } catch {
        drawHeaderLabel(clientLabel, RIGHT_EDGE, "right");
      }
    } else {
      drawHeaderLabel(clientLabel, RIGHT_EDGE, "right");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text(input.reportTitle, PAGE_WIDTH / 2, 48, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(input.project.name, PAGE_WIDTH / 2, 68, { align: "center" });
  }

  function drawHeaderLabel(label: string, x: number, align: "left" | "right") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    const lines = doc.splitTextToSize(label, 160) as string[];
    doc.text(lines, x, 40, { align });
  }

  drawHeader();
  let y = 128;

  // Metadata bar
  doc.setFillColor(246, 247, 246);
  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 44, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  textColor(COLORS.textMuted);
  const metaY1 = y + 17;
  const metaY2 = y + 33;
  const colWidth = CONTENT_WIDTH / 3;

  function metaField(label: string, value: string, col: number, row: number) {
    const x = MARGIN_X + 14 + col * colWidth;
    const rowY = row === 0 ? metaY1 : metaY2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    textColor(COLORS.textMuted);
    doc.text(label.toUpperCase(), x, rowY - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textColor(COLORS.textDark);
    const lines = doc.splitTextToSize(value || "—", colWidth - 20) as string[];
    doc.text(lines[0] ?? "—", x, rowY);
  }

  metaField("Report date", input.displayDate, 0, 0);
  metaField("Client", clientLabel, 1, 0);
  metaField("Website", input.project.websiteUrl || "—", 2, 0);
  metaField("Prepared by", companyLabel, 0, 1);
  metaField("Total tasks", String(input.groups.reduce((sum, g) => sum + g.tasks.length, 0)), 1, 1);
  metaField("Categories", String(input.groups.length), 2, 1);

  y += 44 + 26;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_HEIGHT - 70) {
      doc.addPage();
      drawHeader();
      y = 128;
    }
  }

  if (input.groups.length === 0) {
    ensureSpace(40);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    textColor(COLORS.textMuted);
    doc.text("No tasks were completed on this date.", MARGIN_X, y);
    y += 24;
  }

  for (const group of input.groups) {
    ensureSpace(34);
    fillColor(COLORS.sectionTint);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 24, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    textColor(COLORS.sectionText);
    doc.text(group.name, MARGIN_X + 10, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${group.tasks.length} task${group.tasks.length === 1 ? "" : "s"}`, RIGHT_EDGE - 10, y + 16, {
      align: "right",
    });
    y += 24 + 10;

    for (const task of group.tasks) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const titleLines = doc.splitTextToSize(task.title, CONTENT_WIDTH - 24) as string[];
      const noteLines = task.notes ? (doc.splitTextToSize(task.notes, CONTENT_WIDTH - 24) as string[]) : [];
      const checklistLineGroups = task.checklist.map(
        (item) => doc.splitTextToSize(item.text, CONTENT_WIDTH - 44) as string[],
      );
      const checklistHeight =
        checklistLineGroups.reduce((sum, lines) => sum + lines.length * 12 + 3, 0) +
        (task.checklist.length > 0 ? 4 : 0);
      const cardHeight =
        14 +
        titleLines.length * 14 +
        16 +
        (noteLines.length ? noteLines.length * 12 + 4 : 0) +
        checklistHeight +
        10;

      ensureSpace(cardHeight + 8);

      drawColor(COLORS.cardBorder);
      fillColor(COLORS.cardBg);
      doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, cardHeight, 5, 5, "FD");

      let cardY = y + 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      textColor(COLORS.textDark);
      doc.text(titleLines, MARGIN_X + 12, cardY);
      cardY += titleLines.length * 14;

      const priorityColor =
        task.priority === "high"
          ? COLORS.priorityHigh
          : task.priority === "medium"
            ? COLORS.priorityMedium
            : COLORS.priorityLow;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      textColor(priorityColor);
      doc.text(PRIORITY_LABEL[task.priority], MARGIN_X + 12, cardY);

      if (task.completedAt) {
        doc.setFont("helvetica", "normal");
        textColor(COLORS.textMuted);
        doc.text(`Completed ${formatTime(task.completedAt)}`, RIGHT_EDGE - 12, cardY, { align: "right" });
      }
      cardY += 12;

      if (noteLines.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        textColor(COLORS.textMuted);
        doc.text(noteLines, MARGIN_X + 12, cardY + 4);
        cardY += noteLines.length * 12 + 4;
      }

      if (task.checklist.length > 0) {
        cardY += 6;
        const boxSize = 7;
        const boxX = MARGIN_X + 14;
        for (let i = 0; i < task.checklist.length; i++) {
          const item = task.checklist[i]!;
          const lines = checklistLineGroups[i]!;
          const boxY = cardY - boxSize + 2;

          if (item.done) {
            fillColor(COLORS.headerBand);
            doc.roundedRect(boxX, boxY, boxSize, boxSize, 1.5, 1.5, "F");
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.8);
            doc.line(boxX + 1.3, boxY + 3.8, boxX + 2.8, boxY + 5.3);
            doc.line(boxX + 2.8, boxY + 5.3, boxX + 5.7, boxY + 1.5);
          } else {
            drawColor(COLORS.cardBorder);
            doc.setLineWidth(0.8);
            doc.roundedRect(boxX, boxY, boxSize, boxSize, 1.5, 1.5, "S");
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          textColor(item.done ? COLORS.textMuted : COLORS.textDark);
          doc.text(lines, boxX + boxSize + 6, cardY);
          cardY += lines.length * 12 + 3;
        }
      }

      y += cardHeight + 8;
    }

    y += 6;
  }

  if (input.clientNote.trim()) {
    ensureSpace(60);
    drawColor(COLORS.cardBorder);
    doc.setFillColor(255, 253, 240);
    const noteLines = doc.splitTextToSize(input.clientNote.trim(), CONTENT_WIDTH - 24) as string[];
    const boxHeight = 26 + noteLines.length * 13;
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, boxHeight, 5, 5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    textColor(COLORS.textDark);
    doc.text("Note for client", MARGIN_X + 12, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(noteLines, MARGIN_X + 12, y + 32);
    y += boxHeight;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    drawColor(COLORS.cardBorder);
    doc.line(MARGIN_X, PAGE_HEIGHT - 48, RIGHT_EDGE, PAGE_HEIGHT - 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    textColor(COLORS.textMuted);
    doc.text(`Generated by ${companyLabel} · ${new Date().toLocaleString()}`, MARGIN_X, PAGE_HEIGHT - 34);
    doc.text(`Page ${page} of ${pageCount}`, RIGHT_EDGE, PAGE_HEIGHT - 34, { align: "right" });
  }

  const safeName = input.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-report-${input.date}.pdf`);
}
