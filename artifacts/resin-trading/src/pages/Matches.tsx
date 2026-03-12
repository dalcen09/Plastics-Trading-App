import { Layout } from "@/components/Layout";
import { useGetMatches } from "@workspace/api-client-react";
import { Network, ArrowRightLeft, AlertCircle, Building2, User, Gauge, DollarSign } from "lucide-react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Link } from "wouter";

export function Matches() {
  const { data: matches, isLoading } = useGetMatches();

  return (
    <Layout>
      <div className="flex flex-col h-full space-y-8 max-w-6xl mx-auto">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Network className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                マッチング分析
              </h1>
              <p className="text-muted-foreground mt-1">
                仕入れ先と需要の自動マッチングを表示します。
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 pb-10">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-card rounded-2xl border border-border shadow-sm animate-pulse" />
              ))}
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {matches.sort((a, b) => b.score - a.score).map((match, idx) => (
                <MatchCard key={idx} match={match} />
              ))}
            </div>
          ) : (
            <div className="w-full h-96 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-3xl border border-border shadow-sm border-dashed">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">マッチングなし</h3>
              <p className="text-center max-w-md text-sm">
                現在の仕入れ先と需要の間に有効なマッチングが見つかりませんでした。在庫またはリクエストを追加してください。
              </p>
              <div className="flex gap-4 mt-8">
                <Link href="/virgin" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                  バージンを追加
                </Link>
                <Link href="/offgrade" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                  オフグレードを追加
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MatchCard({ match }: { match: any }) {
  const isHighMatch = match.score >= 80;
  const scoreColor = isHighMatch 
    ? "text-emerald-600 bg-emerald-50 border-emerald-200" 
    : "text-amber-600 bg-amber-50 border-amber-200";

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
              {match.source.resinType} {match.source.resinCategory === "virgin" ? "バージン" : match.source.resinCategory === "offgrade" ? "オフグレード" : "リサイクル"} マッチ
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
        <button className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-sm rounded-xl transition-colors">
          取引開始
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch relative">
        
        {/* Source Panel */}
        <div className="bg-secondary/30 rounded-2xl p-5 border border-border/50">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 仕入れ先（サプライヤー）
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" /> {match.source.counterparty}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <User className="w-4 h-4" /> {match.source.personInCharge}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoBadge icon={<Gauge className="w-3.5 h-3.5"/>} label="製品" value={`${match.source.manufacturer || '未指定'} ${match.source.grade || ''}`} />
              <InfoBadge icon={<DollarSign className="w-3.5 h-3.5"/>} label="価格" value={formatCurrency(match.source.price)} />
              <InfoBadge label="MI" value={formatNumber(match.source.meltFlowIndex)} />
              <InfoBadge label="数量" value={`${formatNumber(match.source.quantity)} MT`} />
            </div>
          </div>
        </div>

        {/* Divider / Arrow */}
        <div className="hidden md:flex flex-col items-center justify-center px-4 relative z-10">
          <div className="w-12 h-12 bg-background border-2 border-border rounded-full flex items-center justify-center text-muted-foreground shadow-sm relative z-10">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border -z-10 w-[200%] -translate-x-1/4 border-dashed border-t-2"></div>
        </div>

        {/* Demand Panel */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> 需要（バイヤー）
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary/60" /> {match.demand.counterparty}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <User className="w-4 h-4" /> {match.demand.personInCharge}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoBadge icon={<Gauge className="w-3.5 h-3.5"/>} label="希望製品" value={`${match.demand.manufacturer || '指定なし'} ${match.demand.grade || ''}`} />
              <InfoBadge icon={<DollarSign className="w-3.5 h-3.5"/>} label="目標価格" value={formatCurrency(match.demand.price)} />
              <InfoBadge label="目標MI" value={formatNumber(match.demand.meltFlowIndex) || '指定なし'} />
              <InfoBadge label="希望数量" value={`${formatNumber(match.demand.quantity)} MT`} />
            </div>
          </div>
        </div>

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
