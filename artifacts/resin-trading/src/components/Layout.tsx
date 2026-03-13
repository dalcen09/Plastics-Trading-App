import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Box, 
  Recycle, 
  TrendingUp,
  Search,
  Bell,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import marukiLogo from "@/assets/maruki-logo.png";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: ReactNode;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

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
    { href: "/virgin", label: "バージン", icon: Box, matchPrefix: true },
    { href: "/offgrade", label: "オフグレード", icon: TrendingUp, matchPrefix: true },
    { href: "/recycled", label: "リサイクル", icon: Recycle, matchPrefix: true },
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
                <item.icon className={cn(
                  "w-5 h-5 transition-colors", 
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.label}
              </Link>
            );
          })}
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
