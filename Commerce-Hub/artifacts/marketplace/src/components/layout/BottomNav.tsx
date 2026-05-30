import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  Users,
  Settings,
  Tag,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { useCartStore } from "@/lib/cart-store";

export function BottomNav() {
  const [location] = useLocation();
  const { data: auth } = useGetMe();
  const cartItems = useCartStore((state) => state.items);

  const user = auth?.user;
  if (!user) return null;

  const allItems = [
    { href: "/", label: "Home", icon: LayoutDashboard, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/products", label: "Products", icon: Package, roles: ["shopkeeper", "manufacturer", "admin"] },
    { href: "/cart", label: "Cart", icon: ShoppingCart, roles: ["shopkeeper"], badge: cartItems.length > 0 ? cartItems.length : undefined },
    { href: "/orders", label: "Orders", icon: ClipboardList, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/shipments", label: "Shipments", icon: Truck, roles: ["shopkeeper", "manufacturer", "transporter", "admin"] },
    { href: "/admin/users", label: "Users", icon: Users, roles: ["admin"] },
    { href: "/admin/products", label: "Pricing", icon: Tag, roles: ["admin"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["manufacturer", "transporter"] },
  ];

  const items = allItems.filter((item) => item.roles.includes(user.role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-stretch h-16 safe-area-pb">
      {items.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex-1">
            <div className={`flex flex-col items-center justify-center gap-0.5 h-full relative transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}>
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
