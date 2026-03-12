import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CreateResinEntry, 
  ResinEntry, 
  ResinCategory, 
  ResinType, 
  PPType, 
  PackagingType,
  CreateResinEntryEntryType
} from "@workspace/api-client-react";
import { X, Loader2 } from "lucide-react";
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
  ppType: z.nativeEnum(PPType).nullable().optional(),
  sampleAvailable: z.boolean().nullable().optional(),
  packaging: z.nativeEnum(PackagingType).nullable().optional(),
  meltFlowIndex: z.coerce.number().nullable().optional(),
  charpy: z.coerce.number().nullable().optional(),
  izod: z.coerce.number().nullable().optional(),
  density: z.coerce.number().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  quantity: z.coerce.number().nullable().optional(),
  quantityType: z.preprocess(v => v === "" ? null : v, z.enum(["月間", "スポット"]).nullable().optional()),
  remarks: z.string().nullable().optional(),
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
  
  const { register, handleSubmit, watch, control, reset, formState: { errors } } = useForm<FormValues>({
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
      ppType: initialData?.ppType || PPType.Homopolymer,
      sampleAvailable: initialData?.sampleAvailable || false,
      packaging: initialData?.packaging || PackagingType.Bags,
      meltFlowIndex: initialData?.meltFlowIndex ?? undefined,
      charpy: initialData?.charpy ?? undefined,
      izod: initialData?.izod ?? undefined,
      density: initialData?.density ?? undefined,
      price: initialData?.price ?? undefined,
      quantity: initialData?.quantity ?? undefined,
      quantityType: initialData?.quantityType ?? null,
      remarks: initialData?.remarks || "",
    }
  });

  const selectedResinType = watch("resinType");

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
              {initialData ? "編集" : "追加"} — {entryType === "source" ? "仕入れ先" : "需要"}
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
                  <input type="text" placeholder="山田 太郎" {...register("personInCharge")} className="input-field" />
                </FormGroup>
              </div>
            </div>

            {/* Section: Product Specs */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">製品仕様</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="樹脂種別" error={errors.resinType?.message}>
                  <select {...register("resinType")} className="input-field">
                    {Object.values(ResinType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormGroup>
                
                {selectedResinType === ResinType.PP && (
                  <FormGroup label="PPタイプ" error={errors.ppType?.message}>
                    <select {...register("ppType")} className="input-field">
                      {Object.values(PPType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                )}
                
                <FormGroup label="メーカー" error={errors.manufacturer?.message}>
                  <input type="text" placeholder="ExxonMobil など" {...register("manufacturer")} className="input-field" />
                </FormGroup>
                <FormGroup label="グレード" error={errors.grade?.message}>
                  <input type="text" placeholder="グレードID" {...register("grade")} className="input-field" />
                </FormGroup>
              </div>
            </div>

            {/* Section: Technical Specs */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">技術仕様</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <FormGroup label="メルトフローインデックス" error={errors.meltFlowIndex?.message}>
                  <input type="number" step="0.01" placeholder="g/10min" {...register("meltFlowIndex")} className="input-field" />
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 pt-4 border-t border-border/50">商業情報</h3>
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
                <FormGroup label="価格 (USD/MT)" error={errors.price?.message}>
                  <input type="number" step="0.01" placeholder="USD" {...register("price")} className="input-field" />
                </FormGroup>
                <FormGroup label="梱包形態" error={errors.packaging?.message}>
                  <select {...register("packaging")} className="input-field">
                    {Object.values(PackagingType).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </FormGroup>
                
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

            <FormGroup label="備考" error={errors.remarks?.message}>
              <textarea 
                rows={3} 
                placeholder="追加メモ..." 
                {...register("remarks")} 
                className="input-field resize-none"
              />
            </FormGroup>

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
