import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ResinTable, ALL_COLUMNS, DEFAULT_VISIBLE, ColumnKey, SortConfig, SortKey, sortData } from "@/components/ResinTable";
import { ResinForm } from "@/components/ResinForm";
import { 
  useListSources, 
  useListDemands, 
  useCreateSource, 
  useCreateDemand,
  useUpdateSource,
  useUpdateDemand,
  useDeleteSource,
  useDeleteDemand,
  getListSourcesQueryKey,
  getListDemandsQueryKey,
  getGetMatchesQueryKey,
  getGetMatchCountByEntryQueryKey,
  getGetMatchCountQueryKey,
  useGetMatchCountByEntry,
  ResinCategory,
  CreateResinEntryEntryType,
  ResinEntry
} from "@workspace/api-client-react";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Upload, Search, X, SlidersHorizontal, ChevronLeft, ChevronRight, Columns3, Download, Trash2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ImportModal } from "@/components/ImportModal";

interface CategoryViewProps {
  category: "virgin" | "offgrade" | "recycled";
}

const categoryLabels: Record<string, string> = {
  virgin: "バージン",
  offgrade: "オフグレード",
  recycled: "リサイクル",
};

interface Filters {
  search: string;
  resinType: string;
  manufacturer: string;
  personInCharge: string;
  dateFrom: string;
  dateTo: string;
}

const emptyFilters: Filters = {
  search: "",
  resinType: "",
  manufacturer: "",
  personInCharge: "",
  dateFrom: "",
  dateTo: "",
};

function applyFilters(data: ResinEntry[], filters: Filters): ResinEntry[] {
  return data.filter(row => {
    // Free text search across key fields
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        row.counterparty,
        row.manufacturer,
        row.grade,
        row.personInCharge,
        row.remarks,
        row.resinType,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.resinType && row.resinType !== filters.resinType) return false;
    if (filters.manufacturer && row.manufacturer !== filters.manufacturer) return false;
    if (filters.personInCharge && row.personInCharge !== filters.personInCharge) return false;
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    return true;
  });
}

export function CategoryView({ category }: CategoryViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"sources" | "demands">("sources");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResinEntry | undefined>();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE));
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lastEditedId, setLastEditedId] = useState<number | null>(null);

  const toggleColumn = (key: ColumnKey) =>
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });

  const handleSort = (key: SortKey) =>
    setSort(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );

  const handleToggleSelect = (id: number) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const handleToggleSelectAll = (ids: number[]) =>
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) { ids.forEach(id => next.delete(id)); }
      else { ids.forEach(id => next.add(id)); }
      return next;
    });

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!window.confirm(`選択した ${ids.length} 件を削除してもよろしいですか？`)) return;
    setIsBulkDeleting(true);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    try {
      const endpoint = activeTab === "sources" ? "sources" : "demands";
      await fetch(`${base}/api/${endpoint}/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelectedIds(new Set());
      if (activeTab === "sources") {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
      } else {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
      }
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
      toast({ title: `${ids.length} 件を削除しました` });
    } catch {
      toast({ title: "削除に失敗しました", variant: "destructive" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Clear selection when switching tabs or category
  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, category]);

  const { data: sources = [], isLoading: sourcesLoading } = useListSources({ resinCategory: category as ResinCategory });
  const { data: demands = [], isLoading: demandsLoading } = useListDemands({ resinCategory: category as ResinCategory });

  const { data: countByEntry = {} } = useGetMatchCountByEntry(
    { resinCategory: category }
  );
  const matchCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const [id, count] of Object.entries(countByEntry)) {
      map.set(Number(id), count as number);
    }
    return map;
  }, [countByEntry]);

  const activeData = activeTab === "sources" ? sources : demands;

  // Derive unique values for dropdowns from current tab's data
  const resinTypes = useMemo(() =>
    [...new Set(activeData.map(r => r.resinType).filter(Boolean))].sort(),
    [activeData]);
  const manufacturers = useMemo(() =>
    [...new Set(activeData.map(r => r.manufacturer).filter(Boolean))].sort(),
    [activeData]);
  const persons = useMemo(() =>
    [...new Set(activeData.map(r => r.personInCharge).filter(Boolean))].sort(),
    [activeData]);

  const filteredData = useMemo(() => applyFilters(activeData, filters), [activeData, filters]);

  const sortedData = useMemo(() => sortData(filteredData, sort), [filteredData, sort]);
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = useMemo(() => {
    if (pageSize === 0) return sortedData;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  // Reset to page 1 when filters, sort or tab changes
  useEffect(() => { setPage(1); }, [filters, activeTab, pageSize, sort]);

  const hasActiveFilters = Object.values(filters).some(v => v !== "");
  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(emptyFilters);

  const createSource = useCreateSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        closeForm();
        toast({ title: "成功", description: "仕入れ先を登録しました" });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "仕入れ先の登録に失敗しました" })
    }
  });

  const updateSource = useUpdateSource({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        setLastEditedId(variables.id);
        closeForm();
        toast({ title: "成功", description: "仕入れ先を更新しました" });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "仕入れ先の更新に失敗しました" })
    }
  });

  const toggleClosedSource = useUpdateSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "更新に失敗しました" })
    }
  });

  const deleteSource = useDeleteSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["trash"] });
        toast({ title: "成功", description: "仕入れ先を削除しました" });
      }
    }
  });

  const createDemand = useCreateDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        closeForm();
        toast({ title: "成功", description: "需要を登録しました" });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "需要の登録に失敗しました" })
    }
  });

  const updateDemand = useUpdateDemand({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        setLastEditedId(variables.id);
        closeForm();
        toast({ title: "成功", description: "需要を更新しました" });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "需要の更新に失敗しました" })
    }
  });

  const toggleClosedDemand = useUpdateDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
      },
      onError: () => toast({ variant: "destructive", title: "エラー", description: "更新に失敗しました" })
    }
  });

  const deleteDemand = useDeleteDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["trash"] });
        toast({ title: "成功", description: "需要を削除しました" });
      }
    }
  });

  const handleOpenForm = (entry?: ResinEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEntry(undefined);
  };

  const handleSubmit = (data: any) => {
    if (activeTab === "sources") {
      if (editingEntry) {
        updateSource.mutate({ id: editingEntry.id, data });
      } else {
        createSource.mutate({ data });
      }
    } else {
      if (editingEntry) {
        updateDemand.mutate({ id: editingEntry.id, data });
      } else {
        createDemand.mutate({ data });
      }
    }
  };

  const handleDelete = (id: number) => {
    if (activeTab === "sources") {
      deleteSource.mutate({ id });
    } else {
      deleteDemand.mutate({ id });
    }
  };

  const handleToggleClosed = (entry: ResinEntry) => {
    const updated = { ...entry, isClosed: !entry.isClosed };
    if (activeTab === "sources") {
      toggleClosedSource.mutate({ id: entry.id, data: updated });
    } else {
      toggleClosedDemand.mutate({ id: entry.id, data: updated });
    }
  };

  const isPending = createSource.isPending || updateSource.isPending || createDemand.isPending || updateDemand.isPending;

  const categoryTheme = {
    virgin: "text-green-600 bg-green-500/10 border-green-500/20",
    offgrade: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    recycled: "text-teal-600 bg-teal-500/10 border-teal-500/20"
  }[category];

  return (
    <Layout>
      <div className="flex flex-col h-full space-y-2">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-bold text-foreground">
              {categoryLabels[category]}
            </h1>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border", categoryTheme)}>
              リアルタイム
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 rounded-xl font-semibold border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              データインポート
            </button>
            <button
              onClick={() => exportToExcel(sortedData, visibleColumns)}
              className="px-3 py-1.5 rounded-xl font-semibold border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
              title={`${sortedData.length}件をエクスポート`}
            >
              <Download className="w-4 h-4" />
              Excelエクスポート
            </button>
            <button 
              onClick={() => handleOpenForm()}
              className="px-4 py-1.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {activeTab === "sources" ? "仕入を追加" : "需要を追加"}
            </button>
          </div>
        </div>

        {/* Tabs + Search row */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Custom Tabs */}
          <div className="flex p-1 bg-secondary/50 rounded-xl w-full max-w-sm border border-border/50 shadow-inner shrink-0">
            <button
              onClick={() => { setActiveTab("sources"); clearFilters(); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === "sources" 
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <ArrowDownToLine className="w-4 h-4" />
              仕入
            </button>
            <button
              onClick={() => { setActiveTab("demands"); clearFilters(); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === "demands" 
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              需要
            </button>
          </div>

          {/* Search + filter toggle */}
          <div className="flex gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="取引先・メーカー・グレード・担当者で検索..."
                value={filters.search}
                onChange={e => setFilter("search", e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {filters.search && (
                <button onClick={() => setFilter("search", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0",
                showFilters || activeFilterCount > 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              絞り込み
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Column chooser */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowColumns(v => !v)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors",
                  showColumns
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                )}
              >
                <Columns3 className="w-4 h-4" />
                列
              </button>

              {showColumns && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumns(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 bg-card border border-border rounded-xl shadow-xl p-3 w-[520px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">表示する列</p>
                    <div className="grid grid-cols-3 gap-x-2">
                      {Array.from({ length: Math.ceil(ALL_COLUMNS.length / 10) }, (_, i) =>
                        ALL_COLUMNS.slice(i * 10, (i + 1) * 10)
                      ).map((colGroup, gi) => (
                        <div key={gi} className="flex flex-col gap-0.5">
                          {colGroup.map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.has(key)}
                                onChange={() => toggleColumn(key)}
                                className="w-4 h-4 accent-primary rounded"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border mt-2 pt-2 flex gap-2">
                      <button
                        onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map(c => c.key)))}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        すべて表示
                      </button>
                      <button
                        onClick={() => setVisibleColumns(new Set())}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        すべて非表示
                      </button>
                      <button
                        onClick={() => setShowColumns(false)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
            {/* Resin type */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">樹脂種別</label>
              <select
                value={filters.resinType}
                onChange={e => setFilter("resinType", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">すべて</option>
                {resinTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Manufacturer */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">メーカー</label>
              <select
                value={filters.manufacturer}
                onChange={e => setFilter("manufacturer", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">すべて</option>
                {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Person in charge */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">担当者</label>
              <select
                value={filters.personInCharge}
                onChange={e => setFilter("personInCharge", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">すべて</option>
                {persons.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">日付（から）</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilter("dateFrom", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">日付（まで）</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilter("dateTo", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                クリア
              </button>
            )}
          </div>
        )}

        {/* Results count + page size */}
        {(hasActiveFilters || activeData.length > 0) && (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground -mt-1">
            <div className="flex items-center gap-2">
              <span>
                {pageSize === 0
                  ? (hasActiveFilters ? `全 ${sortedData.length} 件表示 / 元 ${activeData.length} 件` : `全 ${activeData.length} 件`)
                  : (hasActiveFilters
                      ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sortedData.length)} 件表示 / 絞り込み ${sortedData.length} 件 / 全 ${activeData.length} 件`
                      : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sortedData.length)} 件表示 / 全 ${activeData.length} 件`)
                }
              </span>
              {hasActiveFilters && sortedData.length === 0 && (
                <span className="text-amber-600 font-medium">条件に一致するデータがありません</span>
              )}
              {sort && (
                <button
                  onClick={() => setSort(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-3 h-3" />
                  並び順をリセット
                </button>
              )}
            </div>
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

        {/* Data View */}
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 mb-2 rounded-xl bg-primary/10 border border-primary/30 text-sm">
              <span className="font-medium text-primary">
                {selectedIds.size} 件選択中
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors text-xs font-medium"
                >
                  選択解除
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isBulkDeleting ? "削除中..." : `${selectedIds.size} 件を削除`}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <ResinTable 
              data={pagedData}
              isLoading={activeTab === "sources" ? sourcesLoading : demandsLoading}
              onEdit={handleOpenForm}
              onDelete={handleDelete}
              onToggleClosed={handleToggleClosed}
              visibleColumns={visibleColumns}
              sort={sort}
              onSort={handleSort}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              matchCounts={matchCounts}
              lastEditedId={lastEditedId}
            />
          </div>

          {/* Pagination controls */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pb-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page number pills */}
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
      </div>

      {isFormOpen && (
        <ResinForm
          initialData={editingEntry}
          entryType={(activeTab === "sources" ? "source" : "demand") as CreateResinEntryEntryType}
          resinCategory={category as ResinCategory}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={isPending}
        />
      )}

      {isImportOpen && (
        <ImportModal
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
            queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
            queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMatchCountByEntryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMatchCountQueryKey() });
          }}
        />
      )}
    </Layout>
  );
}
