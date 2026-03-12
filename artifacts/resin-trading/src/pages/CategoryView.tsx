import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ResinTable } from "@/components/ResinTable";
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
  ResinCategory,
  CreateResinEntryEntryType,
  ResinEntry
} from "@workspace/api-client-react";
import { Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CategoryViewProps {
  category: "virgin" | "offgrade" | "recycled";
}

export function CategoryView({ category }: CategoryViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<"sources" | "demands">("sources");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResinEntry | undefined>();

  // Fetching
  const { data: sources, isLoading: sourcesLoading } = useListSources({ resinCategory: category as ResinCategory });
  const { data: demands, isLoading: demandsLoading } = useListDemands({ resinCategory: category as ResinCategory });

  // Mutations - Sources
  const createSource = useCreateSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        closeForm();
        toast({ title: "Success", description: "Source created successfully" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: "Failed to create source" })
    }
  });

  const updateSource = useUpdateSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        closeForm();
        toast({ title: "Success", description: "Source updated successfully" });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update source" })
    }
  });

  const deleteSource = useDeleteSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        toast({ title: "Success", description: "Source deleted" });
      }
    }
  });

  // Mutations - Demands
  const createDemand = useCreateDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        closeForm();
        toast({ title: "Success", description: "Demand created successfully" });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to create demand" })
    }
  });

  const updateDemand = useUpdateDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        closeForm();
        toast({ title: "Success", description: "Demand updated successfully" });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update demand" })
    }
  });

  const deleteDemand = useDeleteDemand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({ resinCategory: category as ResinCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        toast({ title: "Success", description: "Demand deleted" });
      }
    }
  });

  // Handlers
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

  const isPending = createSource.isPending || updateSource.isPending || createDemand.isPending || updateDemand.isPending;

  // Render Theme colors based on category
  const categoryTheme = {
    virgin: "text-green-600 bg-green-500/10 border-green-500/20",
    offgrade: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    recycled: "text-teal-600 bg-teal-500/10 border-teal-500/20"
  }[category];

  return (
    <Layout>
      <div className="flex flex-col h-full space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground capitalize">
                {category} Resin
              </h1>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border", categoryTheme)}>
                Live Data
              </span>
            </div>
            <p className="text-muted-foreground mt-1">Manage suppliers and buyers for this material type.</p>
          </div>
          
          <button 
            onClick={() => handleOpenForm()}
            className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add {activeTab === "sources" ? "Source" : "Demand"}
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 bg-secondary/50 rounded-xl w-full max-w-sm border border-border/50 shadow-inner">
          <button
            onClick={() => setActiveTab("sources")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === "sources" 
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Sources (Supply)
          </button>
          <button
            onClick={() => setActiveTab("demands")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === "demands" 
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Demands (Buy)
          </button>
        </div>

        {/* Data View */}
        <div className="flex-1 min-h-0 pb-10">
          <div className="h-full">
            {activeTab === "sources" ? (
              <ResinTable 
                data={sources || []} 
                isLoading={sourcesLoading} 
                onEdit={handleOpenForm}
                onDelete={handleDelete}
              />
            ) : (
              <ResinTable 
                data={demands || []} 
                isLoading={demandsLoading} 
                onEdit={handleOpenForm}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <ResinForm
          initialData={editingEntry}
          entryType={activeTab as CreateResinEntryEntryType}
          resinCategory={category as ResinCategory}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={isPending}
        />
      )}
    </Layout>
  );
}
