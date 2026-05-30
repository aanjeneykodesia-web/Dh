import { useState } from "react";
import { useLocation } from "wouter";
import { useCartStore } from "@/lib/cart-store";
import { useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";

export function Cart() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const createOrder = useCreateOrder();
  
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleCheckout = () => {
    if (!shippingAddress) {
      toast.error("Shipping address is required");
      return;
    }

    if (items.length === 0) return;

    // Group items by manufacturer
    const itemsByManufacturer = items.reduce((acc, item) => {
      if (!acc[item.manufacturerId]) acc[item.manufacturerId] = [];
      acc[item.manufacturerId].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    // Create an order for each manufacturer
    const orderPromises = Object.values(itemsByManufacturer).map(manufacturerItems => {
      return createOrder.mutateAsync({
        data: {
          items: manufacturerItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          shippingAddress,
          notes: notes || undefined
        }
      });
    });

    Promise.all(orderPromises)
      .then(() => {
        toast.success("Orders placed successfully!");
        clearCart();
        setLocation("/orders");
      })
      .catch((error) => {
        console.error("Checkout failed:", error);
        toast.error("Failed to place one or more orders. Please try again.");
      });
  };

  if (items.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="text-muted-foreground max-w-[400px]">
          Looks like you haven't added anything to your cart yet. Browse our products to find what you need.
        </p>
        <Button onClick={() => setLocation("/products")} size="lg" className="mt-4">
          Browse Products
        </Button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/products")} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Cart</h1>
          <p className="text-muted-foreground">Verify your items and enter shipping details.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b last:border-0 last:pb-0 gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.productName}</h3>
                    <p className="text-sm text-muted-foreground">Supplier: {item.manufacturerName}</p>
                    <div className="text-sm font-medium mt-1">${item.pricePerUnit} per unit</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-r-none border-r-0"
                        onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      >
                        -
                      </Button>
                      <Input 
                        type="number" 
                        className="h-8 w-16 text-center rounded-none focus-visible:ring-0 focus-visible:z-10" 
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-l-none border-l-0"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="font-bold w-[80px] text-right">
                      ${(item.pricePerUnit * item.quantity).toFixed(2)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Details</CardTitle>
              <CardDescription>Where should we send these orders?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery Address <span className="text-destructive">*</span></label>
                <Textarea 
                  placeholder="Enter full shipping address..." 
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Notes (Optional)</label>
                <Input 
                  placeholder="Special instructions for delivery..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>Calculated later</span>
              </div>
              <div className="pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="text-xs text-muted-foreground pt-2">
                Note: Orders from different manufacturers will be split into separate shipments.
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleCheckout}
                disabled={createOrder.isPending || !shippingAddress}
              >
                {createOrder.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Place Order
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
