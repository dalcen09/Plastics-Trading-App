import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useGetMatches } from "@workspace/api-client-react";
import { Handshake, ArrowRightLeft, AlertCircle, Building2, User, Gauge, DollarSign, ChevronLeft, ChevronRight, X, ExternalLink, Calendar } from "lucide-react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";

const PAGE_SIZE = 30;

function fmtN(n: number): string {
  return parseFloat(n.toPrecision(10)).toString();
}

function formatMI(lower: number | string | null | undefined, upper: number | string | null | undefined): string | null {
  const lo = lower != null && lower !== "" ? Number(lower) : null;
  const hi = upper != null && upper !== "" ? Number(upper) : null;
  if (lo !== null && hi !== null && lo === hi) return fmtN(lo);
  if (lo !== null && hi !== null) return `${fmtN(lo)}〜${fmtN(hi)}`;
  if (lo !== null) return `${fmtN(lo)}以上`;
  if (hi !== null) return `${fmtN(hi)}以下`;
  return null;
}

function toN(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function formatQty(lower: number | string | null | undefined, upper: number | string | null | undefined, single?: number | string | null | undefined): string {
  const lo = toN(lower), hi = toN(upper), s = toN(single);
  if (lo !== null && hi !== null && lo === hi) return `${formatNumber(lo)} kg`;
  if (lo !== null && hi !== null) return `${formatNumber(lo)}〜${formatNumber(hi)} kg`;
  if (lo !== null) return `${formatNumber(lo)} kg以上`;
  if (hi !== null) return `${formatNumber(hi)} kg以下`;
  if (s !== null) return `${formatNumber(s)} kg`;
  return "—";
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return String(d).replace(/-/g, "/").slice(0, 10);
}

function formatPriceRange(lower: number | string | null | undefined, upper: number | string | null | undefined, single?: number | string | null | undefined): string {
  const lo = toN(lower), hi = toN(upper), s = toN(single);
  const fmt = (n: number) => formatCurrency(n) ?? "—";
  if (lo !== null && hi !== null && lo === hi) return fmt(lo);
  if (lo !== null && hi !== null) return `${fmt(lo)}〜${fmt(hi)}`;
  if (lo !== null) return `${fmt(lo)}以上`;
  if (hi !== null) return `${fmt(hi)}以下`;
  if (s !== null) return fmt(s);
  return "—";
}

function useSearchParam(name: string): string | null {
  const [location] = useLocation();
  // useLocation() triggers re-render on navigation; window.location.search gives the actual query string
  void location;
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

const CATEGORY_LABEL: Record<string, string> = {
  virgin: "バージン",
  offgrade: "オフグレード",
  recycled: "再生",
};

const CATEGORY_THEME: Record<string, string> = {
  virgin:   "text-green-600 bg-green-500/10 border-green-500/20",
  offgrade: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  recycled: "text-teal-600  bg-teal-500/10  border-teal-500/20",
};

export function Matches() {
  const [page, setPage] = useState(0);
  const [, navigate] = useLocation();

  const entryIdStr = useSearchParam("entryId");
  const entryId = entryIdStr ? parseInt(entryIdStr, 10) : undefined;
  const entryName = useSearchParam("name");
  const resinCategory = useSearchParam("resinCategory") ?? undefined;

  const { data, isLoading } = useGetMatches(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(entryId ? { entryId } : {}),
      ...(resinCategory ? { resinCategory } : {}),
    },
    { query: { refetchInterval: 10_000, refetchOnWindowFocus: true } }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const isFiltered = !!entryId || !!resinCategory;

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Handshake className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    マッチング分析
                  </h1>
                  {resinCategory && (
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5", CATEGORY_THEME[resinCategory])}>
                      {CATEGORY_LABEL[resinCategory] ?? resinCategory}
                      <button
                        onClick={() => navigate(entryId ? `/matches?entryId=${entryId}&name=${encodeURIComponent(entryName ?? "")}` : "/matches")}
                        className="hover:opacity-70 rounded-full transition-opacity"
                        title="カテゴリフィルター解除"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                {entryId ? (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-muted-foreground text-sm">絞り込み中:</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                      {entryName ?? `ID ${entryId}`}
                      <button
                        onClick={() => navigate(resinCategory ? `/matches?resinCategory=${resinCategory}` : "/matches")}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        title="フィルター解除"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                    <span className="text-primary font-semibold text-sm">{total}件のマッチ</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    仕入先と販売先の自動マッチングを表示します。
                    {total > 0 && <span className="ml-2 font-semibold text-primary">{total.toLocaleString()}件</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Pagination top */}
            {total > PAGE_SIZE && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total.toLocaleString()}
                </span>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-card rounded-2xl border border-border shadow-sm animate-pulse" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6">
                {items.map((match, idx) => (
                  <MatchCard key={`${page}-${idx}`} match={match} highlightEntryId={entryId} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo(0, 0); }}
                    disabled={page === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-30 hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> 前へ
                  </button>
                  <span className="text-sm text-muted-foreground font-medium">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo(0, 0); }}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-30 hover:bg-secondary transition-colors"
                  >
                    次へ <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-96 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-3xl border border-border shadow-sm border-dashed">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">マッチングなし</h3>
              <p className="text-center max-w-md text-sm">
                {entryId
                  ? "この取引先に対するマッチングが見つかりませんでした。"
                  : resinCategory
                  ? `${CATEGORY_LABEL[resinCategory] ?? resinCategory}カテゴリに有効なマッチングが見つかりませんでした。`
                  : "現在の仕入先と販売先の間に有効なマッチングが見つかりませんでした。"}
              </p>
              {isFiltered ? (
                <button
                  onClick={() => navigate("/matches")}
                  className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  全マッチを表示
                </button>
              ) : (
                <div className="flex gap-4 mt-8">
                  <Link href="/virgin" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                    バージンを追加
                  </Link>
                  <Link href="/offgrade" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                    オフグレードを追加
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function getResinSubType(entry: any): string | null {
  switch (entry.resinType) {
    case "PP":  return entry.ppType  || null;
    case "PE":  return entry.peType  || null;
    case "PS":  return entry.psType  || null;
    case "ABS": return entry.absType || null;
    default:    return entry.otherResinType || null;
  }
}

function MatchCard({ match, highlightEntryId }: { match: any; highlightEntryId?: number }) {
  const isHighMatch = match.score >= 80;
  const scoreColor = isHighMatch
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : "text-amber-600 bg-amber-50 border-amber-200";

  const sourceIsHighlight = highlightEntryId && match.source.id === highlightEntryId;
  const demandIsHighlight = highlightEntryId && match.demand.id === highlightEntryId;

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5 border border-border/60 hover:shadow-xl hover:border-primary/20 transition-all duration-300">

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn("flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 shadow-inner", scoreColor)}>
            <span className="text-xl font-bold font-display">{match.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">スコア</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
              {match.source.resinType} {match.source.resinCategory === "virgin" ? "バージン" : match.source.resinCategory === "offgrade" ? "オフグレード" : "再生"} マッチ
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {match.reasons.map((reason: string, i: number) => (
                <span key={i} className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground font-medium">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch relative">

        {/* Source Panel */}
        <Link href={`/${match.source.resinCategory}?highlightId=${match.source.id}&tab=sources`} className={cn(
          "rounded-2xl p-5 border block cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]",
          sourceIsHighlight
            ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
            : "bg-secondary/30 border-border/50 hover:border-border"
        )}>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 仕入先（サプライヤー）
            {sourceIsHighlight && <span className="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">選択中</span>}
            <span className="ml-auto text-[10px] text-muted-foreground/60 flex items-center gap-0.5"><ExternalLink className="w-3 h-3" />テーブルで確認</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" /> {match.source.counterparty}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <User className="w-4 h-4" /> {match.source.personInCharge}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" /> {formatDate((match.source as any).date)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoBadge label="樹脂" value={match.source.resinType ?? '—'} />
              <InfoBadge label="タイプ" value={getResinSubType(match.source) ?? '—'} />
              <InfoBadge icon={<Gauge className="w-3.5 h-3.5"/>} label="製品" value={`${match.source.manufacturer || '未指定'} ${match.source.grade || ''}`} />
              <InfoBadge icon={<DollarSign className="w-3.5 h-3.5"/>} label="価格" value={formatPriceRange(match.source.priceLower, match.source.priceUpper, match.source.price)} />
              <InfoBadge label="MI" value={formatMI(match.source.meltFlowIndexLower, match.source.meltFlowIndexUpper) ?? '指定なし'} />
              <InfoBadge label="数量" value={formatQty(match.source.quantityLower, match.source.quantityUpper, match.source.quantity)} />
            </div>
          </div>
        </Link>

        {/* Divider / Arrow */}
        <div className="hidden md:flex flex-col items-center justify-center px-4 relative z-10">
          <div className="w-12 h-12 bg-background border-2 border-border rounded-full flex items-center justify-center text-muted-foreground shadow-sm relative z-10">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border -z-10 w-[200%] -translate-x-1/4 border-dashed border-t-2"></div>
        </div>

        {/* Demand Panel */}
        <Link href={`/${match.demand.resinCategory}?highlightId=${match.demand.id}&tab=demands`} className={cn(
          "rounded-2xl p-5 border relative overflow-hidden block cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]",
          demandIsHighlight
            ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
            : "bg-primary/5 border-primary/10 hover:border-primary/20"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> 販売先（バイヤー）
            {demandIsHighlight && <span className="text-primary text-[10px] bg-primary/20 px-1.5 py-0.5 rounded">選択中</span>}
            <span className="ml-auto text-[10px] text-primary/40 flex items-center gap-0.5"><ExternalLink className="w-3 h-3" />テーブルで確認</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary/60" /> {match.demand.counterparty}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <User className="w-4 h-4" /> {match.demand.personInCharge}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" /> {formatDate((match.demand as any).date)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoBadge label="樹脂" value={match.demand.resinType ?? '—'} />
              <InfoBadge label="タイプ" value={getResinSubType(match.demand) ?? '—'} />
              <InfoBadge icon={<Gauge className="w-3.5 h-3.5"/>} label="希望製品" value={`${match.demand.manufacturer || '指定なし'} ${match.demand.grade || ''}`} />
              <InfoBadge icon={<DollarSign className="w-3.5 h-3.5"/>} label="目標価格" value={formatPriceRange(match.demand.priceLower, match.demand.priceUpper, match.demand.price)} />
              <InfoBadge label="目標MI" value={formatMI(match.demand.meltFlowIndexLower, match.demand.meltFlowIndexUpper) ?? '指定なし'} />
              <InfoBadge label="希望数量" value={formatQty(match.demand.quantityLower, match.demand.quantityUpper, match.demand.quantity)} />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}

function InfoBadge({ icon, label, value }: { icon?: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-background rounded-lg p-2.5 border border-border/50 flex flex-col gap-0.5 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="font-semibold text-foreground truncate" title={value}>{value}</span>
    </div>
  );
}
