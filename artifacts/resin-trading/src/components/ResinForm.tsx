import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CreateResinEntry, 
  ResinEntry, 
  ResinCategory, 
  ResinType, 
  PPType, 
  PEType,
  PSType,
  ABSType,
  PackagingType,
  CreateResinEntryEntryType
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { X, Loader2, Upload, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  entryType: z.nativeEnum(CreateResinEntryEntryType),
  resinCategory: z.nativeEnum(ResinCategory),
  date: z.string().min(1, "日付は必須です"),
  counterparty: z.string().min(1, "取引先は必須です"),
  personInCharge: z.string().min(1, "担当者は必須です"),
  resinType: z.nativeEnum(ResinType),
  manufacturer: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  otherResinType: z.string().nullable().optional(),
  ppType: z.preprocess(v => v === "" ? null : v, z.nativeEnum(PPType).nullable().optional()),
  peType: z.preprocess(v => v === "" ? null : v, z.nativeEnum(PEType).nullable().optional()),
  psType: z.preprocess(v => v === "" ? null : v, z.nativeEnum(PSType).nullable().optional()),
  absType: z.preprocess(v => v === "" ? null : v, z.nativeEnum(ABSType).nullable().optional()),
  isClosed: z.boolean(),
  sampleAvailable: z.boolean().nullable().optional(),
  packaging: z.nativeEnum(PackagingType).nullable().optional(),
  meltFlowIndexLower: z.coerce.number().nullable().optional(),
  meltFlowIndexUpper: z.coerce.number().nullable().optional(),
  charpy: z.coerce.number().nullable().optional(),
  izod: z.coerce.number().nullable().optional(),
  density: z.coerce.number().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  storageLocation: z.string().nullable().optional(),
  quantity: z.coerce.number().nullable().optional(),
  quantityType: z.preprocess(v => v === "" ? null : v, z.enum(["月間", "スポット"]).nullable().optional()),
  prospectiveBuyer: z.string().nullable().optional(),
  desiredQuantity: z.coerce.number().nullable().optional(),
  proposedTo: z.string().nullable().optional(),
  sellingPrice: z.coerce.number().nullable().optional(),
  remarks: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  tdsUrl: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ResinFormProps {
  initialData?: ResinEntry;
  entryType: CreateResinEntryEntryType;
  resinCategory: ResinCategory;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ResinForm({ 
  initialData, 
  entryType, 
  resinCategory, 
  onSubmit, 
  onCancel,
  isPending = false
}: ResinFormProps) {
  
  const { register, handleSubmit, watch, control, reset, setValue: formSetValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType,
      resinCategory,
      date: initialData?.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      counterparty: initialData?.counterparty || "",
      personInCharge: initialData?.personInCharge || "",
      resinType: initialData?.resinType || ResinType.PP,
      manufacturer: initialData?.manufacturer || "",
      grade: initialData?.grade || "",
      otherResinType: initialData?.otherResinType || "",
      ppType: initialData?.ppType || null,
      peType: initialData?.peType || null,
      psType: initialData?.psType || null,
      absType: initialData?.absType || null,
      isClosed: initialData?.isClosed ?? false,
      sampleAvailable: initialData?.sampleAvailable || false,
      packaging: initialData?.packaging || PackagingType["25㎏紙袋"],
      meltFlowIndexLower: initialData?.meltFlowIndexLower ?? undefined,
      meltFlowIndexUpper: initialData?.meltFlowIndexUpper ?? undefined,
      charpy: initialData?.charpy ?? undefined,
      izod: initialData?.izod ?? undefined,
      density: initialData?.density ?? undefined,
      price: initialData?.price ?? undefined,
      storageLocation: initialData?.storageLocation ?? "",
      quantity: initialData?.quantity ?? undefined,
      quantityType: initialData?.quantityType ?? null,
      prospectiveBuyer: initialData?.prospectiveBuyer || "",
      desiredQuantity: initialData?.desiredQuantity ?? undefined,
      proposedTo: initialData?.proposedTo || "",
      sellingPrice: initialData?.sellingPrice ?? undefined,
      remarks: initialData?.remarks || "",
      imageUrl: initialData?.imageUrl ?? null,
      imageUrls: initialData?.imageUrls?.length
        ? initialData.imageUrls
        : initialData?.imageUrl ? [initialData.imageUrl] : [],
      tdsUrl: initialData?.tdsUrl ?? null,
    }
  });

  const selectedResinType = watch("resinType");
  const currentImageUrls = watch("imageUrls") ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response: { objectPath: string }) => {
      const url = `/api/storage${response.objectPath}`;
      formSetValue("imageUrls", [...(watch("imageUrls") ?? []), url]);
    },
  });

  const currentTdsUrl = watch("tdsUrl");
  const tdsInputRef = useRef<HTMLInputElement>(null);
  const [isTdsDragging, setIsTdsDragging] = useState(false);
  const { uploadFile: uploadTds, isUploading: isTdsUploading } = useUpload({
    onSuccess: (response: { objectPath: string }) => {
      formSetValue("tdsUrl", `/api/storage${response.objectPath}`);
    },
  });

  const [personOptions, setPersonOptions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/persons-in-charge")
      .then(r => r.json())
      .then(setPersonOptions)
      .catch(() => {});
  }, []);


  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        date: initialData.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      } as FormValues);
    }
  }, [initialData, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {initialData ? "編集" : "追加"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {resinCategory === "virgin" ? "バージン" : resinCategory === "offgrade" ? "オフグレード" : "リサイクル"} 樹脂
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="resin-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section: General Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">基本情報</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <FormGroup label="日付" error={errors.date?.message}>
                  <input type="date" {...register("date")} className="input-field" />
                </FormGroup>
                <FormGroup label="取引先" error={errors.counterparty?.message}>
                  <input type="text" placeholder="会社名" {...register("counterparty")} className="input-field" />
                </FormGroup>
                <FormGroup label="担当者" error={errors.personInCharge?.message}>
                  <select {...register("personInCharge")} className="input-field">
                    <option value="">選択してください</option>
                    {personOptions.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </FormGroup>
              </div>
            </div>

            {/* Section: Product Specs */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">製品</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="樹脂種別" error={errors.resinType?.message}>
                  <select {...register("resinType")} className="input-field">
                    {Object.values(ResinType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormGroup>

                {selectedResinType === ResinType.Other && (
                  <FormGroup label="樹脂タイプ（その他）" error={errors.otherResinType?.message}>
                    <input
                      type="text"
                      placeholder="樹脂タイプを入力..."
                      {...register("otherResinType")}
                      className="input-field"
                    />
                  </FormGroup>
                )}
                
                {selectedResinType === ResinType.PP && (
                  <FormGroup label="PPタイプ" error={errors.ppType?.message}>
                    <select {...register("ppType")} className="input-field">
                      <option value="">―</option>
                      {Object.values(PPType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                )}

                {selectedResinType === ResinType.PE && (
                  <FormGroup label="PEタイプ" error={errors.peType?.message}>
                    <select {...register("peType")} className="input-field">
                      <option value="">―</option>
                      {Object.values(PEType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                )}

                {selectedResinType === ResinType.PS && (
                  <FormGroup label="PSタイプ" error={errors.psType?.message}>
                    <select {...register("psType")} className="input-field">
                      <option value="">―</option>
                      {Object.values(PSType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                )}

                {selectedResinType === ResinType.ABS && (
                  <FormGroup label="ABSタイプ" error={errors.absType?.message}>
                    <select {...register("absType")} className="input-field">
                      <option value="">―</option>
                      {Object.values(ABSType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                )}
                
                <FormGroup label="メーカー" error={errors.manufacturer?.message}>
                  <input type="text" placeholder="ExxonMobil など" {...register("manufacturer")} className="input-field" />
                </FormGroup>
                <FormGroup label="グレード" error={errors.grade?.message}>
                  <input type="text" placeholder="グレード名" {...register("grade")} className="input-field" />
                </FormGroup>
              </div>
            </div>

            {/* Section: Technical Specs */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">物性</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="MI 下限" error={errors.meltFlowIndexLower?.message}>
                  <input type="number" step="0.01" placeholder="g/10min" {...register("meltFlowIndexLower")} className="input-field" />
                </FormGroup>
                <FormGroup label="MI 上限" error={errors.meltFlowIndexUpper?.message}>
                  <input type="number" step="0.01" placeholder="g/10min" {...register("meltFlowIndexUpper")} className="input-field" />
                </FormGroup>
                <FormGroup label="シャルピー" error={errors.charpy?.message}>
                  <input type="number" step="0.01" placeholder="kJ/m²" {...register("charpy")} className="input-field" />
                </FormGroup>
                <FormGroup label="アイゾット" error={errors.izod?.message}>
                  <input type="number" step="0.01" placeholder="kJ/m²" {...register("izod")} className="input-field" />
                </FormGroup>
                <FormGroup label="密度" error={errors.density?.message}>
                  <input type="number" step="0.001" placeholder="g/cm³" {...register("density")} className="input-field" />
                </FormGroup>
              </div>
            </div>

            {/* Section: Commercial Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">取引情報</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="数量 (kg)" error={errors.quantity?.message}>
                  <input type="number" step="0.01" placeholder="kg" {...register("quantity")} className="input-field" />
                </FormGroup>
                <FormGroup label="数量区分" error={errors.quantityType?.message}>
                  <select {...register("quantityType")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="月間">月間</option>
                    <option value="スポット">スポット</option>
                  </select>
                </FormGroup>
                <FormGroup label="価格 (円/kg)" error={errors.price?.message}>
                  <input type="number" step="0.01" placeholder="円" {...register("price")} className="input-field" />
                </FormGroup>
                <FormGroup label="置場" error={errors.storageLocation?.message}>
                  <input type="text" placeholder="例: 大阪倉庫" {...register("storageLocation")} className="input-field" />
                </FormGroup>
                <FormGroup label="梱包形態" error={errors.packaging?.message}>
                  <select {...register("packaging")} className="input-field">
                    {Object.values(PackagingType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormGroup>
                
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Controller
                      name="isClosed"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20 transition-colors cursor-pointer"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">クローズ</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Controller
                      name="sampleAvailable"
                      control={control}
                      render={({ field }) => (
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20 transition-colors cursor-pointer"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">サンプルあり</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section: Deal Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">取引情報</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="ワーク希望者" error={errors.prospectiveBuyer?.message}>
                  <select {...register("prospectiveBuyer")} className="input-field">
                    <option value="">選択してください</option>
                    {personOptions.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="希望数量 (kg)" error={errors.desiredQuantity?.message}>
                  <input type="number" step="0.01" placeholder="0" {...register("desiredQuantity")} className="input-field" />
                </FormGroup>
                <FormGroup label="提案先" error={errors.proposedTo?.message}>
                  <input type="text" placeholder="提案先" {...register("proposedTo")} className="input-field" />
                </FormGroup>
                <FormGroup label="販売価格 (円/kg)" error={errors.sellingPrice?.message}>
                  <input type="number" step="0.01" placeholder="0" {...register("sellingPrice")} className="input-field" />
                </FormGroup>
              </div>
            </div>

            <FormGroup label="備考" error={errors.remarks?.message}>
              <textarea 
                rows={3} 
                placeholder="追加メモ..." 
                {...register("remarks")} 
                className="input-field resize-none"
              />
            </FormGroup>

            {/* Image Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">写真</label>
              <input type="hidden" {...register("imageUrl")} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const file of files) await uploadFile(file);
                  e.target.value = "";
                }}
              />
              <div
                className={`rounded-xl border-2 border-dashed p-3 transition-all ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 bg-transparent"}`}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                  for (const file of files) await uploadFile(file);
                }}
              >
                <div className="flex flex-wrap gap-3">
                  {currentImageUrls.map((url, i) => (
                    <div key={url} className="relative group w-28 h-28 rounded-lg overflow-hidden border border-border/50 bg-secondary/20 flex-shrink-0">
                      <img src={url} alt={`写真 ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => formSetValue("imageUrls", currentImageUrls.filter((_, idx) => idx !== i))}
                          className="p-2 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-28 h-28 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none flex-shrink-0"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">写真を追加</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isDragging ? "ここにドロップ" : "ここにドラッグ＆ドロップ、または「写真を追加」をクリック"}
                </p>
              </div>
            </div>

            {/* TDS Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">物性表</label>
              <input type="hidden" {...register("tdsUrl")} />
              <input
                ref={tdsInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await uploadTds(file);
                  e.target.value = "";
                }}
              />
              {currentTdsUrl ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-secondary/20">
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">物性表あり</p>
                    <a href={currentTdsUrl} download className="text-xs text-primary hover:underline">ダウンロード</a>
                  </div>
                  <button
                    type="button"
                    onClick={() => formSetValue("tdsUrl", null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={`rounded-xl border-2 border-dashed p-4 transition-all ${isTdsDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 bg-transparent"}`}
                  onDragEnter={(e) => { e.preventDefault(); setIsTdsDragging(true); }}
                  onDragOver={(e) => { e.preventDefault(); setIsTdsDragging(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsTdsDragging(false); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsTdsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) await uploadTds(file);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => tdsInputRef.current?.click()}
                    disabled={isTdsUploading}
                    className="flex flex-col items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isTdsUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-6 h-6" />
                        <span className="text-sm">{isTdsDragging ? "ここにドロップ" : "PDF または画像をドラッグ＆ドロップ"}</span>
                        <span className="text-xs text-muted-foreground/70">またはクリックして選択</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-secondary/20 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl font-medium text-foreground hover:bg-secondary transition-colors"
          >
            キャンセル
          </button>
          <button 
            type="submit" 
            form="resin-form"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "保存中..." : "保存"}
          </button>
        </div>

      </div>

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
        }
        .input-field::placeholder {
          color: hsl(var(--muted-foreground) / 0.7);
        }
      `}</style>
    </div>
  );
}

function FormGroup({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <span className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">{error}</span>}
    </div>
  );
}
