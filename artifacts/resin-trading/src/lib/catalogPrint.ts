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
        ${fieldList
          .map(
            (f) => `
          <div class="field">
            <div class="field-label">${f.label}</div>
            <div class="field-value">${f.value}</div>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

export function openCatalogPrint(row: ResinEntry) {
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
    ["その他", (row as any).physicalOther || null],
  ]);

  const detailFields = buildFields([
    [
      "数量 (kg)",
      fmtRange(row.quantityLower ?? row.quantity, row.quantityUpper ?? row.quantity) || null,
    ],
    ["数量区分", row.quantityType],
    ["納入・置場", row.locationType],
    ["場所", row.storageLocation],
    ["梱包形態", row.packaging],
    ["梱包重量", row.packagingWeight != null ? `${fmtNum(row.packagingWeight)} kg` : null],
    ["無地・メーカー袋", row.plainMaker],
    ["ランニング・ワンウェイ", row.usageType],
    ["サンプル", row.sampleAvailable],
  ]);

  const allPhotos: string[] = row.imageUrls?.length
    ? (row.imageUrls as string[])
    : row.imageUrl
    ? [row.imageUrl as string]
    : [];
  const photos = allPhotos.slice(0, 10);
  const hasPhotos = photos.length > 0;
  const hasTds = !!row.tdsUrl;

  // Determine grid columns based on photo count
  const photoCols =
    photos.length <= 2 ? 2 :
    photos.length <= 4 ? 2 :
    photos.length <= 6 ? 3 :
    5; // 7-10: 5 columns (2 rows)

  const categoryLabel =
    row.resinCategory === "offgrade"
      ? "オフグレード"
      : row.resinCategory === "recycled"
      ? "再生"
      : "";
  const typeLabel = (row as { entryType?: string }).entryType === "source" ? "仕入れ先" : "販売先";

  const totalPages = 1;

  const footerHtml = (pageNum: number) => `
    <div class="page-footer">
      <div class="footer-company">
        <span class="footer-name">丸喜産業株式会社</span>
        <span>〒939-1273　富山県高岡市葦付5858　／　TEL：0766-36-1464　／　FAX：0766-36-1429　／　URL：http://www.maruki-plastics.co.jp</span>
      </div>
      <span class="footer-page">${pageNum} / ${totalPages}</span>
    </div>`;

  const photoAspect = photoCols >= 5 ? "1 / 1" : "4 / 3";
  const photosSection = hasPhotos
    ? `
    <div class="section">
      <h3 class="section-title">写真（${photos.length}枚${allPhotos.length > 10 ? " / 最大10枚表示" : ""}）</h3>
      <div class="photos-inline-grid" style="grid-template-columns: repeat(${photoCols}, 1fr);">
        ${photos
          .map(
            (url) =>
              `<div class="photo-cell" style="aspect-ratio: ${photoAspect};"><img src="${url}" alt="製品写真" loading="eager" /></div>`
          )
          .join("")}
      </div>
    </div>`
    : "";

  const page1 = `
    <div class="page">
      <div class="header">
        <div class="header-left">
          <div class="catalog-title">樹脂製品カタログ</div>
        </div>
        <div class="header-right">
          ${categoryLabel ? `<div class="badge">${categoryLabel}</div>` : ""}
        </div>
      </div>
      <div class="content">
        ${sectionHtml("製品", productFields)}
        ${sectionHtml("物性", physicalFields)}
        ${sectionHtml("詳細", detailFields)}
        ${photosSection}
      </div>
      ${footerHtml(1)}
    </div>`;


  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans',
                   'Yu Gothic UI', 'Meiryo', sans-serif;
      color: #1e293b;
      background: #eef2f7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 20px auto;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      border-radius: 2px;
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      background: hsl(152, 73%, 41%);
      color: #fff;
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .catalog-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #fff;
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
    .badge-sub {
      font-size: 10px;
      opacity: 0.65;
      margin-top: 5px;
    }

    /* ── Content ── */
    .content { flex: 1; padding: 14px 28px; }

    .section { margin-bottom: 12px; }

    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: hsl(152, 60%, 36%);
      border-bottom: 2px solid hsl(152, 73%, 41%);
      padding-bottom: 3px;
      margin-bottom: 7px;
    }

    .field-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 28px;
    }
    .field-grid-1 { display: grid; grid-template-columns: 1fr; gap: 5px; }

    .field { display: flex; flex-direction: column; gap: 1px; }

    .field-label {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 500;
      letter-spacing: 0.04em;
    }
    .field-value {
      font-size: 12px;
      color: #0f172a;
      font-weight: 500;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 3px;
    }

    .remarks {
      font-size: 12.5px;
      color: #475569;
      line-height: 1.75;
      background: #f8fafc;
      border-left: 3px solid hsl(152, 73%, 41%);
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
    }

    /* ── Photos inline ── */
    .photos-inline-grid {
      display: grid;
      gap: 10px;
      margin-top: 6px;
    }
    .photo-cell {
      overflow: hidden;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-cell img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* ── TDS page ── */
    .tds-content { padding: 24px 32px !important; }
    .tds-embed-wrap {
      width: 100%;
      height: 200mm;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .tds-iframe { width: 100%; height: 100%; border: none; }
    .tds-image { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; }
    .tds-link-note { font-size: 10px; color: #94a3b8; margin-top: 6px; }
    .tds-link { color: hsl(152, 73%, 38%); word-break: break-all; }

    /* ── Footer ── */
    .page-footer {
      border-top: 2px solid hsl(152, 73%, 41%);
      padding: 8px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 8.5px;
      color: #64748b;
      letter-spacing: 0.03em;
      flex-shrink: 0;
      background: #f8fafc;
    }
    .footer-company {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .footer-name {
      font-weight: 700;
      font-size: 10px;
      color: hsl(152, 73%, 35%);
      letter-spacing: 0.06em;
    }
    .footer-page {
      white-space: nowrap;
      font-size: 9px;
      color: #94a3b8;
    }

    /* ── Print ── */
    @page { size: A4; margin: 0; }
    @media print {
      body { background: #fff; }
      .page {
        width: 210mm;
        height: 297mm;
        min-height: unset;
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
      }
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>樹脂製品カタログ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  ${page1}
  <script>
    var images = Array.from(document.images);
    var total = images.length;
    var loaded = 0;
    function tryPrint() {
      if (loaded >= total) setTimeout(function(){ window.print(); }, 300);
    }
    if (total === 0) {
      setTimeout(function(){ window.print(); }, 500);
    } else {
      images.forEach(function(img) {
        if (img.complete) { loaded++; tryPrint(); }
        else {
          img.onload = function() { loaded++; tryPrint(); };
          img.onerror = function() { loaded++; tryPrint(); };
        }
      });
    }
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("ポップアップがブロックされました。ポップアップを許可してから再試行してください。");
    return;
  }
  win.document.write(html);
  win.document.close();
}
