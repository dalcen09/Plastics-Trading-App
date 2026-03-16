import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Excel ファイル (.xlsx, .xls) または CSV ファイルのみ対応しています");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("/api/import", { method: "POST", body: formData });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "インポートに失敗しました");
      } else {
        setResult(data);
        if (data.imported > 0) onSuccess();
      }
    } catch {
      setError("サーバーへの接続に失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "区分", "カテゴリ", "日付", "取引先", "担当者",
      "樹脂", "メーカー", "グレード", "タイプ", "サンプル",
      "梱包形態", "梱包重量", "無地・メーカー", "ランニング・ワンウェイ",
      "MI 下限", "MI 上限",
      "シャルピー 下限", "シャルピー 上限",
      "アイゾット 下限", "アイゾット 上限",
      "密度 下限", "密度 上限",
      "価格 下限", "価格 上限",
      "数量 下限", "数量 上限", "数量区分",
      "納入・置場", "場所",
      "希望数量", "提案先", "販売価格", "最終交渉価格",
      "クローズ", "備考"
    ];
    const example = [
      "仕入", "バージン", "2026-03-12", "ABC化学株式会社", "田中太郎",
      "PP", "ExxonMobil", "PP1014H2", "Homopolymer", "あり",
      "紙袋", "25", "メーカー", "ランニング",
      "3.0", "4.0",
      "", "", "", "", "0.900", "0.910",
      "120", "150",
      "10000", "20000", "月間",
      "納入", "大阪",
      "", "", "", "",
      "オープン", ""
    ];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resin_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-border/50 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">データインポート</h2>
            <p className="text-sm text-muted-foreground mt-0.5">スプレッドシートからデータを一括インポートします</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="text-sm">
              <p className="font-semibold text-foreground">テンプレートをダウンロード</p>
              <p className="text-muted-foreground text-xs mt-0.5">正しい列名が含まれたCSVテンプレートです</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Download className="w-4 h-4" /> テンプレート
            </button>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : file
                  ? "border-primary/40 bg-primary/3"
                  : "border-border hover:border-primary/40 hover:bg-secondary/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <FileSpreadsheet className="w-12 h-12 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <span className="text-xs text-primary font-medium">クリックして別のファイルを選択</span>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="font-semibold text-foreground">ファイルをドラッグ＆ドロップ</p>
                    <p className="text-sm text-muted-foreground mt-1">または クリックしてファイルを選択</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">.xlsx, .xls, .csv 対応</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">{result.imported}</p>
                  <p className="text-sm text-emerald-600 font-medium">件インポート成功</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-sm text-amber-600 font-medium">件スキップ</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto p-4 rounded-xl bg-secondary/40 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">エラー詳細</p>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-destructive/80">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="w-full py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                別のファイルをインポート
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-border/50 bg-secondary/20 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-foreground hover:bg-secondary transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-2"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? "インポート中..." : "インポート開始"}
            </button>
          </div>
        )}
        {result && (
          <div className="px-6 py-4 border-t border-border/50 bg-secondary/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
