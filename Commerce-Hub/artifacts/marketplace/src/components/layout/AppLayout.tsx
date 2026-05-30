import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AuthGuard } from "../auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [isMobile]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex">

        {/* Desktop-only sidebar (icon rail or full) */}
        {!isMobile && (
          <Sidebar
            expanded={expanded}
            isMobile={false}
            onClose={() => setExpanded(false)}
          />
        )}

        <main
          className={`flex-1 flex flex-col min-h-screen overflow-y-auto transition-[margin] duration-300 ease-in-out ${
            isMobile ? "ml-0 pb-16" : expanded ? "ml-64" : "ml-16"
          }`}
        >
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex items-center gap-2 px-3 sm:px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
            {isMobile ? (
              /* Mobile: just show the brand mark in the top bar */
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm">
                  TR
                </div>
                <span className="font-semibold tracking-tight">TradeRoute</span>
              </div>
            ) : (
              /* Desktop: hamburger toggles the icon rail ↔ full sidebar */
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="flex-1">{children}</div>
        </main>

        {/* Mobile-only bottom nav */}
        {isMobile && <BottomNav />}
      </div>
    </AuthGuard>
  );
}
