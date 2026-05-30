import { useState } from "react";
import { Link } from "wouter";
import { useListOrders, useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ArrowRight, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

export function OrdersList() {
  const { data: auth } = useGetMe();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: orders, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pending</Badge>;
      case 'accepted': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Accepted</Badge>;
      case 'in_transit': return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">In Transit</Badge>;
      case 'delivered': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Delivered</Badge>;
      case 'rejected': 
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your order history.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search orders..." 
            className="pl-9 bg-background"
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="rejected">Rejected/Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders && orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/orders/${order.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="flex gap-4 items-start">
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center shrink-0">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                        <div className="text-sm font-medium">
                          {auth?.user?.role === "shopkeeper" ? (
                            <>Supplier: <span className="text-foreground">{order.manufacturerName}</span></>
                          ) : (
                            <>Customer: <span className="text-foreground">{order.shopkeeperCompany} ({order.shopkeeperName})</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 md:gap-2">
                      <div className="text-xl font-bold tracking-tight">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </div>
                      <Button variant="ghost" size="sm" className="md:hidden group-hover:bg-primary/5">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No orders found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              {statusFilter !== "all" 
                ? `No orders matching status "${statusFilter}".` 
                : "You don't have any orders yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
