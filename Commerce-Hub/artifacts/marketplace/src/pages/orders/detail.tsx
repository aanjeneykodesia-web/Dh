import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  useGetOrder, 
  useGetMe, 
  useUpdateOrderStatus, 
  useAssignTransporter,
  useListTransporters,
  getGetOrderQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Truck, Package, Clock, MapPin, Building } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OrderChat } from "@/components/orders/OrderChat";

export function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const orderId = params?.id;
  const [, setLocation] = useLocation();
  const { data: auth } = useGetMe();
  const queryClient = useQueryClient();
  
  const { data: order, isLoading } = useGetOrder(orderId!, {
    query: { enabled: !!orderId }
  });

  const { data: transporters } = useListTransporters({
    query: { enabled: auth?.user?.role === "manufacturer" && order?.status === "accepted" }
  });

  const updateStatus = useUpdateOrderStatus();
  const assignTransporter = useAssignTransporter();

  const [selectedTransporter, setSelectedTransporter] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const handleUpdateStatus = (status: "accepted" | "rejected" | "cancelled") => {
    updateStatus.mutate(
      { orderId: orderId!, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Order ${status}`);
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId!) });
        },
        onError: () => toast.error("Failed to update status")
      }
    );
  };

  const handleAssignTransporter = () => {
    if (!selectedTransporter) return;
    
    assignTransporter.mutate(
      { 
        orderId: orderId!, 
        data: { 
          transporterId: selectedTransporter,
          notes: assignNotes || undefined
        } 
      },
      {
        onSuccess: () => {
          toast.success("Transporter assigned successfully");
          setIsAssignDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId!) });
        },
        onError: () => toast.error("Failed to assign transporter")
      }
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Order not found</h2>
        <Button variant="link" onClick={() => setLocation("/orders")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to orders
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pending Approval</Badge>;
      case 'accepted': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Accepted</Badge>;
      case 'in_transit': return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">In Transit</Badge>;
      case 'delivered': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Delivered</Badge>;
      case 'rejected': 
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timelineSteps = [
    { status: 'pending', label: 'Order Placed', icon: Clock },
    { status: 'accepted', label: 'Accepted', icon: CheckCircle2 },
    { status: 'in_transit', label: 'In Transit', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: MapPin }
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.status === order.status);
  // Handle rejected/cancelled gracefully in timeline
  const activeStepIndex = order.status === 'rejected' || order.status === 'cancelled' 
    ? 0 // Only first step active
    : currentStepIndex === -1 && order.shipment // If in_transit/delivered
      ? timelineSteps.findIndex(s => s.status === order.shipment?.status)
      : currentStepIndex;

  const isManufacturer = auth?.user?.role === "manufacturer";

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/orders")}
        className="pl-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        {/* Action Buttons for Manufacturer */}
        {isManufacturer && order.status === "pending" && (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleUpdateStatus("rejected")}
              disabled={updateStatus.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button 
              onClick={() => handleUpdateStatus("accepted")}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Order
            </Button>
          </div>
        )}

        {isManufacturer && order.status === "accepted" && !order.shipment && (
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Truck className="mr-2 h-4 w-4" /> Assign Transporter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Transporter</DialogTitle>
                <DialogDescription>
                  Select a logistics partner to handle the delivery of this order.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transporter</label>
                  <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a transporter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters?.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.companyName} ({t.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes for Transporter (Optional)</label>
                  <Textarea 
                    placeholder="Pickup instructions, handling requirements..." 
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAssignTransporter} 
                  disabled={!selectedTransporter || assignTransporter.isPending}
                >
                  {assignTransporter.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative gap-6 sm:gap-0">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon;
              // Very simple logic for UI purposes
              let isActive = false;
              let isPast = false;
              
              if (order.status === 'rejected' || order.status === 'cancelled') {
                isActive = index === 0;
                isPast = false;
              } else {
                if (order.status === 'pending') {
                  isActive = index === 0;
                } else if (order.status === 'accepted') {
                  isPast = index === 0;
                  isActive = index === 1;
                } else if (order.status === 'in_transit') {
                  isPast = index <= 1;
                  isActive = index === 2;
                } else if (order.status === 'delivered') {
                  isPast = index <= 2;
                  isActive = index === 3;
                }
              }

              return (
                <div key={step.status} className="flex flex-row sm:flex-col items-center gap-3 sm:gap-2 relative z-10 w-full sm:w-auto">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isPast ? "bg-primary border-primary text-primary-foreground" : 
                    isActive ? "border-primary text-primary bg-background shadow-[0_0_0_4px_hsl(var(--primary)/0.2)]" : 
                    "border-muted bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 sm:text-center">
                    <div className={`font-medium ${isActive || isPast ? "text-foreground" : "text-muted-foreground"}`}>
                      {order.status === 'rejected' && index === 0 ? 'Cancelled' : step.label}
                    </div>
                  </div>
                  {/* Connecting Line (Horizontal for Desktop, Vertical for Mobile) */}
                  {index < timelineSteps.length - 1 && (
                    <>
                      {/* Desktop */}
                      <div className={`hidden sm:block absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px] -z-10 ${
                        isPast ? "bg-primary" : "bg-muted"
                      }`} style={{ width: 'calc(200% - 40px)' }} />
                      {/* Mobile */}
                      <div className={`sm:hidden absolute top-[40px] left-[19px] w-[2px] h-[calc(100%-10px)] -z-10 ${
                        isPast ? "bg-primary" : "bg-muted"
                      }`} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <Link href={`/products/${item.productId}`} className="font-medium hover:text-primary hover:underline">
                          {item.productName}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × ${item.pricePerUnit}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold">
                      ${item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <OrderChat orderId={order.id} />

          {order.shipment && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Shipment Tracking</CardTitle>
                  <CardDescription>Tracking #{order.shipment.trackingNumber}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLocation(`/shipments/${order.shipment?.id}`)}>
                  View Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{order.shipment.transporterCompany || order.shipment.transporterName}</p>
                      <p className="text-sm text-muted-foreground capitalize">Status: {order.shipment.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Building className="h-4 w-4 mr-2" /> 
                {isManufacturer ? "Customer Details" : "Supplier Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium text-base">
                  {isManufacturer ? order.shopkeeperCompany : order.manufacturerName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact Name</p>
                <p className="font-medium">
                  {isManufacturer ? order.shopkeeperName : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MapPin className="h-4 w-4 mr-2" /> Shipping Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Delivery Address</p>
                <p className="font-medium whitespace-pre-wrap">{order.shippingAddress}</p>
              </div>
              {order.notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Order Notes</p>
                  <p className="bg-muted/50 p-3 rounded-md">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
