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

const LOGO_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKcAAAA4CAYAAACYJuh6AAAACXBIWXMAAAhuAAAIbgEeGSF4AAAI9klEQVR4nO1dwW7bRhBdBm6TIg3sFgXam4KkQI/m2RcrN92ifEHoL6hSfUDkDxAqf0GpL6h8qk6tDLQ6tBfqUKCXAjZ6aW9mbwUKqFj3MVjT5M7scpciZT2AgRxb4op8OzNvZnYZrNdrsUM1BPHyQAgRCiGe4sh+Fvi5Y3GCVAiR4PW18noh/1lHR4ttv207choiiJddhYghjv0NDScj8LtjHR0ljPe1AjtyagCL2MUhSXjc2MHexgXIKq3rYh0dXTdpcFzsyJlDEC8lCfs4Dhs1OHusQNRZm8KBHTn/J2RfIeSmXHRdkKHADESdNXmg95aciB2je0LIMjSaqPeKnEG8fApCRpYKepshiRoLISbr6OiyCd/zXpATVnIghHjZgOGIXJrIBHVlBqSgitfRUVzDuUqx1eQM4qW0kKOarWRGvEscCfKUl64tEiadKMivHjgSc1fSkoKotSv+rSMn0j/9mki5KsgzNiZtgzDmKVJhWV7WhrQpSDqp8/ttFTmDeDkAKX25vgsld9jaCo1SSAhBXO4krpWkW0FOj+57BTXbajJSyBUb+ozrmIKgI6/jajM5YQEmjpPl5wohG6Fa6wbCgYyoXY0nkjHpwFcaqpXkxMWbOFTf50q+r5WlPp9gFClkuBM5F3xtI2cQL0dIC1WNK1fI621EibYVBFFPXbr61pATNe+4ogvPKiKTbere2QSUrEiUa4i5ghWtHKO3gpywlm8rfMQVBNPObXsAwqwBiJpZ08pWtNHkdGAtZSw0ug+NuU1BLnOyghXVeikltXUrV9xYcuJLTixjyylIeS/VdhMAwo1AukFRKRTxa5y7x2n2940jJ2IZScrXFm/fkbJhUEgqy7dRNjr8/w+a0b5qFDkRu8ws3PiOlA0HyNhfR0cyNpU/J8R9XjWGnBj8zNCNe8mv7eAfQbwkibfXhPuA+PIbg7esEJfshM4WY+PkDOKljC+/ZP55Cvc98TysHfwjJbxk+mCTNyGIl7EBMc9k29eOmFsD6j5uRq1DkcfM2vjOhW8hwIFFiSiS97xbOzmJQeXhtFa7Q/MAvREpA5tl3jE4/O6rruGIk6Q3tioBGhCTrCyE86G65YsOxuM1+Ow7SHpjYwsfzodZx3rpx3K/QzgfZss02OOren6be8F4z+UekQgtwglcshEMiMm1lgNmvX2am5kchBbX5QbhfJi9zJZwzJLemOp3jIjv8iLbI4mBCbEzSeDh/COGdlglvbFKRuaan9oIIlNLm4FqCpbNGS8M3DiXcH3M0rpxiCrXt+F8eBnOh/0NjME78L0oYqboYDKCDTmN3R1Uua4cKZt9Q67owQXhLsnYt7kwjtEBSTe61NY1EA5wvlM/6Y2NCyU25Dw0sUTIY5YS88mTX+V2fn3DVjZTspm6dV94vWUWNN+0UYRTmzhcWJJTcF07lFixyQ/+FZ99/JN49vg3oxNjYpg2hRxjljcBW5GnDefDEWPXvfOkN7bOtujImWp+R5ITvZiFJcmHe3+L5598Lz59/0/WIHPQWUHdmAc2JyuBrOmf5o4p4mYKHSjq1iKcD7sMMbqq6rF05ctEs/2JlpyKMr+DRw//Es/2fxHvPfjHdsxlJLtC40hZcB45JOiizCIgrqQs+yYEmhPAc1FxpjQSkW3KMQPl1stSIFTcuSgi9eNHf4gvPvrRmpiYsWVCaKYZr8R+OB/WEXu6tNBNRMwQo4OkN668Rosipy6QLbSeEEB3UkYf7ifi84OfjQeYg45cCwTeOtfunZxMa9HKdUyY3FTJ+SzpjZ1kJaqQ807chLb7Ird68vyD381Hp55ML4RSJdGts57ehRHj81MXVqVuIE6mxNxF0hs78xxaciI3VRbk37KcSjOHCmnFXjnaSk9n9WYlr4vgze1iAlE3sK29AlTayCrRrgOnn7NMZOTTCEULlboO14frSKUSksqpuRBGXaRSVITE1i0S06Q3bmMqibPlT7eqAMqDk+csvdkQKJk7V2MRp8SESykLwlWXnsV855qPcyGMjpFKUY+XGmKmSEY3pRhgCoqYqY84ugo5ZSF/UeDOXVtMYWA1df+noq4qjcyHvpEdP1WS0Q3ABTGEfZtmIAokOWGJVgW/ygiTX1s+cElMxHE6MhURkXLtL2uqGB3jOo021HziCiNGgUGKTafxPLd8mSfAFFazm1PQJx72Edc97SItakeDkCuaUCrqcrEdxOyLlhOUc71GLic9d4HbQilXpYrVVF3VG08b3Otm43WBMHn3O+Jzo5qV8yG8jO9J4WUCSGMUzodTovqVuXfbtspbYFnOXFfJRLp6NHVkin3qY+EZhJAuGO8UCJPsoJoSOhU6hKS4CbIDzbgnDNf32tJ6mtxsn0+dGxBFDuHSvZt0JZ0re4ILxepcqNuMOIbvUqCTccvJi6oIh0RFf0NZeZarZLhUTmNKKaA/OPfEiXs3IeciZzU7+LJelC9DCLmAU2GEWJdStkUdSZSA5FpO6npV3hkFk7AW9W5CzplywsxqmjYJm6Cux/65tvpUpqBoMlDk7Ghi6xtgMlMxdB0FkQyV3TubnNIqyEOxmm887w5cV3dP3YnxO+RkFA4k3pbdbFj/wk6wHJwIVvQGnDL+tJJ7t9mORs7Oc587bzCE0BnR4KGCaoy9EUaMFZJcUBO2TBBxHsDwNSzoTHHR3EdvXzhuOJkwniFaSb0bkRNlyoMarA31+RPugqlwPkwYXdt9A7JToMKcQiIhVXPGWMm4b7FMJXV9z6S1RxmYWkJ9495tegpM1xANsNmB735E3YVcmazkY7pM2xRPEcixZT0JBRgxxIYpUjT/Ot8mEilG6toKW/fOJic2dr32/VxuzEZd7GQTN3HG7CqtxCFB4RoiOZGS3riLsMUFrtAt5HNJMif3aaXeTSxnfk8bX6DOYTM5OO9xKcCo0qk2BkPD7osKVjSFYAl9NzZjMnIqbcbqfU+juvIWoOpjUjjqTmQPPi353bWNe0J8dEIls6VrRxhwSYyXShdNiHOR1xEuU/aNys/JHvMnXxfFrNljtOUhCwKmE5j6PtprLuNJi7BIf42FWPwHWfzVgP60zIwAAAAASUVORK5CYII=";

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
          <div class="header-logo" role="img" aria-label="MARUKI"></div>
          <div class="doc-type">樹脂製品カタログ</div>
        </div>
        <div class="header-right">
          ${categoryLabel ? `<div class="badge">${categoryLabel}</div>` : ""}
        </div>
      </div>
      ${
        fmtDate(row.date)
          ? `<div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">日付</span>
          <span class="meta-value">${fmtDate(row.date)}</span>
        </div>
      </div>`
          : ""
      }
      <div class="content">
        ${sectionHtml("製品", productFields)}
        ${sectionHtml("物性データ", physicalFields)}
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
      padding: 20px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .header-secondary { background: #1e293b; }

    .header-logo {
      width: 134px;
      height: 45px;
      background-image: url('${LOGO_B64}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center left;
      filter: brightness(0) invert(1);
      flex-shrink: 0;
    }
    .doc-type {
      font-size: 11px;
      opacity: 0.75;
      margin-top: 5px;
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
    .badge-sub {
      font-size: 10px;
      opacity: 0.65;
      margin-top: 5px;
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
    .content { flex: 1; padding: 20px 32px; }

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

    .field-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 36px;
    }
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
    @media print {
      body { background: #fff; }
      .page {
        width: 100%;
        min-height: 100vh;
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        page-break-after: always;
        break-after: page;
      }
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${row.counterparty ?? "カタログ"} — MARUKI</title>
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
