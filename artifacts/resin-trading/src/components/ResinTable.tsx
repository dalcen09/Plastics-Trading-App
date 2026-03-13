import { ResinEntry } from "@workspace/api-client-react";
import { Edit2, Trash2, Box, Package, ArrowUp, ArrowDown, ArrowUpDown, ImageIcon, Download, FileText } from "lucide-react";
import { formatCurrency, formatDate, formatNumber, cn } from "@/lib/utils";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

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

export type ColumnKey =
  | "date" | "personInCharge" | "resinType" | "manufacturer"
  | "grade" | "charpy" | "izod" | "specs" | "price" | "storageLocation" | "quantity" | "quantityType" | "packaging" | "photo" | "tdsUrl" | "isClosed" | "sampleAvailable"
  | "prospectiveBuyer" | "desiredQuantity" | "proposedTo" | "sellingPrice" | "remarks";

export type SortKey =
  | "counterparty" | "date" | "personInCharge" | "resinType"
  | "manufacturer" | "grade" | "charpy" | "izod" | "price" | "quantity";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "date",           label: "日付" },
  { key: "personInCharge", label: "担当者" },
  { key: "resinType",      label: "樹脂" },
  { key: "manufacturer",   label: "メーカー" },
  { key: "grade",          label: "グレード" },
  { key: "charpy",         label: "シャルピー" },
  { key: "izod",           label: "アイゾッド" },
  { key: "specs",          label: "仕様 (MI/密度)" },
  { key: "price",           label: "価格 (円/kg)" },
  { key: "storageLocation", label: "置場" },
  { key: "quantity",        label: "数量 (kg)" },
  { key: "quantityType",   label: "数量区分" },
  { key: "packaging",      label: "梱包形態" },
  { key: "photo",            label: "写真" },
  { key: "tdsUrl",           label: "物性表" },
  { key: "sampleAvailable",  label: "サンプルあり" },
  { key: "prospectiveBuyer", label: "ワーク希望者" },
  { key: "desiredQuantity",  label: "希望数量 (kg)" },
  { key: "proposedTo",       label: "提案先" },
  { key: "sellingPrice",     label: "販売価格 (円/kg)" },
  { key: "remarks",          label: "備考" },
  { key: "isClosed",         label: "クローズ" },
];

export const DEFAULT_VISIBLE: Set<ColumnKey> = new Set(
  ALL_COLUMNS.map(c => c.key).filter(k =>
    k !== "charpy" && k !== "izod" && k !== "photo" && k !== "sampleAvailable" &&
    k !== "prospectiveBuyer" && k !== "desiredQuantity" && k !== "proposedTo" && k !== "sellingPrice"
  )
);

export function sortData(data: ResinEntry[], sort: SortConfig | null): ResinEntry[] {
  if (!sort) return data;
  const { key, direction } = sort;
  const mul = direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    let av: any = (a as any)[key];
    let bv: any = (b as any)[key];

    // Numeric columns
    if (["charpy", "izod", "price", "quantity"].includes(key)) {
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
  onToggleClosed?: (entry: ResinEntry) => void;
  isLoading: boolean;
  visibleColumns: Set<ColumnKey>;
  sort: SortConfig | null;
  onSort: (key: SortKey) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (ids: number[]) => void;
  matchCounts?: Map<number, number>;
}

const dash = <span className="text-border">—</span>;

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
  if (type === "LLDPE") return { main: "PE", badge: "LLD" };
  if (type === "HDPE")  return { main: "PE", badge: "HD" };
  if (type === "LDPE")  return { main: "PE", badge: "LD" };
  if (type === "GPPS")  return { main: "PS", badge: "GP" };
  if (type === "HIPS")  return { main: "PS", badge: "HI" };
  return { main: type, badge: null };
}

export function ResinTable({ data, onEdit, onDelete, onToggleClosed, isLoading, visibleColumns, sort, onSort, selectedIds = new Set(), onToggleSelect, onToggleSelectAll, matchCounts }: ResinTableProps) {
  const col = (key: ColumnKey) => visibleColumns.has(key);
  const allIds = data.map(r => r.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [data]);

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
              {/* Checkbox select-all */}
              <th className="pl-4 pr-2 py-4 table-sticky-col-left bg-secondary z-20 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={() => onToggleSelectAll(allIds)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  title="このページをすべて選択"
                />
              </th>
              {/* 操作 sticky second column */}
              <th className="px-3 py-4 table-sticky-col-left-2 bg-secondary text-center z-20">操作</th>
              {/* 取引先 */}
              <SortTh colKey="counterparty" sort={sort} onSort={onSort}>
                取引先
              </SortTh>
              {col("date")           && <SortTh colKey="date"          sort={sort} onSort={onSort}>日付</SortTh>}
              {col("personInCharge") && <SortTh colKey="personInCharge" sort={sort} onSort={onSort}>担当者</SortTh>}
              {col("resinType")      && <SortTh colKey="resinType"      sort={sort} onSort={onSort}>樹脂</SortTh>}
              {col("manufacturer")   && <SortTh colKey="manufacturer"   sort={sort} onSort={onSort}>メーカー</SortTh>}
              {col("grade")          && <SortTh colKey="grade"          sort={sort} onSort={onSort}>グレード</SortTh>}
              {col("charpy")         && <SortTh colKey="charpy"         sort={sort} onSort={onSort} className="text-right">シャルピー</SortTh>}
              {col("izod")           && <SortTh colKey="izod"           sort={sort} onSort={onSort} className="text-right">アイゾッド</SortTh>}
              {col("specs")          && <th className="px-4 py-4">仕様</th>}
              {col("price")          && <SortTh colKey="price"    sort={sort} onSort={onSort} className="text-right">価格 (円/kg)</SortTh>}
              {col("storageLocation") && <th className="px-4 py-4">置場</th>}
              {col("quantity")       && <SortTh colKey="quantity"  sort={sort} onSort={onSort} className="text-right">数量 (kg)</SortTh>}
              {col("quantityType")   && <th className="px-4 py-4">数量区分</th>}
              {col("packaging")      && <th className="px-4 py-4">梱包形態</th>}
              {col("photo")          && <th className="px-4 py-4 text-center">写真</th>}
              {col("tdsUrl")         && <th className="px-4 py-4 text-center">物性表</th>}
              {col("sampleAvailable")  && <th className="px-4 py-4 text-center">サンプル</th>}
              {col("prospectiveBuyer") && <th className="px-4 py-4">ワーク希望者</th>}
              {col("desiredQuantity")  && <th className="px-4 py-4 text-right">希望数量 (kg)</th>}
              {col("proposedTo")       && <th className="px-4 py-4">提案先</th>}
              {col("sellingPrice")     && <th className="px-4 py-4 text-right">販売価格 (円/kg)</th>}
              {col("remarks")          && <th className="px-4 py-4">備考</th>}
              {col("isClosed")         && <th className="px-4 py-4 text-center">クローズ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row) => {
              const isSelected = selectedIds.has(row.id);
              return (
              <tr key={row.id} className={cn("hover:bg-secondary/40 transition-colors group", isSelected && "bg-primary/5", row.isClosed && "opacity-40")}>
                <td className={cn("pl-4 pr-2 py-3 table-sticky-col-left z-10 transition-colors", isSelected ? "bg-primary/10" : "bg-card group-hover:bg-secondary")}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(row.id)}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                </td>
                <td className={cn("px-3 py-3 table-sticky-col-left-2 text-center z-10 transition-colors", isSelected ? "bg-primary/10" : "bg-card group-hover:bg-secondary")}>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("このエントリを削除してもよろしいですか？")) {
                          onDelete(row.id);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className={cn("px-4 py-3 font-medium text-foreground transition-colors", isSelected ? "bg-primary/5" : "bg-card group-hover:bg-secondary/40")}>
                  <div className="flex flex-col gap-0.5">
                    {row.counterparty}
                    {matchCounts && (matchCounts.get(row.id) ?? 0) > 0 && (
                      <a href={`/matches?entryId=${row.id}&name=${encodeURIComponent(row.counterparty ?? '')}`} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit hover:bg-emerald-200 transition-colors">
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
                      {row.ppType && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.ppType}</span>
                      )}
                      {row.peType && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.peType}</span>
                      )}
                      {row.psType && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.psType}</span>
                      )}
                      {row.absType && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.absType}</span>
                      )}
                      {row.otherResinType && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.otherResinType}</span>
                      )}
                    </span>
                  </td>
                )}
                {col("manufacturer") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.manufacturer || dash}</td>
                )}
                {col("grade") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.grade || dash}</td>
                )}
                {col("charpy") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {row.charpy != null ? formatNumber(row.charpy) : dash}
                  </td>
                )}
                {col("izod") && (
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {row.izod != null ? formatNumber(row.izod) : dash}
                  </td>
                )}
                {col("specs") && (
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex gap-3 text-muted-foreground">
                        <span title="MI">MI: {
                          row.meltFlowIndexLower != null || row.meltFlowIndexUpper != null
                            ? [formatNumber(row.meltFlowIndexLower), formatNumber(row.meltFlowIndexUpper)]
                                .filter(v => v !== "-").join("〜")
                            : "-"
                        }</span>
                        <span title="密度">密度: {formatNumber(row.density)}</span>
                      </div>
                      <div className="flex gap-2 items-center mt-0.5">
                        {row.sampleAvailable && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold">
                            サンプル
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                )}
                {col("price") && (
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatCurrency(row.price)}
                  </td>
                )}
                {col("storageLocation") && (
                  <td className="px-4 py-3 text-muted-foreground">{row.storageLocation ?? dash}</td>
                )}
                {col("quantity") && (
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium px-2 py-1 rounded-lg bg-secondary/80">
                      {formatNumber(row.quantity, "kg")}
                    </span>
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
                {col("photo") && (
                  <td className="pl-4 pr-8 py-3">
                    {(() => {
                      const urls = row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : [];
                      const MAX = 3;
                      const visible = urls.slice(0, MAX);
                      const overflow = urls.length - MAX;
                      return urls.length > 0 ? (
                        <div className="flex items-center">
                          {visible.map((url, i) => (
                            <div key={url} className="relative flex-shrink-0 rounded-md ring-2 ring-card" style={{ marginLeft: i === 0 ? 0 : -8, zIndex: MAX - i }}>
                              <PhotoThumbnail url={url} index={i} />
                            </div>
                          ))}
                          {overflow > 0 && (
                            <div className="flex-shrink-0 w-9 h-9 rounded-md bg-secondary border border-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground" style={{ marginLeft: -8, zIndex: 0 }}>
                              +{overflow}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      );
                    })()}
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
                  <td className="px-4 py-3 text-center">
                    {row.sampleAvailable
                      ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">✓</span>
                      : <span className="text-muted-foreground/40">―</span>
                    }
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
                {col("remarks") && (
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px]">
                    <span className="line-clamp-2 whitespace-pre-wrap">{row.remarks || dash}</span>
                  </td>
                )}
                {col("isClosed") && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggleClosed?.(row)}
                      title={row.isClosed ? "クリックでオープンに戻す" : "クリックでクローズ"}
                      className="transition-opacity hover:opacity-70"
                    >
                      {row.isClosed
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium cursor-pointer">クローズ</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium dark:bg-green-900/30 dark:text-green-400 cursor-pointer">オープン</span>
                      }
                    </button>
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
