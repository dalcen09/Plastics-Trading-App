import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Trash2, RotateCcw, AlertTriangle, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGetMatchesQueryKey, getGetMatchCountQueryKey, getGetMatchCountByEntryQueryKey } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

async function apiDelete(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return null;
}

type TrashEntry = {
  id: number;
  entryType: "source" | "demand";
  resinCategory: "virgin" | "offgrade" | "recycled";
  resinType: string;
  counterparty: string;
  manufacturer?: string | null;
  grade?: string | null;
  date: string;
  deletedAt: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  virgin: "バージン",
  offgrade: "オフグレード",
  recycled: "リサイクル",
};

const TYPE_LABEL: Record<string, string> = {
  source: "仕入れ先",
  demand: "需要",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

export function TrashView() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmPurgeId, setConfirmPurgeId] = useState<number | null>(null);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);

  const { data: items = [], isLoading } = useQuery<TrashEntry[]>({
    queryKey: ["trash"],
    queryFn: () => apiGet("/api/trash"),
    refetchInterval: 10000,
  });

  // Pagination calculations
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = useMemo(() => {
    if (pageSize === 0) return items;
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => { setPage(1); }, [pageSize]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["/api/sources"] });
    qc.invalidateQueries({ queryKey: ["/api/demands"] });
    qc.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
  };

  const restoreOne = useMutation({
    mutationFn: (id: number) => apiPost(`/api/trash/${id}/restore`),
    onSuccess: () => { invalidate(); setSelected(new Set()); },
  });

  const purgeOne = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/trash/${id}`),
    onSuccess: () => { invalidate(); setSelected(new Set()); setConfirmPurgeId(null); },
  });

  const restoreMany = useMutation({
    mutationFn: (ids: number[]) => apiPost(`/api/trash/batch-restore`, { ids }),
    onSuccess: () => { invalidate(); setSelected(new Set()); },
  });

  const purgeMany = useMutation({
    mutationFn: (ids: number[]) => apiDelete(`/api/trash/batch-purge`, { ids }),
    onSuccess: () => { invalidate(); setSelected(new Set()); setConfirmPurgeAll(false); },
  });

  const pagedIds = pagedData.map(i => i.id);
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selected.has(id));

  function toggleAll() {
    if (allPageSelected) {
      setSelected(prev => { const next = new Set(prev); pagedIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); pagedIds.forEach(id => next.add(id)); return next; });
    }
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedArr = Array.from(selected);

  return (
    <Layout>
      <div className="h-full flex flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2 rounded-xl">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">ゴミ箱</h1>
              <p className="text-sm text-muted-foreground">
                {items.length > 0 ? `${items.length}件の削除済みアイテム` : "削除済みアイテムはありません"}
              </p>
            </div>
          </div>

          {selectedArr.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedArr.length}件選択中</span>
              <button
                onClick={() => restoreMany.mutate(selectedArr)}
                disabled={restoreMany.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                まとめて復元
              </button>
              <button
                onClick={() => setConfirmPurgeAll(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
                まとめて完全削除
              </button>
            </div>
          )}
        </div>

        {/* Results count + page size */}
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground -mt-1">
            <span>
              {pageSize === 0
                ? `全 ${items.length} 件`
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, items.length)} 件表示 / 全 ${items.length} 件`
              }
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium">表示件数</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value={25}>25件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
                <option value={0}>すべて</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">読み込み中…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">ゴミ箱は空です</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-sm">
                <tr>
                  <th className="w-10 px-3 py-3 text-left">
                    <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition-colors">
                      {allPageSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">種別</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">カテゴリ</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">樹脂</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">取引先</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">メーカー・グレード</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">登録日</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">削除日時</th>
                  <th className="px-3 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t border-border/50 hover:bg-secondary/30 transition-colors",
                      selected.has(item.id) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggle(item.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {selected.has(item.id)
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        item.entryType === "source"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      )}>
                        {TYPE_LABEL[item.entryType]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/80">{CATEGORY_LABEL[item.resinCategory] ?? item.resinCategory}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.resinType}</td>
                    <td className="px-3 py-2.5 text-foreground/80">{item.counterparty}</td>
                    <td className="px-3 py-2.5 text-foreground/70 text-xs">
                      {[item.manufacturer, item.grade].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-foreground/70 text-xs tabular-nums">{formatDate(item.date)}</td>
                    <td className="px-3 py-2.5 text-destructive/70 text-xs tabular-nums">{formatDate(item.deletedAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => restoreOne.mutate(item.id)}
                          disabled={restoreOne.isPending}
                          title="復元"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          復元
                        </button>
                        <button
                          onClick={() => setConfirmPurgeId(item.id)}
                          title="完全削除"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          完全削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pb-1 flex-shrink-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-2 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      "min-w-[36px] h-9 px-3 rounded-lg border text-sm font-medium transition-colors",
                      safePage === p
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border bg-card hover:bg-secondary text-foreground"
                    )}
                  >
                    {p}
                  </button>
                )
              )
            }

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-2 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Confirm purge single */}
      {confirmPurgeId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 p-2 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-semibold text-foreground">完全削除の確認</h2>
            </div>
            <p className="text-sm text-muted-foreground">このアイテムを完全に削除します。この操作は取り消せません。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPurgeId(null)}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => purgeOne.mutate(confirmPurgeId)}
                disabled={purgeOne.isPending}
                className="flex-1 px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                完全削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm purge selected */}
      {confirmPurgeAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 p-2 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-semibold text-foreground">完全削除の確認</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              選択した{selectedArr.length}件を完全に削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPurgeAll(false)}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => purgeMany.mutate(selectedArr)}
                disabled={purgeMany.isPending}
                className="flex-1 px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                完全削除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
