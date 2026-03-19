import { ResinEntry } from "@workspace/api-client-react";
import { Edit2, Trash2, Copy, Box, Package, ArrowUp, ArrowDown, ArrowUpDown, ImageIcon, Download, FileText, Square, CheckSquare, BookOpen, MoreHorizontal, X, LayoutGrid } from "lucide-react";
import { openCatalogPrint, downloadCatalogImage } from "@/lib/catalogPrint";
import { formatCurrency, formatDate, formatNumber, cn } from "@/lib/utils";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";

function PhotoThumbnail({ url, index }: { url: string; index: number }) {
  const [popup, setPopup] = useState<{ top: number; left: number } | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  const scheduleHide = () => { hideTimer.current = setTimeout(() => setPopup(null), 120); };

  const show = useCallback(() => {
    cancelHide();
    if (!thumbRef.current) return;
    const r = thumbRef.current.getBoundingClientRect();
    const pw = 256;
    let left = r.left + r.width / 2 - pw / 2;
    const top = r.top;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    setPopup({ top, left });
  }, []);

  return (
    <div ref={thumbRef} className="inline-block" onMouseEnter={show} onMouseLeave={scheduleHide}>
      <img
        src={url}
        alt={`写真 ${index + 1}`}
        className="w-9 h-9 object-cover rounded-md border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      />
      {popup && createPortal(
        <div
          className="fixed bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          style={{ top: popup.top, left: popup.left, width: 256, transform: "translateY(-100%) translateY(-6px)", zIndex: 9999 }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          <img src={url} alt={`写真 ${index + 1}`} className="w-full max-h-52 object-contain bg-secondary/30" />
          <div className="p-2.5 flex justify-center border-t border-border/50 bg-card">
            <a
              href={url}
              download
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ダウンロード
            </a>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function PhotoCell({ urls }: { urls: string[] }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const MAX = 3;
  const visible = urls.slice(0, MAX);
  const overflow = urls.length - MAX;
  if (urls.length === 0) {
    return <div className="flex justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>;
  }
  return (
    <>
      <div className="flex items-center">
        {visible.map((url, i) => (
          <div key={url} className="relative flex-shrink-0 rounded-md ring-2 ring-card" style={{ marginLeft: i === 0 ? 0 : -8, zIndex: MAX - i }}>
            <PhotoThumbnail url={url} index={i} />
          </div>
        ))}
        {overflow > 0 && (
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex-shrink-0 w-9 h-9 rounded-md bg-secondary border border-border/50 flex items-center justify-center text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer"
            style={{ marginLeft: -8, zIndex: 0 }}
          >
            +{overflow}
          </button>
        )}
      </div>
      {galleryOpen && <PhotoGalleryModal urls={urls} onClose={() => setGalleryOpen(false)} />}
    </>
  );
}

function PhotoGalleryModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        urls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
          zip.file(`photo_${i + 1}.${ext}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "photos.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <LayoutGrid className="w-4 h-4 text-primary" />
            写真一覧 ({urls.length}枚)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "作成中..." : "ZIP でダウンロード"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {urls.map((url, i) => (
              <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-border/50 bg-secondary/30">
                <img src={url} alt={`写真 ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <a
                    href={url}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-medium hover:bg-white transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    保存
                  </a>
                </div>
                <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export type ColumnKey =
  | "date" | "personInCharge" | "resinType" | "resinSubType" | "manufacturer"
  | "grade" | "charpy" | "izod" | "mi" | "density" | "price" | "locationType" | "storageLocation" | "quantity" | "quantityType" | "packaging" | "photo" | "tdsUrl" | "isClosed" | "sampleAvailable"
  | "prospectiveBuyer" | "desiredQuantity" | "proposedTo" | "sellingPrice" | "remarks"
  | "origin" | "colorTone" | "rohs" | "mesh" | "physicalOther" | "shape"
  | "packagingWeight" | "plainMaker" | "usageType" | "finalNegotiatedPrice";

export const RECYCLED_ONLY_COLUMNS: ColumnKey[] = ["origin", "colorTone", "rohs", "mesh", "physicalOther", "shape"];

export type SortKey =
  | "counterparty" | "date" | "personInCharge" | "resinType"
  | "manufacturer" | "grade" | "charpy" | "izod" | "mi" | "density" | "price" | "quantity";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "date",           label: "日付" },
  { key: "personInCharge", label: "担当者" },
  { key: "resinType",      label: "樹脂" },
  { key: "resinSubType",   label: "タイプ" },
  { key: "manufacturer",   label: "メーカー" },
  { key: "grade",          label: "グレード" },
  { key: "charpy",         label: "シャルピー" },
  { key: "izod",           label: "アイゾッド" },
  { key: "mi",             label: "MI" },
  { key: "density",        label: "比重" },
  { key: "price",           label: "価格 下限〜上限 (円/kg)" },
  { key: "locationType",    label: "納入・置場" },
  { key: "storageLocation", label: "場所" },
  { key: "quantity",        label: "数量 下限〜上限 (kg)" },
  { key: "quantityType",   label: "月間・スポット" },
  { key: "packaging",             label: "梱包形態" },
  { key: "packagingWeight",       label: "梱包重量" },
  { key: "plainMaker",            label: "無地・メーカー" },
  { key: "usageType",             label: "ランニング・ワンウェイ" },
  { key: "photo",            label: "写真" },
  { key: "tdsUrl",           label: "物性表" },
  { key: "sampleAvailable",  label: "サンプル" },
  { key: "prospectiveBuyer", label: "ワーク希望者" },
  { key: "desiredQuantity",  label: "希望数量" },
  { key: "proposedTo",       label: "提案先" },
  { key: "sellingPrice",          label: "販売価格" },
  { key: "finalNegotiatedPrice",  label: "最終交渉価格" },
  { key: "origin",           label: "由来" },
  { key: "colorTone",        label: "色目" },
  { key: "rohs",             label: "RoHS" },
  { key: "mesh",             label: "メッシュ" },
  { key: "physicalOther",    label: "その他（物性）" },
  { key: "shape",            label: "形状" },
  { key: "remarks",          label: "備考" },
  { key: "isClosed",         label: "クローズ" },
];

export const DEFAULT_VISIBLE: Set<ColumnKey> = new Set(
  ALL_COLUMNS.map(c => c.key).filter(k =>
    k !== "charpy" && k !== "izod" && k !== "photo" &&
    k !== "prospectiveBuyer" && k !== "desiredQuantity" && k !== "proposedTo" && k !== "sellingPrice" &&
    k !== "origin" && k !== "colorTone" && k !== "rohs" && k !== "mesh" && k !== "physicalOther" && k !== "shape" &&
    k !== "packagingWeight" && k !== "plainMaker" && k !== "usageType" && k !== "finalNegotiatedPrice"
  )
);

export function sortData(data: ResinEntry[], sort: SortConfig | null): ResinEntry[] {
  if (!sort) return data;
  const { key, direction } = sort;
  const mul = direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    let av: any = (a as any)[key];
    let bv: any = (b as any)[key];

    // Numeric columns — sort by lower bound
    if (key === "charpy")   { av = (a as any).charpyLower;         bv = (b as any).charpyLower; }
    if (key === "izod")     { av = (a as any).izodLower;           bv = (b as any).izodLower; }
    if (key === "mi")       { av = (a as any).meltFlowIndexLower;  bv = (b as any).meltFlowIndexLower; }
    if (key === "density")  { av = (a as any).densityLower;        bv = (b as any).densityLower; }
    if (["charpy", "izod", "mi", "density", "price", "quantity"].includes(key)) {
      const an = av == null ? -Infinity : Number(av);
      const bn = bv == null ? -Infinity : Number(bv);
      return mul * (an - bn);
    }

    // Date
    if (key === "date") {
      return mul * ((av ?? "").localeCompare(bv ?? ""));
    }

    // String — Japanese-aware locale compare
    const as = av ?? "";
    const bs = bv ?? "";
    return mul * as.localeCompare(bs, "ja", { sensitivity: "base" });
  });
}

interface ResinTableProps {
  data: ResinEntry[];
  onEdit: (entry: ResinEntry) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (entry: ResinEntry) => void;
  onToggleClosed?: (entry: ResinEntry) => void;
  isLoading: boolean;
  visibleColumns: Set<ColumnKey>;
  sort: SortConfig | null;
  onSort: (key: SortKey) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (ids: number[]) => void;
  matchCounts?: Map<number, number>;
  lastEditedId?: number | null;
  highlightId?: number | null;
}

const dash = <span className="text-border">—</span>;

/** Show `lower〜upper` but collapse to a single value when both are equal or only one exists. */
function formatRange(
  lower: number | string | null | undefined,
  upper: number | string | null | undefined,
  fmt: (v: number | string) => string,
): string {
  const l = lower != null && lower !== "" ? fmt(lower) : null;
  const u = upper != null && upper !== "" ? fmt(upper) : null;
  if (!l && !u) return "—";
  if (!l) return `${u}以下`;
  if (!u) return `${l}以上`;
  if (l === u) return l;
  return `${l}〜${u}`;
}

function SortIcon({ colKey, sort }: { colKey: SortKey; sort: SortConfig | null }) {
  if (!sort || sort.key !== colKey)
    return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 ml-1 inline-block" />;
  return sort.direction === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 text-primary ml-1 inline-block" />
    : <ArrowDown className="w-3.5 h-3.5 text-primary ml-1 inline-block" />;
}

function SortTh({
  colKey, sort, onSort, className = "", children,
}: {
  colKey: SortKey; sort: SortConfig | null; onSort: (k: SortKey) => void;
  className?: string; children: React.ReactNode;
}) {
  const active = sort?.key === colKey;
  return (
    <th
      className={cn("px-4 py-4 cursor-pointer select-none group", active && "text-primary", className)}
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center gap-0.5 hover:text-primary transition-colors">
        {children}
        <SortIcon colKey={colKey} sort={sort} />
      </span>
    </th>
  );
}

function resinVariant(type: string): { main: string; badge: string | null } {
  return { main: type, badge: null };
}

function ActionMenu({ row, onEdit, onDuplicate, onDelete }: {
  row: ResinEntry;
  onEdit: (r: ResinEntry) => void;
  onDuplicate?: (r: ResinEntry) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setPos({ top: 0, left: 0 }); // sentinel — actual layout is centered via CSS
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        title="操作メニュー"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && pos && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            style={{ minWidth: 200 }}
            className="bg-card border border-border rounded-xl shadow-2xl shadow-black/20 py-1 overflow-hidden animate-in zoom-in-95 duration-150"
            onMouseDown={e => e.stopPropagation()}
          >
          <button
            onClick={() => { setOpen(false); onEdit(row); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> 編集
          </button>
          <button
            onClick={() => { setOpen(false); openCatalogPrint(row); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <BookOpen className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" /> カタログ PDF
          </button>
          <button
            onClick={() => { setOpen(false); downloadCatalogImage(row); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <ImageIcon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" /> カタログ画像
          </button>
          {onDuplicate && (
            <button
              onClick={() => { setOpen(false); onDuplicate(row); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <Copy className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" /> 複製
            </button>
          )}
          <div className="border-t border-border/50 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              if (window.confirm("このエントリを削除してもよろしいですか？")) {
                onDelete(row.id);
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> 削除
          </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function ResinTable({ data, onEdit, onDelete, onDuplicate, onToggleClosed, isLoading, visibleColumns, sort, onSort, selectedIds = new Set(), onToggleSelect, onToggleSelectAll, matchCounts, lastEditedId, highlightId }: ResinTableProps) {
  const col = (key: ColumnKey) => visibleColumns.has(key);
  const allIds = data.map(r => r.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const [flashId, setFlashId] = useState<number | null>(null);

  useEffect(() => {
    if (lastEditedId == null) return;
    const el = rowRefs.current.get(lastEditedId);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lastEditedId, data]);

  useEffect(() => {
    if (highlightId == null) return;
    const el = rowRefs.current.get(highlightId);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashId(highlightId);
    const t = setTimeout(() => setFlashId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId, data]);

  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = allIds.some(id => selectedIds.has(id)) && !allSelected;

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="font-medium animate-pulse">データを読み込み中...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-border shadow-sm border-dashed">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Box className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p className="font-medium text-foreground">データがありません</p>
        <p className="text-sm mt-1">新しいレコードを追加してください。</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div ref={scrollRef} className="overflow-auto h-full">
        <table className="min-w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary font-semibold tracking-wider sticky top-0 z-20">
            <tr>
              {/* 取引先 */}
              <SortTh colKey="counterparty" sort={sort} onSort={onSort}>
                取引先
              </SortTh>
              {col("date")           && <SortTh colKey="date"          sort={sort} onSort={onSort}>日付</SortTh>}
              {col("personInCharge") && <SortTh colKey="personInCharge" sort={sort} onSort={onSort}>担当者</SortTh>}
              {col("resinType")      && <SortTh colKey="resinType"      sort={sort} onSort={onSort}>樹脂</SortTh>}
              {col("resinSubType")   && <th className="px-4 py-4">タイプ</th>}
              {col("manufacturer")   && <SortTh colKey="manufacturer"   sort={sort} onSort={onSort}>メーカー</SortTh>}
              {col("grade")          && <SortTh colKey="grade"          sort={sort} onSort={onSort}>グレード</SortTh>}
              {col("origin")         && <th className="px-4 py-4">由来</th>}
              {col("colorTone")      && <th className="px-4 py-4">色目</th>}
              {col("rohs")           && <th className="px-4 py-4">RoHS</th>}
              {col("mesh")           && <th className="px-4 py-4">メッシュ</th>}
              {col("charpy")   && <SortTh colKey="charpy"   sort={sort} onSort={onSort} className="text-right">シャルピー</SortTh>}
              {col("izod")     && <SortTh colKey="izod"     sort={sort} onSort={onSort} className="text-right">アイゾッド</SortTh>}
              {col("mi")       && <SortTh colKey="mi"       sort={sort} onSort={onSort} className="text-right">MI</SortTh>}
              {col("density")  && <SortTh colKey="density"  sort={sort} onSort={onSort} className="text-right">比重</SortTh>}
              {col("physicalOther") && <th className="px-4 py-4">その他</th>}
              {col("shape")         && <th className="px-4 py-4">形状</th>}
              {col("price")          && <SortTh colKey="price"    sort={sort} onSort={onSort} className="text-right">価格 (円/kg)</SortTh>}
              {col("locationType")    && <th className="px-4 py-4">納入・置場</th>}
              {col("storageLocation") && <th className="px-4 py-4">場所</th>}
              {col("quantity")       && <SortTh colKey="quantity"  sort={sort} onSort={onSort} className="text-right">数量 (kg)</SortTh>}
              {col("quantityType")   && <th className="px-4 py-4">月間・スポット</th>}
              {col("packaging")             && <th className="px-4 py-4">梱包形態</th>}
              {col("packagingWeight")       && <th className="px-4 py-4 text-right">梱包重量</th>}
              {col("plainMaker")            && <th className="px-4 py-4">無地・メーカー</th>}
              {col("usageType")             && <th className="px-4 py-4">ランニング・ワンウェイ</th>}
              {col("photo")          && <th className="px-4 py-4 text-center">写真</th>}
              {col("tdsUrl")         && <th className="px-4 py-4 text-center">物性表</th>}
              {col("sampleAvailable")  && <th className="px-4 py-4">サンプル</th>}
              {col("prospectiveBuyer") && <th className="px-4 py-4">ワーク希望者</th>}
              {col("desiredQuantity")  && <th className="px-4 py-4 text-right">希望数量</th>}
              {col("proposedTo")       && <th className="px-4 py-4">提案先</th>}
              {col("sellingPrice")          && <th className="px-4 py-4 text-right">販売価格</th>}
              {col("finalNegotiatedPrice") && <th className="px-4 py-4 text-right">最終交渉価格</th>}
              {col("remarks")          && <th className="px-4 py-4">備考</th>}
              {col("isClosed")         && <th className="px-4 py-4 text-center">クローズ</th>}
              {/* 操作 sticky right */}
              <th className="px-3 py-4 table-sticky-col-right-2 bg-secondary text-center z-20">操作</th>
              {/* Checkbox select-all sticky right */}
              <th className="pl-2 pr-4 py-4 table-sticky-col-right bg-secondary z-20 w-10">
                <button onClick={() => onToggleSelectAll(allIds)} title="このページをすべて選択" className="text-muted-foreground hover:text-foreground transition-colors">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4" />}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row) => {
              const isSelected = selectedIds.has(row.id);
              return (
              <tr key={row.id} ref={el => { if (el) rowRefs.current.set(row.id, el); else rowRefs.current.delete(row.id); }} className={cn("hover:bg-secondary/40 transition-colors group", isSelected && "bg-primary/5", row.isClosed === "クローズ" && "opacity-40", flashId === row.id && "animate-row-highlight")}>
                <td className={cn("px-4 py-3 font-medium text-foreground transition-colors", isSelected ? "bg-primary/5" : "bg-card group-hover:bg-secondary/40")}>
                  <div className="flex flex-col gap-0.5">
                    {row.counterparty}
                    {matchCounts && (matchCounts.get(row.id) ?? 0) > 0 && (
                      <a href={`${row.resinCategory ? `/matches/${row.resinCategory}` : '/matches'}?entryId=${row.id}&name=${encodeURIComponent(row.counterparty ?? '')}`} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit hover:bg-emerald-200 transition-colors">
                        ⚡ {matchCounts.get(row.id)}件マッチ
                      </a>
                    )}
                  </div>
                </td>
                {col("date") && (
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</td>
                )}
                {col("personInCharge") && (
                  <td className="px-4 py-3">{row.personInCharge}</td>
                )}
                {col("resinType") && (
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {(() => {
                        if (row.resinType === "Other" && row.otherResinType) {
                          return <>{row.otherResinType}</>;
                        }
                        const { main, badge } = resinVariant(row.resinType);
                        return (
                          <>
                            {main}
                            {badge && (
                              <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{badge}</span>
                            )}
                          </>
                        );
                      })()}
                    </span>
                  </td>
                )}
                {col("resinSubType") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {(() => {
                      const t = row.ppType ?? row.peType ?? row.psType ?? row.absType;
                      return t ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary text-muted-foreground">{t}</span>
                      ) : dash;
                    })()}
                  </td>
                )}
                {col("manufacturer") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.manufacturer || dash}</td>
                )}
                {col("grade") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.grade || dash}</td>
                )}
                {col("origin") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.origin || dash}</td>
                )}
                {col("colorTone") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.colorTone || dash}</td>
                )}
                {col("rohs") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.rohs || dash}</td>
                )}
                {col("mesh") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.mesh || dash}</td>
                )}
                {col("charpy") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {formatRange(row.charpyLower, row.charpyUpper, v => formatNumber(v as number))}
                  </td>
                )}
                {col("izod") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {formatRange(row.izodLower, row.izodUpper, v => formatNumber(v as number))}
                  </td>
                )}
                {col("mi") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {formatRange(row.meltFlowIndexLower, row.meltFlowIndexUpper, v => formatNumber(v as number))}
                  </td>
                )}
                {col("density") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {formatRange(row.densityLower, row.densityUpper, v => formatNumber(v as number))}
                  </td>
                )}
                {col("physicalOther") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{(row as any).physicalOther || dash}</td>
                )}
                {col("shape") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{(row as any).shape || dash}</td>
                )}
                {col("price") && (
                  <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                    {formatRange(row.priceLower ?? row.price, row.priceUpper ?? row.price, v => formatCurrency(v as number))}
                  </td>
                )}
                {col("locationType") && (
                  <td className="px-4 py-3 text-muted-foreground">{row.locationType ?? dash}</td>
                )}
                {col("storageLocation") && (
                  <td className="px-4 py-3 text-muted-foreground">{row.storageLocation ?? dash}</td>
                )}
                {col("quantity") && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatRange(
                      row.quantityLower ?? row.quantity,
                      row.quantityUpper ?? row.quantity,
                      v => formatNumber(v as number, "kg")
                    )}
                  </td>
                )}
                {col("quantityType") && (
                  <td className="px-4 py-3">
                    {row.quantityType ? (
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
                        row.quantityType === "月間"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      )}>
                        {row.quantityType}
                      </span>
                    ) : dash}
                  </td>
                )}
                {col("packaging") && (
                  <td className="px-4 py-3 text-sm">
                    {row.packaging ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs font-medium">
                        <Package className="w-3 h-3" />{row.packaging}
                      </span>
                    ) : dash}
                  </td>
                )}
                {col("packagingWeight") && (
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {row.packagingWeight != null ? formatNumber(row.packagingWeight) : dash}
                  </td>
                )}
                {col("plainMaker") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.plainMaker || dash}</td>
                )}
                {col("usageType") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.usageType || dash}</td>
                )}
                {col("photo") && (
                  <td className="pl-4 pr-8 py-3">
                    <PhotoCell urls={row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []} />
                  </td>
                )}
                {col("tdsUrl") && (
                  <td className="px-4 py-3 text-center">
                    {row.tdsUrl ? (
                      <a
                        href={row.tdsUrl}
                        download
                        title="物性表をダウンロード"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        DL
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">―</span>
                    )}
                  </td>
                )}
                {col("sampleAvailable") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.sampleAvailable || dash}
                  </td>
                )}
                {col("prospectiveBuyer") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.prospectiveBuyer || dash}</td>
                )}
                {col("desiredQuantity") && (
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {row.desiredQuantity != null ? formatNumber(row.desiredQuantity) : dash}
                  </td>
                )}
                {col("proposedTo") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.proposedTo || dash}</td>
                )}
                {col("sellingPrice") && (
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {row.sellingPrice != null ? formatCurrency(row.sellingPrice) : dash}
                  </td>
                )}
                {col("finalNegotiatedPrice") && (
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {row.finalNegotiatedPrice != null ? formatCurrency(row.finalNegotiatedPrice) : dash}
                  </td>
                )}
                {col("remarks") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground min-w-[160px] max-w-[320px]">
                    <span className="whitespace-pre-wrap break-words">{row.remarks || dash}</span>
                  </td>
                )}
                {col("isClosed") && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggleClosed?.(row)}
                      title={row.isClosed === "クローズ" ? "クリックでオープンに戻す" : "クリックでクローズ"}
                      className="transition-opacity hover:opacity-70"
                    >
                      {row.isClosed === "クローズ"
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium cursor-pointer">クローズ</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium dark:bg-green-900/30 dark:text-green-400 cursor-pointer">オープン</span>
                      }
                    </button>
                  </td>
                )}
                {/* 操作 sticky right */}
                <td className={cn("px-2 py-3 table-sticky-col-right-2 text-center z-10 transition-colors", isSelected ? "bg-primary/10" : "bg-card group-hover:bg-secondary")}>
                  <ActionMenu row={row} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
                </td>
                {/* Checkbox sticky rightmost */}
                <td className={cn("pl-2 pr-4 py-3 table-sticky-col-right z-10 transition-colors", isSelected ? "bg-primary/10" : "bg-card group-hover:bg-secondary")}>
                  <button onClick={() => onToggleSelect(row.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
