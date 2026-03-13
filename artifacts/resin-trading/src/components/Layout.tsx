import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Search,
  Bell,
  Trash2,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import marukiLogo from "@/assets/maruki-logo.png";
import { useQuery } from "@tanstack/react-query";
import { useGetMatchCount } from "@workspace/api-client-react";

interface LayoutProps {
  children: ReactNode;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const { data: countData } = useGetMatchCount({ query: { refetchInterval: 60000 } });
  const matchCount = countData?.count ?? 0;

  const { data: virginCount }   = useGetMatchCount({ resinCategory: "virgin" },   { query: { refetchInterval: 60000 } });
  const { data: offgradeCount } = useGetMatchCount({ resinCategory: "offgrade" }, { query: { refetchInterval: 60000 } });
  const { data: recycledCount } = useGetMatchCount({ resinCategory: "recycled" }, { query: { refetchInterval: 60000 } });

  const matchCategoryParam = location.startsWith("/matches")
    ? new URLSearchParams(window.location.search).get("resinCategory")
    : null;

  const categoryMatchItems = [
    { cat: "virgin",   label: "バージン",     count: virginCount?.count   ?? 0, color: "bg-green-500" },
    { cat: "offgrade", label: "オフグレード",  count: offgradeCount?.count ?? 0, color: "bg-amber-500" },
    { cat: "recycled", label: "リサイクル",    count: recycledCount?.count ?? 0, color: "bg-teal-500"  },
  ];

  const { data: trashItems = [] } = useQuery<unknown[]>({
    queryKey: ["trash"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/trash`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });
  const trashCount = trashItems.length;

  const navItems = [
    { href: "/virgin",   label: "バージン",    badge: "VG", icon: null,       matchPrefix: true },
    { href: "/offgrade", label: "オフグレード", badge: "OG", icon: null,       matchPrefix: true },
    { href: "/recycled", label: "リサイクル",   badge: "再生", icon: null,      matchPrefix: true },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col z-20 shadow-sm hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <img src={marukiLogo} alt="MARUKI" className="h-9 w-auto" />
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            メインメニュー
          </div>
          {navItems.map((item) => {
            const isActive = item.matchPrefix 
              ? location.startsWith(item.href)
              : location === item.href;
              
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground active:scale-[0.98]"
                )}
              >
                {item.badge ? (
                  <span className={cn(
                    "min-w-[20px] h-5 px-0.5 flex items-center justify-center rounded text-[10px] font-black tracking-tight flex-shrink-0 transition-colors",
                    isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground group-hover:bg-secondary/80 group-hover:text-foreground"
                  )}>
                    {item.badge}
                  </span>
                ) : item.icon ? (
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Matches section */}
        <div className="px-4 pb-2 space-y-0.5">
          <Link
            href="/matches"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
              location.startsWith("/matches") && !matchCategoryParam
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-foreground/70 hover:bg-secondary hover:text-foreground active:scale-[0.98]"
            )}
          >
            <Handshake className={cn("w-5 h-5 flex-shrink-0 transition-colors",
              location.startsWith("/matches") && !matchCategoryParam ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className="flex-1">マッチング分析</span>
            {matchCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                {matchCount}
              </span>
            )}
          </Link>

          {/* Per-category sub-links */}
          <div className="ml-4 space-y-0.5">
            {categoryMatchItems.map(({ cat, label, count, color }) => {
              const isActive = location.startsWith("/matches") && matchCategoryParam === cat;
              return (
                <Link
                  key={cat}
                  href={`/matches?resinCategory=${cat}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-foreground/60 hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 flex-shrink-0 rounded-full", color)} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-semibold",
                      isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trash link pinned to bottom */}
        <div className="px-4 pb-5 pt-2 border-t border-border/50">
          <Link
            href="/trash"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
              location === "/trash" || location.startsWith("/trash")
                ? "bg-destructive/10 text-destructive"
                : "text-foreground/60 hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <Trash2 className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">ゴミ箱</span>
            {trashCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                {trashCount}
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-4 sm:px-8 z-10">
          <div className="flex items-center gap-4">
            <img src={marukiLogo} alt="MARUKI" className="h-8 w-auto md:hidden" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="検索..." 
                className="pl-9 pr-4 py-2 bg-secondary/50 border-none rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-card"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-background cursor-pointer">
              AD
            </div>
          </div>
        </header>

        {/* Page Content - fixed, no outer scroll */}
        <main className="flex-1 overflow-hidden p-3 sm:p-4 relative">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
