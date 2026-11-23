import { MandiEntry } from '../types/diary';
import { formatHindiDateTime } from './formatters';

interface CardTheme {
  bg: string;
  border: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    bg: '#F0FDF4',
    border: '#86EFAC',
    headerBg: '#DCFCE7',
    badgeBg: '#15803D',
    badgeText: '#FFFFFF',
  },
  {
    bg: '#FEFCE8',
    border: '#FDE047',
    headerBg: '#FEF9C3',
    badgeBg: '#A16207',
    badgeText: '#FFFFFF',
  },
  {
    bg: '#F0F9FF',
    border: '#7DD3FC',
    headerBg: '#E0F2FE',
    badgeBg: '#0369A1',
    badgeText: '#FFFFFF',
  },
  {
    bg: '#FFF7ED',
    border: '#FDBA74',
    headerBg: '#FFEDD5',
    badgeBg: '#C2410C',
    badgeText: '#FFFFFF',
  },
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const safeText = text && text.trim() ? text.trim() : '—';
  const words = safeText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      // Handle single ultra-long token
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const char of word) {
          if (ctx.measureText(chunk + char).width <= maxWidth) {
            chunk += char;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        }
        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : ['—'];
}

interface FieldItem {
  label: string;
  value: string;
}

function getEntryFields(entry: MandiEntry): FieldItem[] {
  return [
    { label: '👨‍🌾 किसान का नाम', value: entry.farmerName || '—' },
    { label: '🏡 गाँव', value: entry.village || '—' },
    { label: '📦 कितने कटे / नग', value: entry.quantity || '—' },
    { label: '🚚 ड्राइवर का नाम', value: entry.driverName || '—' },
    { label: '🔢 गाड़ी नंबर', value: entry.vehicleNumber || '—' },
    { label: '📞 किसान का फोन नंबर', value: entry.farmerPhone || '—' },
    { label: '📱 ड्राइवर का फोन नंबर', value: entry.driverPhone || '—' },
    {
      label: '🕒 गाड़ी निकलने की तारीख और समय',
      value: formatHindiDateTime(entry.departureDateTime),
    },
  ];
}

export async function downloadDiaryAsImage(entries: MandiEntry[]): Promise<void> {
  if (entries.length === 0) return;

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvasWidth = 1080;
  const paddingX = 40;
  const contentWidth = canvasWidth - paddingX * 2;
  const headerHeight = 160;
  const footerHeight = 76;
  const cardGap = 28;
  const cardPadding = 24;
  const cardHeaderHeight = 56;
  const colGap = 24;
  const colWidth = (contentWidth - cardPadding * 2 - colGap) / 2;

  const fontFamily = "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif";
  const labelFont = `600 20px ${fontFamily}`;
  const valueFont = `700 26px ${fontFamily}`;

  // Measurement canvas context
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) return;

  interface MeasuredCard {
    entry: MandiEntry;
    index: number;
    fields: Array<{
      label: string;
      lines: string[];
    }>;
    rowHeights: number[];
    totalHeight: number;
  }

  const measuredCards: MeasuredCard[] = entries.map((entry, idx) => {
    const rawFields = getEntryFields(entry);
    mCtx.font = valueFont;
    const fields = rawFields.map((f) => ({
      label: f.label,
      lines: wrapText(mCtx, f.value, colWidth),
    }));

    const rowHeights: number[] = [];
    // 4 rows of 2 columns
    for (let r = 0; r < 4; r += 1) {
      const leftLines = fields[r * 2].lines.length;
      const rightLines = fields[r * 2 + 1].lines.length;
      const maxLines = Math.max(leftLines, rightLines);
      const rowHeight = 32 + maxLines * 34 + 18;
      rowHeights.push(rowHeight);
    }

    const bodyHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    const totalHeight = cardHeaderHeight + cardPadding + bodyHeight + 12;

    return {
      entry,
      index: idx + 1,
      fields,
      rowHeights,
      totalHeight,
    };
  });

  const totalCardsHeight = measuredCards.reduce(
    (sum, card, idx) => sum + card.totalHeight + (idx > 0 ? cardGap : 0),
    0
  );

  const totalHeight = headerHeight + 36 + totalCardsHeight + 28 + footerHeight;

  // Keep canvas scale high (2x for phone crispness) while respecting browser max height (~16384px)
  const scale = totalHeight * 2 <= 16000 ? 2 : 1;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // Page background (warm register paper tint)
  ctx.fillStyle = '#F3FAF4';
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  // Subtle horizontal notebook rule lines across background
  ctx.strokeStyle = 'rgba(21, 128, 61, 0.06)';
  ctx.lineWidth = 1;
  for (let y = headerHeight + 20; y < totalHeight - footerHeight; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Top Header Banner
  const headerGrad = ctx.createLinearGradient(0, 0, canvasWidth, headerHeight);
  headerGrad.addColorStop(0, '#14532D');
  headerGrad.addColorStop(1, '#15803D');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  // Gold/Yellow register bottom stripe under header
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(0, headerHeight - 6, canvasWidth, 6);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 42px ${fontFamily}`;
  ctx.fillText('📒 मेरी मंडी डायरी', paddingX, 66);

  const todayText = new Intl.DateTimeFormat('hi-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  ctx.fillStyle = '#DCFCE7';
  ctx.font = `600 22px ${fontFamily}`;
  ctx.fillText(`तारीख: ${todayText}   •   कुल एंट्री: ${entries.length}`, paddingX, 118);

  // Draw each entry card
  let cursorY = headerHeight + 36;

  for (const card of measuredCards) {
    const theme = CARD_THEMES[(card.index - 1) % CARD_THEMES.length];

    // Card shadow
    ctx.save();
    ctx.shadowColor = 'rgba(20, 83, 45, 0.08)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = theme.bg;
    drawRoundedRect(ctx, paddingX, cursorY, contentWidth, card.totalHeight, 18);
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, paddingX, cursorY, contentWidth, card.totalHeight, 18);
    ctx.stroke();

    // Card top strip
    ctx.save();
    drawRoundedRect(ctx, paddingX, cursorY, contentWidth, card.totalHeight, 18);
    ctx.clip();
    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(paddingX, cursorY, contentWidth, cardHeaderHeight);
    ctx.restore();

    // Divider below card header
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingX, cursorY + cardHeaderHeight);
    ctx.lineTo(paddingX + contentWidth, cursorY + cardHeaderHeight);
    ctx.stroke();

    // Entry number badge on card top
    ctx.fillStyle = theme.badgeBg;
    drawRoundedRect(ctx, paddingX + cardPadding, cursorY + 11, 130, 34, 8);
    ctx.fill();

    ctx.fillStyle = theme.badgeText;
    ctx.font = `700 20px ${fontFamily}`;
    ctx.fillText(`एंट्री #${card.index}`, paddingX + cardPadding + 16, cursorY + 35);

    // Farmer name highlight on card header right
    ctx.fillStyle = '#14532D';
    ctx.font = `700 22px ${fontFamily}`;
    const headerTitle = card.entry.farmerName ? `किसान: ${card.entry.farmerName}` : 'मंडी एंट्री';
    ctx.fillText(headerTitle, paddingX + cardPadding + 150, cursorY + 36);

    // Render 4 rows x 2 columns
    let rowY = cursorY + cardHeaderHeight + cardPadding;

    for (let r = 0; r < 4; r += 1) {
      const leftField = card.fields[r * 2];
      const rightField = card.fields[r * 2 + 1];

      const leftX = paddingX + cardPadding;
      const rightX = paddingX + cardPadding + colWidth + colGap;

      // Left field label & lines
      ctx.fillStyle = '#475569';
      ctx.font = labelFont;
      ctx.fillText(leftField.label, leftX, rowY + 20);

      ctx.fillStyle = '#0F172A';
      ctx.font = valueFont;
      leftField.lines.forEach((line, lineIdx) => {
        ctx.fillText(line, leftX, rowY + 54 + lineIdx * 34);
      });

      // Right field label & lines
      ctx.fillStyle = '#475569';
      ctx.font = labelFont;
      ctx.fillText(rightField.label, rightX, rowY + 20);

      ctx.fillStyle = '#0F172A';
      ctx.font = valueFont;
      rightField.lines.forEach((line, lineIdx) => {
        ctx.fillText(line, rightX, rowY + 54 + lineIdx * 34);
      });

      // Subtle row divider for rows 0..2
      if (r < 3) {
        const dividerY = rowY + card.rowHeights[r] - 8;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, dividerY);
        ctx.lineTo(paddingX + contentWidth - cardPadding, dividerY);
        ctx.stroke();
      }

      rowY += card.rowHeights[r];
    }

    cursorY += card.totalHeight + cardGap;
  }

  // Footer
  ctx.fillStyle = '#166534';
  ctx.font = `600 20px ${fontFamily}`;
  ctx.fillText('मेरी मंडी डायरी — डिजिटल बही-खाता', paddingX, totalHeight - 30);

  // Trigger download
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'meri-mandi-dairy.png';
        link.click();
        resolve();
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meri-mandi-dairy.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
