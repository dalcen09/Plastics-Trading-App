import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { 
  CreateResinEntry, 
  ResinEntry, 
  ResinCategory, 
  PackagingType,
  CreateResinEntryEntryType
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { X, Loader2, Upload, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

const RESIN_OPTIONS = [
  "PP", "PE", "HDPE", "LLDPE", "LDPE",
  "PS", "GPPS", "HIPS",
  "ABS", "PC", "POM",
  "PEI", "MS", "PMMA", "PET-G", "AS", "PVDC",
  "PVC", "PET", "EVA", "EPDM",
  "PA", "PA6", "PA66", "PA9T", "PBT", "PET/PBT", "PC/ABS",
  "AAS", "ASA", "COP", "IP", "K-レジン", "MB", "OPS", "PSP", "PSU", "PO", "SBC", "TPE", "TPO",
];

const RESIN_SUBTYPE_OPTIONS: Record<string, string[]> = {
  PP:    ["ホモ", "ブロック", "ランダム", "OPP", "CPP", "GF20%"],
  LLDPE: ["C6", "C8"],
  ABS:   ["難燃", "耐熱"],
  PVC:   ["軟質", "硬質"],
};

const formSchema = z.object({
  entryType: z.nativeEnum(CreateResinEntryEntryType),
  resinCategory: z.nativeEnum(ResinCategory),
  date: z.string().min(1, "日付は必須です"),
  counterparty: z.string().min(1, "取引先は必須です"),
  personInCharge: z.string().min(1, "担当者は必須です"),
  resinType: z.string(),
  manufacturer: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  otherResinType: z.string().nullable().optional(),
  ppType: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  peType: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  psType: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  absType: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  isClosed: z.enum(["クローズ", "オープン"]),
  sampleAvailable: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  packaging: z.nativeEnum(PackagingType).nullable().optional(),
  meltFlowIndexLower: z.coerce.number().nullable().optional(),
  meltFlowIndexUpper: z.coerce.number().nullable().optional(),
  charpyLower: z.coerce.number().nullable().optional(),
  charpyUpper: z.coerce.number().nullable().optional(),
  izodLower: z.coerce.number().nullable().optional(),
  izodUpper: z.coerce.number().nullable().optional(),
  densityLower: z.coerce.number().nullable().optional(),
  densityUpper: z.coerce.number().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  priceLower: z.coerce.number().nullable().optional(),
  priceUpper: z.coerce.number().nullable().optional(),
  quantityLower: z.coerce.number().nullable().optional(),
  quantityUpper: z.coerce.number().nullable().optional(),
  locationType: z.preprocess(v => v === "" ? null : v, z.enum(["納入", "置場"]).nullable().optional()),
  storageLocation: z.string().nullable().optional(),
  quantity: z.coerce.number().nullable().optional(),
  quantityType: z.preprocess(v => v === "" ? null : v, z.enum(["月間", "スポット"]).nullable().optional()),
  prospectiveBuyer: z.string().nullable().optional(),
  desiredQuantity: z.coerce.number().nullable().optional(),
  proposedTo: z.string().nullable().optional(),
  sellingPrice: z.coerce.number().nullable().optional(),
  packagingWeight: z.coerce.number().nullable().optional(),
  plainMaker: z.string().nullable().optional(),
  usageType: z.preprocess(v => v === "" ? null : v, z.enum(["ランニング", "ワンウェイ"]).nullable().optional()),
  finalNegotiatedPrice: z.coerce.number().nullable().optional(),
  origin: z.string().nullable().optional(),
  colorTone: z.string().nullable().optional(),
  rohs: z.string().nullable().optional(),
  mesh: z.string().nullable().optional(),
  physicalOther: z.string().nullable().optional(),
  shape: z.string().nullable().optional(),
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
      resinType: initialData?.resinType || "",
      manufacturer: initialData?.manufacturer || "",
      grade: initialData?.grade || "",
      otherResinType: initialData?.otherResinType || "",
      ppType: initialData?.ppType || initialData?.peType || initialData?.psType || initialData?.absType || null,
      peType: initialData?.peType || null,
      psType: initialData?.psType || null,
      absType: initialData?.absType || null,
      isClosed: (initialData?.isClosed as "クローズ" | "オープン") ?? "オープン",
      sampleAvailable: initialData?.sampleAvailable ?? null,
      packaging: initialData?.packaging || PackagingType["紙袋"],
      meltFlowIndexLower: initialData?.meltFlowIndexLower ?? undefined,
      meltFlowIndexUpper: initialData?.meltFlowIndexUpper ?? undefined,
      charpyLower: initialData?.charpyLower ?? undefined,
      charpyUpper: initialData?.charpyUpper ?? undefined,
      izodLower: initialData?.izodLower ?? undefined,
      izodUpper: initialData?.izodUpper ?? undefined,
      densityLower: initialData?.densityLower ?? undefined,
      densityUpper: initialData?.densityUpper ?? undefined,
      price: initialData?.price ?? undefined,
      priceLower: initialData?.priceLower ?? undefined,
      priceUpper: initialData?.priceUpper ?? undefined,
      quantityLower: initialData?.quantityLower ?? undefined,
      quantityUpper: initialData?.quantityUpper ?? undefined,
      locationType: (initialData?.locationType as "納入" | "置場" | null) ?? null,
      storageLocation: initialData?.storageLocation ?? "",
      quantity: initialData?.quantity ?? undefined,
      quantityType: initialData?.quantityType ?? null,
      prospectiveBuyer: initialData?.prospectiveBuyer || "",
      desiredQuantity: initialData?.desiredQuantity ?? undefined,
      proposedTo: initialData?.proposedTo || "",
      sellingPrice: initialData?.sellingPrice ?? undefined,
      packagingWeight: initialData?.packagingWeight ?? undefined,
      plainMaker: initialData?.plainMaker || "",
      usageType: initialData?.usageType as "ランニング" | "ワンウェイ" | null ?? null,
      finalNegotiatedPrice: initialData?.finalNegotiatedPrice ?? undefined,
      origin: initialData?.origin || "",
      colorTone: initialData?.colorTone || "",
      rohs: initialData?.rohs ?? null,
      mesh: initialData?.mesh ?? null,
      physicalOther: (initialData as any)?.physicalOther ?? null,
      shape: (initialData as any)?.shape ?? null,
      remarks: initialData?.remarks || "",
      imageUrl: initialData?.imageUrl ?? null,
      imageUrls: initialData?.imageUrls?.length
        ? initialData.imageUrls
        : initialData?.imageUrl ? [initialData.imageUrl] : [],
      tdsUrl: initialData?.tdsUrl ?? null,
    }
  });

  const currentImageUrls = watch("imageUrls") ?? [];
  const currentResinType = watch("resinType") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resinTypeIsOther, setResinTypeIsOther] = useState(
    () => !!initialData?.resinType && !RESIN_OPTIONS.includes(initialData.resinType)
  );
  const subtypeOptions = RESIN_SUBTYPE_OPTIONS[currentResinType] ?? [];

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
      .then((names: string[]) => setPersonOptions(names))
      .catch(() => {});
  }, []);
  // After options are rendered in the DOM, re-apply the current value so <select> shows the right item
  useEffect(() => {
    if (personOptions.length === 0) return;
    const current = watch("personInCharge");
    if (current) formSetValue("personInCharge", current, { shouldDirty: false, shouldValidate: false });
  }, [personOptions]);


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
              {resinCategory === "virgin" ? "バージン" : resinCategory === "offgrade" ? "オフグレード" : "再生"} 樹脂
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
                <FormGroup label="樹脂種類" error={errors.resinType?.message}>
                  {resinTypeIsOther ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="例: PVDF、CPE…"
                        {...register("resinType")}
                        className="input-field flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setResinTypeIsOther(false); formSetValue("resinType", RESIN_OPTIONS[0]); }}
                        className="px-2 text-muted-foreground hover:text-foreground"
                        title="リストに戻る"
                      >✕</button>
                    </div>
                  ) : (
                    <select
                      value={currentResinType}
                      onChange={e => {
                        if (e.target.value === "__other__") {
                          setResinTypeIsOther(true);
                          formSetValue("resinType", "");
                        } else {
                          formSetValue("resinType", e.target.value, { shouldValidate: true });
                          formSetValue("ppType", null);
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">― 未選択 ―</option>
                      {RESIN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="__other__">その他（手動入力）</option>
                    </select>
                  )}
                </FormGroup>

                <FormGroup label="タイプ" error={errors.ppType?.message}>
                  {subtypeOptions.length > 0 ? (
                    <select {...register("ppType")} className="input-field">
                      <option value="">― 未選択 ―</option>
                      {subtypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="タイプを入力"
                      {...register("ppType")}
                      className="input-field"
                    />
                  )}
                </FormGroup>
                
                {resinCategory !== ResinCategory.recycled && (
                  <FormGroup label="メーカー" error={errors.manufacturer?.message}>
                    <input type="text" placeholder="ExxonMobil など" {...register("manufacturer")} className="input-field" />
                  </FormGroup>
                )}
                <FormGroup label="グレード" error={errors.grade?.message}>
                  <input
                    type="text"
                    placeholder={resinCategory === ResinCategory.recycled ? "ブロー、押出など" : "グレード名"}
                    {...register("grade")}
                    className="input-field"
                  />
                </FormGroup>
              </div>
              {resinCategory === ResinCategory.recycled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                  <FormGroup label="由来" error={errors.origin?.message}>
                    <input type="text" placeholder="由来を入力..." {...register("origin")} className="input-field" />
                  </FormGroup>
                  <FormGroup label="色目" error={errors.colorTone?.message}>
                    <input type="text" placeholder="色目を入力..." {...register("colorTone")} className="input-field" />
                  </FormGroup>
                  <FormGroup label="RoHS" error={errors.rohs?.message}>
                    <select {...register("rohs")} className="input-field">
                      <option value="">― 未選択 ―</option>
                      <option value="対応">対応</option>
                      <option value="非対応">非対応</option>
                      <option value="要確認">要確認</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="メッシュ" error={errors.mesh?.message}>
                    <input type="text" placeholder="例: 60mesh、100mesh…" {...register("mesh")} className="input-field" />
                  </FormGroup>
                  <FormGroup label="形状" error={(errors as any).shape?.message}>
                    <input type="text" placeholder="例: ペレット、パウダー、フレーク…" {...register("shape" as any)} className="input-field" />
                  </FormGroup>
                </div>
              )}
            </div>

            {/* Section: Technical Specs */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">物性</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <RangeGroup label="MI (g/10min)" errorLower={errors.meltFlowIndexLower?.message} errorUpper={errors.meltFlowIndexUpper?.message}>
                  <input type="number" step="0.01" placeholder="下限" {...register("meltFlowIndexLower")} className="input-field" />
                  <input type="number" step="0.01" placeholder="上限" {...register("meltFlowIndexUpper")} className="input-field" />
                </RangeGroup>
                <RangeGroup label="シャルピー (kJ/m²)" errorLower={errors.charpyLower?.message} errorUpper={errors.charpyUpper?.message}>
                  <input type="number" step="0.01" placeholder="下限" {...register("charpyLower")} className="input-field" />
                  <input type="number" step="0.01" placeholder="上限" {...register("charpyUpper")} className="input-field" />
                </RangeGroup>
                <RangeGroup label="アイゾット (kJ/m²)" errorLower={errors.izodLower?.message} errorUpper={errors.izodUpper?.message}>
                  <input type="number" step="0.01" placeholder="下限" {...register("izodLower")} className="input-field" />
                  <input type="number" step="0.01" placeholder="上限" {...register("izodUpper")} className="input-field" />
                </RangeGroup>
                <RangeGroup label="密度 (g/cm³)" errorLower={errors.densityLower?.message} errorUpper={errors.densityUpper?.message}>
                  <input type="number" step="0.001" placeholder="下限" {...register("densityLower")} className="input-field" />
                  <input type="number" step="0.001" placeholder="上限" {...register("densityUpper")} className="input-field" />
                </RangeGroup>
                {resinCategory === ResinCategory.recycled && (
                  <FormGroup label="その他" error={(errors as any).physicalOther?.message}>
                    <input type="text" placeholder="その他の物性を入力..." {...register("physicalOther" as any)} className="input-field" />
                  </FormGroup>
                )}
              </div>
            </div>

            {/* Section: Commercial Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">詳細</h3>
              {/* Row 1: 数量 / 数量区分 */}
              <div className="grid grid-cols-2 gap-5 mb-5">
                <RangeGroup label="数量 (kg)" errorLower={errors.quantityLower?.message} errorUpper={errors.quantityUpper?.message}>
                  <input type="number" step="0.01" placeholder="下限" {...register("quantityLower")} className="input-field" />
                  <input type="number" step="0.01" placeholder="上限" {...register("quantityUpper")} className="input-field" />
                </RangeGroup>
                <FormGroup label="月間・スポット" error={errors.quantityType?.message}>
                  <select {...register("quantityType")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="月間">月間</option>
                    <option value="スポット">スポット</option>
                  </select>
                </FormGroup>
              </div>
              {/* Row 2: 価格 / 納入・置場 / 場所 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                <RangeGroup label="価格 (円/kg)" errorLower={errors.priceLower?.message} errorUpper={errors.priceUpper?.message}>
                  <input type="number" step="0.01" placeholder="下限" {...register("priceLower")} className="input-field" />
                  <input type="number" step="0.01" placeholder="上限" {...register("priceUpper")} className="input-field" />
                </RangeGroup>
                <FormGroup label="納入・置場" error={errors.locationType?.message}>
                  <select {...register("locationType")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="納入">納入</option>
                    <option value="置場">置場</option>
                  </select>
                </FormGroup>
                <FormGroup label="場所" error={errors.storageLocation?.message}>
                  <input type="text" placeholder="例: 大阪倉庫" {...register("storageLocation")} className="input-field" />
                </FormGroup>
              </div>
              {/* Row 3: 梱包形態 / 梱包重量 / 無地・メーカー / ランニング・ワンウェイ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-5">
                <FormGroup label="梱包形態" error={errors.packaging?.message}>
                  <select {...register("packaging")} className="input-field">
                    <option value="紙袋">紙袋</option>
                    <option value="フレコン">フレコン</option>
                    <option value="カートン">カートン</option>
                    <option value="鉄箱">鉄箱</option>
                    <option value="ポリ袋">ポリ袋</option>
                  </select>
                </FormGroup>
                <FormGroup label="梱包重量" error={errors.packagingWeight?.message}>
                  <input type="number" step="0.01" placeholder="kg" {...register("packagingWeight")} className="input-field" />
                </FormGroup>
                <FormGroup label="無地・メーカー" error={errors.plainMaker?.message}>
                  <select {...register("plainMaker")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="無地">無地</option>
                    <option value="メーカー">メーカー</option>
                  </select>
                </FormGroup>
                <FormGroup label="ランニング・ワンウェイ" error={errors.usageType?.message}>
                  <select {...register("usageType")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="ランニング">ランニング</option>
                    <option value="ワンウェイ">ワンウェイ</option>
                  </select>
                </FormGroup>
              </div>
              {/* Row 3: クローズ・オープン / サンプル */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="クローズ・オープン" error={errors.isClosed?.message}>
                  <select {...register("isClosed")} className="input-field">
                    <option value="オープン">オープン</option>
                    <option value="クローズ">クローズ</option>
                  </select>
                </FormGroup>
                <FormGroup label="サンプル" error={errors.sampleAvailable?.message}>
                  <select {...register("sampleAvailable")} className="input-field">
                    <option value="">— 未選択 —</option>
                    <option value="あり">あり</option>
                    <option value="なし">なし</option>
                    <option value="要相談">要相談</option>
                    <option value="有償">有償</option>
                    <option value="手配中">手配中</option>
                    <option value="取り寄せ可能">取り寄せ可能</option>
                    <option value="確認中">確認中</option>
                  </select>
                </FormGroup>
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
                <FormGroup label="希望数量" error={errors.desiredQuantity?.message}>
                  <input type="number" step="0.01" placeholder="kg" {...register("desiredQuantity")} className="input-field" />
                </FormGroup>
                <FormGroup label="提案先" error={errors.proposedTo?.message}>
                  <input type="text" placeholder="提案先" {...register("proposedTo")} className="input-field" />
                </FormGroup>
                <FormGroup label="販売価格" error={errors.sellingPrice?.message}>
                  <input type="number" step="0.01" placeholder="円/kg" {...register("sellingPrice")} className="input-field" />
                </FormGroup>
                <FormGroup label="最終交渉価格" error={errors.finalNegotiatedPrice?.message}>
                  <input type="number" step="0.01" placeholder="円/kg" {...register("finalNegotiatedPrice")} className="input-field" />
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

function RangeGroup({ label, errorLower, errorUpper, children }: { label: string, errorLower?: string, errorUpper?: string, children: [React.ReactNode, React.ReactNode] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="flex-1">{children[0]}</div>
        <span className="text-muted-foreground text-sm select-none">〜</span>
        <div className="flex-1">{children[1]}</div>
      </div>
      {errorLower && <span className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">{errorLower}</span>}
      {errorUpper && !errorLower && <span className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">{errorUpper}</span>}
    </div>
  );
}
