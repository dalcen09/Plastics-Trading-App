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

function buildCatalogContent(row: ResinEntry): { pageHtml: string; css: string; filename: string } {
  const productFields = buildFields([
    ["樹脂種類", resinLabel(row) || null],
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
    ["月間・スポット", row.quantityType],
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

  const photoCols =
    photos.length <= 2 ? 2 :
    photos.length <= 4 ? 2 :
    photos.length <= 6 ? 3 :
    5;

  const categoryLabel =
    row.resinCategory === "offgrade"
      ? "オフグレード"
      : row.resinCategory === "recycled"
      ? "再生"
      : "";

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

  const pageHtml = `
    <div class="page">
      <div class="header">
        <div class="header-left">
          <div class="company-name">丸喜産業株式会社</div>
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
    </div>`;

  const css = `
    @page { size: A4; margin: 0; }

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
      height: 297mm;
      max-height: 297mm;
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

    .company-name {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.85);
      margin-bottom: 4px;
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

    /* ── Content ── */
    .content { flex: 1; padding: 14px 28px; overflow: hidden; }

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

    /* ── Print ── */
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
      }
    }
  `;

  const resinType = resinLabel(row) || "catalog";
  const safeName = resinType.replace(/[^\w\u3000-\u9fff]+/g, "_");
  const filename = `カタログ_${safeName}.png`;

  return { pageHtml, css, filename };
}

export function openCatalogPrint(row: ResinEntry) {
  const { pageHtml, css } = buildCatalogContent(row);

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
  ${pageHtml}
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

export async function downloadCatalogImage(row: ResinEntry): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { pageHtml, css, filename } = buildCatalogContent(row);

  // A4 at 96 dpi: 210mm ≈ 794px, 297mm ≈ 1123px
  const W = 794;
  const H = 1123;

  const container = document.createElement("div");
  container.style.cssText = `position:fixed;top:0;left:${-(W + 200)}px;width:${W}px;height:${H}px;overflow:hidden;z-index:-9999;`;

  const styleEl = document.createElement("style");
  styleEl.textContent = css.replace(/@page\s*\{[^}]*\}/g, "");
  container.appendChild(styleEl);

  const pageWrapper = document.createElement("div");
  pageWrapper.innerHTML = pageHtml;
  container.appendChild(pageWrapper);

  document.body.appendChild(container);

  await document.fonts.ready;

  const images = Array.from(container.querySelectorAll("img"));
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
  }

  await new Promise<void>((r) => setTimeout(r, 400));

  const pageEl = container.querySelector(".page") as HTMLElement;

  const canvas = await html2canvas(pageEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: W,
    height: H,
    windowWidth: W,
    windowHeight: H,
    logging: false,
  });

  document.body.removeChild(container);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
