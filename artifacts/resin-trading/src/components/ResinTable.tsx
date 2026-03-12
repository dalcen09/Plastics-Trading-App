import { ResinEntry } from "@workspace/api-client-react";
import { Edit2, Trash2, Box, Package, ArrowDownUp } from "lucide-react";
import { formatCurrency, formatDate, formatNumber, cn } from "@/lib/utils";

interface ResinTableProps {
  data: ResinEntry[];
  onEdit: (entry: ResinEntry) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
}

export function ResinTable({ data, onEdit, onDelete, isLoading }: ResinTableProps) {
  
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
    <div className="w-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col relative">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-4 table-sticky-col-left bg-secondary/90 backdrop-blur-sm z-20">取引先</th>
              <th className="px-4 py-4">日付</th>
              <th className="px-4 py-4">担当者</th>
              <th className="px-4 py-4">樹脂</th>
              <th className="px-4 py-4">メーカー</th>
              <th className="px-4 py-4">グレード</th>
              <th className="px-4 py-4">仕様</th>
              <th className="px-4 py-4 text-right">価格 (円/kg)</th>
              <th className="px-4 py-4 text-right">数量 (kg)</th>
              <th className="px-4 py-4 table-sticky-col-right bg-secondary/90 backdrop-blur-sm text-center z-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row) => (
              <tr 
                key={row.id} 
                className="hover:bg-secondary/40 transition-colors group"
              >
                <td className="px-4 py-3 table-sticky-col-left bg-card group-hover:bg-secondary/40 font-medium text-foreground z-10 transition-colors">
                  {row.counterparty}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(row.date)}
                </td>
                <td className="px-4 py-3">
                  {row.personInCharge}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {row.resinType}
                    {row.ppType && row.ppType !== "N/A" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.ppType}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {row.manufacturer || <span className="text-border">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {row.grade || <span className="text-border">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex gap-3 text-muted-foreground">
                      <span title="メルトフローインデックス">MFI: {formatNumber(row.meltFlowIndex)}</span>
                      <span title="密度">密度: {formatNumber(row.density)}</span>
                    </div>
                    <div className="flex gap-2 items-center mt-0.5">
                      {row.packaging && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/80 text-[10px] uppercase font-medium">
                          <Package className="w-3 h-3" /> {row.packaging.replace('_', ' ')}
                        </span>
                      )}
                      {row.sampleAvailable && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold">
                          サンプル
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-foreground">
                  {formatCurrency(row.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium px-2 py-1 rounded-lg bg-secondary/80">
                    {formatNumber(row.quantity, "kg")}
                  </span>
                </td>
                <td className="px-4 py-3 table-sticky-col-right bg-card group-hover:bg-secondary/40 text-center z-10 transition-colors">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if(window.confirm("このエントリを削除してもよろしいですか？")) {
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
