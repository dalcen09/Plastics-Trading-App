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

function fieldRows(fields: Field[]): string {
  if (fields.length === 0) return "";
  return fields.map((f, i) => `
    <tr class="_c_tr${i % 2 === 0 ? " _c_tr_even" : ""}">
      <td class="_c_lbl">${f.label}</td>
      <td class="_c_val">${f.value}</td>
    </tr>`).join("");
}

function panelHtml(title: string, fields: Field[]): string {
  if (fields.length === 0) return `<div class="_c_panel"><div class="_c_sh">${title}</div></div>`;
  return `
    <div class="_c_panel">
      <div class="_c_sh">${title}</div>
      <table class="_c_tbl">
        <tbody>${fieldRows(fields)}</tbody>
      </table>
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
    ["数量 (kg)", fmtRange(row.quantityLower ?? row.quantity, row.quantityUpper ?? row.quantity) || null],
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
  const hasPhysical = physicalFields.length > 0;

  const photoCols =
    photos.length === 1 ? 1 :
    photos.length <= 4 ? 2 :
    photos.length <= 6 ? 3 :
    5;

  const categoryLabel =
    row.resinCategory === "offgrade" ? "オフグレード" :
    row.resinCategory === "recycled" ? "再生" : "";

  const physicalSection = hasPhysical ? `
    <div class="_c_full_section">
      <div class="_c_sh">物性</div>
      <table class="_c_tbl _c_tbl_inline">
        <tbody>
          <tr>${physicalFields.map(f => `<td class="_c_lbl_inline">${f.label}</td><td class="_c_val_inline">${f.value}</td>`).join("")}</tr>
        </tbody>
      </table>
    </div>` : "";

  const photoAspect = photoCols >= 5 ? "1 / 1" : "4 / 3";
  const photosSection = hasPhotos ? `
    <div class="_c_full_section">
      <div class="_c_sh">写真（${photos.length}枚${allPhotos.length > 10 ? " / 最大10枚表示" : ""}）</div>
      <div class="_c_photos" style="grid-template-columns: repeat(${photoCols}, 1fr);">
        ${photos.map(url =>
          `<div class="_c_photo_cell" style="aspect-ratio:${photoAspect};"><img src="${url}" alt="製品写真" loading="eager" /></div>`
        ).join("")}
      </div>
    </div>` : "";

  const pageHtml = `
    <div class="_c_page">
      <div class="_c_header">
        <div class="_c_hleft">
          <div class="_c_company">丸喜産業株式会社</div>
          <div class="_c_title">樹脂製品カタログ</div>
        </div>
        <div class="_c_hright">
          ${categoryLabel ? `<div class="_c_badge">${categoryLabel}</div>` : ""}
        </div>
      </div>
      <div class="_c_body">
        <div class="_c_two_panels">
          ${panelHtml("製品情報", productFields)}
          ${panelHtml("取引詳細", detailFields)}
        </div>
        ${physicalSection}
        ${photosSection}
      </div>
    </div>`;

  const css = `
    @page { size: A4; margin: 0; }

    ._c_page *, ._c_page *::before, ._c_page *::after {
      box-sizing: border-box; margin: 0; padding: 0;
    }

    ._c_page {
      font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans',
                   'Yu Gothic UI', 'Meiryo', sans-serif;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      background: #fff;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    ._c_header {
      background: hsl(152, 73%, 41%);
      color: #fff;
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    ._c_company {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.85);
      margin-bottom: 3px;
    }
    ._c_title {
      font-size: 21px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #fff;
    }
    ._c_hright { text-align: right; }
    ._c_badge {
      display: inline-block;
      background: rgba(255,255,255,0.22);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 5px;
      padding: 3px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    /* ── Body ── */
    ._c_body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 14px 22px 14px;
      gap: 10px;
      overflow: hidden;
    }

    /* ── Two-panel layout ── */
    ._c_two_panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 14px;
    }

    ._c_panel {
      display: flex;
      flex-direction: column;
    }

    /* ── Section heading ── */
    ._c_sh {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: hsl(152, 60%, 34%);
      border-bottom: 2px solid hsl(152, 73%, 41%);
      padding-bottom: 3px;
      margin-bottom: 5px;
    }

    /* ── Field table ── */
    ._c_tbl {
      width: 100%;
      border-collapse: collapse;
    }
    ._c_tr_even { background: #f8fafc; }
    ._c_lbl {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      padding: 4px 8px 4px 4px;
      white-space: nowrap;
      width: 38%;
      vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
    }
    ._c_val {
      font-size: 11px;
      color: #0f172a;
      font-weight: 500;
      padding: 4px 4px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }

    /* ── Physical (inline row) ── */
    ._c_full_section {
      flex-shrink: 0;
    }
    ._c_tbl_inline { border-collapse: collapse; }
    ._c_lbl_inline {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      padding: 3px 6px 3px 4px;
      white-space: nowrap;
    }
    ._c_val_inline {
      font-size: 10.5px;
      color: #0f172a;
      font-weight: 500;
      padding: 3px 16px 3px 0;
    }

    /* ── Photos ── */
    ._c_photos {
      display: grid;
      gap: 8px;
      margin-top: 5px;
    }
    ._c_photo_cell {
      overflow: hidden;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    ._c_photo_cell img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    /* ── Print ── */
    @media print {
      body { background: #fff; }
      ._c_page {
        width: 210mm;
        height: 297mm;
        margin: 0;
        box-shadow: none;
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
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #eef2f7;
      display: flex; justify-content: center; padding: 20px;
    }
    ${css}
    ._c_page {
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      border-radius: 2px;
      margin: 0 auto;
    }
  </style>
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

  // Show loading overlay while generating
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:rgba(0,0,0,0.45);
    display:flex;align-items:center;justify-content:center;
  `;
  overlay.innerHTML = `
    <div style="
      background:#fff;border-radius:14px;padding:28px 40px;
      font-family:'Hiragino Kaku Gothic ProN','Yu Gothic UI','Meiryo',sans-serif;
      font-size:15px;color:#1e293b;
      box-shadow:0 8px 32px rgba(0,0,0,0.25);
      display:flex;align-items:center;gap:14px;
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(152,73%,41%)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;flex-shrink:0;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      画像を生成中...
    </div>
  `;
  document.body.appendChild(overlay);

  try {
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

    const pageEl = container.querySelector("._c_page") as HTMLElement;

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
  } finally {
    document.body.removeChild(overlay);
  }
}
