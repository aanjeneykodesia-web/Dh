import { useState } from "react";
import { Link } from "wouter";
import { useListShipments, useGetMe } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ArrowRight, Truck, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export function ShipmentsList() {
  const { data: auth } = useGetMe();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: shipments, isLoading } = useListShipments({
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned': return <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20">Assigned</Badge>;
      case 'picked_up': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Picked Up</Badge>;
      case 'in_transit': return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">In Transit</Badge>;
      case 'delivered': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Delivered</Badge>;
      default: return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground mt-1">
            {auth?.user?.role === "transporter" 
              ? "Manage and update your active deliveries." 
              : "Track the logistics of your orders."}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tracking number or order..." 
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
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {shipments && shipments.length > 0 ? (
        <div className="grid gap-4">
          {shipments.map((shipment, i) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/shipments/${shipment.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6 justify-between lg:items-center">
                      
                      {/* Left: Identity */}
                      <div className="flex gap-4 items-start w-full lg:w-1/3">
                        <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg font-mono">{shipment.trackingNumber}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Order {shipment.orderNumber}
                          </p>
                          {getStatusBadge(shipment.status)}
                        </div>
                      </div>

                      {/* Middle: Route */}
                      <div className="flex-1 flex items-center gap-4 bg-muted/30 p-3 rounded-lg w-full">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origin</p>
                          <p className="text-sm font-medium truncate" title={shipment.originAddress}>{shipment.originAddress}</p>
                        </div>
                        <div className="flex flex-col items-center px-2 text-muted-foreground">
                          <div className="h-1 w-12 bg-border relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Destination</p>
                          <p className="text-sm font-medium truncate" title={shipment.destinationAddress}>{shipment.destinationAddress}</p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="w-full lg:w-auto flex justify-between lg:justify-end items-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0">
                        <div className="text-sm text-muted-foreground hidden sm:block text-right">
                          <span className="block">Created</span>
                          {format(new Date(shipment.createdAt), "MMM d")}
                        </div>
                        <Button variant="ghost" className="group-hover:bg-primary/5 ml-auto lg:ml-0">
                          Track <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>

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
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No shipments found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              {statusFilter !== "all" 
                ? `No shipments matching status "${statusFilter}".` 
                : "There are no shipments to display."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
