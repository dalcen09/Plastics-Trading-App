import type { ResinEntry } from "@workspace/api-client-react";

function fmtNum(val: number | null | undefined, decimals = 0): string {
  if (val == null) return "";
  return val.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtRange(
  lower: number | null | undefined,
  upper: number | null | undefined,
  unit = "",
  decimals = 0
): string {
  const lo = lower != null ? fmtNum(lower, decimals) : null;
  const hi = upper != null ? fmtNum(upper, decimals) : null;
  if (!lo && !hi) return "";
  const suffix = unit ? ` ${unit}` : "";
  if (lo && hi && lo !== hi) return `${lo} ～ ${hi}${suffix}`;
  return `${lo ?? hi}${suffix}`;
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "";
  return String(val).replace(/-/g, "/").slice(0, 10);
}

function resinLabel(row: ResinEntry): string {
  if (row.resinType === "Other" && row.otherResinType) return row.otherResinType;
  const subtype = row.ppType ?? row.peType ?? row.psType ?? row.absType;
  if (subtype) return `${row.resinType ?? ""} (${subtype})`;
  return row.resinType ?? "";
}

interface Field { label: string; value: string; }

function buildFields(rows: [string, string | null | undefined][]): Field[] {
  return rows
    .filter(([, v]) => v != null && v !== "")
    .map(([label, value]) => ({ label, value: value! }));
}

function sectionHtml(title: string, fieldList: Field[], cols = 2): string {
  if (fieldList.length === 0) return "";
  const grid = cols === 2 ? "field-grid-2" : "field-grid-1";
  return `
    <div class="section">
      <h3 class="section-title">${title}</h3>
      <div class="${grid}">
        ${fieldList.map((f) => `
          <div class="field">
            <div class="field-label">${f.label}</div>
            <div class="field-value">${f.value}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans',
                 'Yu Gothic UI', 'Meiryo', sans-serif;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 794px;
    height: 1123px;
    background: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  .header {
    background: hsl(152, 73%, 41%);
    color: #fff;
    padding: 22px 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
  }
  .company-name {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.18em;
  }
  .doc-type {
    font-size: 12px;
    opacity: 0.75;
    margin-top: 4px;
    letter-spacing: 0.06em;
  }
  .header-right { text-align: right; }
  .badge {
    display: inline-block;
    background: rgba(255,255,255,0.22);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 5px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  /* ── Meta bar ── */
  .meta-bar {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 32px;
    display: flex;
    gap: 36px;
    flex-shrink: 0;
  }
  .meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .meta-value {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }

  /* ── Content ── */
  .content { flex: 1; padding: 20px 32px; overflow: hidden; }

  .section { margin-bottom: 18px; }

  .section-title {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: hsl(152, 60%, 36%);
    border-bottom: 2px solid hsl(152, 73%, 41%);
    padding-bottom: 4px;
    margin-bottom: 10px;
  }

  .field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 36px; }
  .field-grid-1 { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .field { display: flex; flex-direction: column; gap: 1px; }

  .field-label {
    font-size: 9.5px;
    color: #94a3b8;
    font-weight: 500;
    letter-spacing: 0.04em;
  }
  .field-value {
    font-size: 13px;
    color: #0f172a;
    font-weight: 500;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
  }

  /* ── Photos inline ── */
  .photos-inline-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 6px;
  }
  .photo-cell {
    aspect-ratio: 4/3;
    overflow: hidden;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-cell img { width: 100%; height: 100%; object-fit: contain; }

  /* ── TDS page ── */
  .tds-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 28px 32px;
    margin-top: 8px;
  }
  .tds-image { max-width: 100%; max-height: 900px; border: 1px solid #e2e8f0; border-radius: 6px; }
  .tds-note {
    font-size: 13px;
    color: #475569;
    margin-bottom: 14px;
    line-height: 1.6;
  }
  .tds-url-box {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 11px;
    color: hsl(152, 73%, 38%);
    word-break: break-all;
    margin-top: 10px;
  }

  /* ── Footer ── */
  .page-footer {
    border-top: 1px solid #e2e8f0;
    padding: 8px 32px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #94a3b8;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
`;

export async function openCatalogPrint(row: ResinEntry) {
  const productFields = buildFields([
    ["樹脂種別", resinLabel(row) || null],
    ["メーカー", row.manufacturer],
    ["グレード", row.grade],
    ["由来", row.origin],
    ["色目", row.colorTone],
    ["RoHS", row.rohs],
    ["メッシュ", row.mesh],
  ]);

  const physicalFields = buildFields([
    ["MI (g/10min)", fmtRange(row.meltFlowIndexLower, row.meltFlowIndexUpper) || null],
    ["シャルピー衝撃強度 (kJ/m²)", fmtRange(row.charpyLower, row.charpyUpper) || null],
    ["アイゾット衝撃強度 (kJ/m²)", fmtRange(row.izodLower, row.izodUpper) || null],
    ["密度 (g/cm³)", fmtRange(row.densityLower, row.densityUpper, "", 3) || null],
  ]);

  const detailFields = buildFields([
    ["数量 (kg)", fmtRange(row.quantityLower ?? row.quantity, row.quantityUpper ?? row.quantity) || null],
    ["数量区分", row.quantityType],
    ["納入・置場", row.locationType],
    ["場所", row.storageLocation],
    ["梱包形態", row.packaging],
    ["梱包重量", row.packagingWeight != null ? `${fmtNum(row.packagingWeight)} kg` : null],
    ["無地・メーカー袋", row.plainMaker],
    ["ランニング・ワンウェイ", row.usageType],
    ["サンプル", row.sampleAvailable],
  ]);

  const photos: string[] = row.imageUrls?.length
    ? (row.imageUrls as string[])
    : row.imageUrl ? [row.imageUrl as string] : [];
  const hasPhotos = photos.length > 0;
  const hasTds = !!row.tdsUrl;
  const tdsIsImage = !!row.tdsUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  const categoryLabel =
    row.resinCategory === "offgrade" ? "オフグレード"
    : row.resinCategory === "recycled" ? "再生"
    : "";

  const totalPages = 1 + (hasTds ? 1 : 0);

  const footerHtml = (pageNum: number) => `
    <div class="page-footer">
      <span>MARUKI — 社外秘 — 無断転載禁止</span>
      <span>${pageNum} / ${totalPages}</span>
    </div>`;

  const photosSection = hasPhotos ? `
    <div class="section">
      <h3 class="section-title">写真</h3>
      <div class="photos-inline-grid">
        ${photos.map((url) => `
          <div class="photo-cell">
            <img src="${url}" alt="製品写真" crossorigin="anonymous" />
          </div>`).join("")}
      </div>
    </div>` : "";

  const page1Html = `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">MARUKI</div>
          <div class="doc-type">樹脂製品カタログ</div>
        </div>
        ${categoryLabel ? `<div class="header-right"><div class="badge">${categoryLabel}</div></div>` : ""}
      </div>
      ${fmtDate(row.date) ? `
      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">日付</span>
          <span class="meta-value">${fmtDate(row.date)}</span>
        </div>
      </div>` : ""}
      <div class="content">
        ${sectionHtml("製品", productFields)}
        ${sectionHtml("物性データ", physicalFields)}
        ${sectionHtml("詳細", detailFields)}
        ${photosSection}
      </div>
      ${footerHtml(1)}
    </div>`;

  const page2Html = hasTds ? `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">MARUKI</div>
          <div class="doc-type">物性表 (TDS)</div>
        </div>
        ${categoryLabel ? `<div class="header-right"><div class="badge">${categoryLabel}</div></div>` : ""}
      </div>
      <div class="content">
        ${tdsIsImage ? `
          <div class="section">
            <h3 class="section-title">物性表</h3>
            <img src="${row.tdsUrl}" alt="物性表" class="tds-image" crossorigin="anonymous" />
          </div>` : `
          <div class="section">
            <h3 class="section-title">物性表</h3>
            <div class="tds-box">
              <p class="tds-note">物性表（TDS）は下記のURLよりご確認いただけます。</p>
              <div class="tds-url-box">${row.tdsUrl}</div>
            </div>
          </div>`}
      </div>
      ${footerHtml(2)}
    </div>` : "";

  const fullHtml = `${page1Html}${page2Html}`;

  const styleEl = document.createElement("style");
  styleEl.id = "catalog-pdf-style";
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    await Promise.all(
      Array.from(container.querySelectorAll("img")).map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
      )
    );

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pages = container.querySelectorAll(".page");

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        logging: false,
      });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, 210, 297);
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally {
    document.body.removeChild(container);
    document.head.removeChild(styleEl);
  }
}
