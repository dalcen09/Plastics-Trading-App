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
        <p className="font-medium animate-pulse">Loading records...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-border shadow-sm border-dashed">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Box className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p className="font-medium text-foreground">No entries found</p>
        <p className="text-sm mt-1">Get started by adding a new record.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col relative">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-4 table-sticky-col-left bg-secondary/90 backdrop-blur-sm z-20">Counterparty</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">PIC</th>
              <th className="px-4 py-4">Product</th>
              <th className="px-4 py-4">Specs</th>
              <th className="px-4 py-4 text-right">Price (MT)</th>
              <th className="px-4 py-4 text-right">Qty (MT)</th>
              <th className="px-4 py-4 table-sticky-col-right bg-secondary/90 backdrop-blur-sm text-center z-20">Actions</th>
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
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {row.resinType} 
                      {row.ppType && row.ppType !== "N/A" && <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{row.ppType}</span>}
                    </span>
                    <span className="text-muted-foreground text-xs mt-0.5">
                      {row.manufacturer || "Unknown Mfg"} • {row.grade || "No Grade"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex gap-3 text-muted-foreground">
                      <span title="Melt Flow Index">MFI: {formatNumber(row.meltFlowIndex)}</span>
                      <span title="Density">Den: {formatNumber(row.density)}</span>
                    </div>
                    <div className="flex gap-2 items-center mt-0.5">
                      {row.packaging && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/80 text-[10px] uppercase font-medium">
                          <Package className="w-3 h-3" /> {row.packaging.replace('_', ' ')}
                        </span>
                      )}
                      {row.sampleAvailable && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold">
                          Sample
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
                    {formatNumber(row.quantity)}
                  </span>
                </td>
                <td className="px-4 py-3 table-sticky-col-right bg-card group-hover:bg-secondary/40 text-center z-10 transition-colors">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if(window.confirm("Are you sure you want to delete this entry?")) {
                          onDelete(row.id);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete"
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
