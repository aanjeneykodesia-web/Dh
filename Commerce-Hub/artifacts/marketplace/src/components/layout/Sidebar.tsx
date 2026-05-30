import { Link, useLocation } from "wouter";
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Truck,
  Users,
  LogOut,
  ChevronRight,
  Settings,
  Tag,
} from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  expanded: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function Sidebar({ expanded, isMobile, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { data: auth } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const cartItems = useCartStore((state) => state.items);

  const user = auth?.user;
  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/signup");
      },
    });
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/products", label: "Products", icon: Package, roles: ["shopkeeper", "manufacturer", "admin"] },
    { href: "/cart", label: "Cart", icon: ShoppingCart, roles: ["shopkeeper"], badge: cartItems.length > 0 ? cartItems.length : undefined },
    { href: "/orders", label: "Orders", icon: ClipboardList, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/shipments", label: "Shipments", icon: Truck, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/admin/users", label: "Users", icon: Users, roles: ["admin"] },
    { href: "/admin/products", label: "Pricing", icon: Tag, roles: ["admin"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["manufacturer", "transporter"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  // On mobile the sidebar is a full overlay; on desktop it's always in the DOM
  // (either as a 16-wide icon rail or a 64-wide full sidebar).
  const isVisible = isMobile ? expanded : true;
  const isCollapsed = !isMobile && !expanded;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          border-r bg-sidebar flex flex-col h-screen fixed left-0 top-0 z-50
          transition-[transform,width] duration-300 ease-in-out
          ${isCollapsed ? "w-16" : "w-64"}
          ${isMobile && !expanded ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        {/* Header */}
        <div className={`border-b border-sidebar-border flex items-center transition-all duration-300 ${isCollapsed ? "p-3 justify-center h-16" : "p-4 h-auto"}`}>
          {isCollapsed ? (
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              TR
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  TR
                </div>
                <span className="font-bold text-lg tracking-tight text-sidebar-foreground truncate">TradeRoute</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 bg-sidebar-accent rounded-lg">
                <span className="text-sm font-semibold truncate text-sidebar-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user.companyName}</span>
                <Badge variant="outline" className="mt-1.5 w-fit capitalize bg-background text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 flex flex-col gap-1 ${isCollapsed ? "px-2 items-center" : "px-3"}`}>
          {visibleItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <div className={`relative h-10 w-10 flex items-center justify-center rounded-md cursor-pointer transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}>
                        <Icon className="h-5 w-5" />
                        {item.badge !== undefined && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                    {item.badge !== undefined && (
                      <span className="ml-1.5 text-xs opacity-70">({item.badge})</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={isMobile ? onClose : undefined}>
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge variant={isActive ? "secondary" : "default"} className="h-5 min-w-5 flex items-center justify-center px-1">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-sidebar-border ${isCollapsed ? "p-2 flex justify-center" : "p-3"}`}>
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="h-10 w-10 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
