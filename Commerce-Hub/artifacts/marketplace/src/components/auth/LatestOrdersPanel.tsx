import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "secondary",
  rejected: "destructive",
  in_transit: "default",
  delivered: "default",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface LatestOrdersPanelProps {
  userName: string;
  companyName: string;
}

export function LatestOrdersPanel({ userName, companyName }: LatestOrdersPanelProps) {
  const { data: orders, isLoading } = useListOrders();

  const latest = (orders ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg">Welcome back, {userName.split(" ")[0]}</CardTitle>
            <CardDescription>
              Signed in as <span className="font-medium text-foreground">{companyName}</span>. Here are your latest orders.
            </CardDescription>
          </div>
          <Link href="/">
            <Button size="sm" className="gap-2">
              Continue to dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : latest.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Package className="h-6 w-6 mx-auto mb-2 opacity-60" />
            You don't have any orders yet.
          </div>
        ) : (
          <ul className="divide-y">
            {latest.map((order) => (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`}>
                  <div className="flex items-center justify-between gap-3 py-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{order.orderNumber}</span>
                        <Badge variant={STATUS_VARIANT[order.status] ?? "outline"} className="capitalize text-xs">
                          {STATUS_LABEL[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        ₹{Number(order.totalAmount).toLocaleString()}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground inline-block mt-0.5" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
