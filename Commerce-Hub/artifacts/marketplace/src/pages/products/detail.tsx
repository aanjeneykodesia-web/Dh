import { useRoute, useLocation, Link } from "wouter";
import { useGetProduct, useGetMe } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, ShoppingCart, Package, Info, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = params?.id;
  const [, setLocation] = useLocation();
  const { data: auth } = useGetMe();
  
  const { data: product, isLoading } = useGetProduct(productId!, {
    query: {
      enabled: !!productId
    }
  });

  const [quantity, setQuantity] = useState<number>(0);
  const addItem = useCartStore(state => state.addItem);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button variant="link" onClick={() => setLocation("/products")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to products
        </Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    const qty = Math.max(quantity || product.minOrderQty, product.minOrderQty);
    if (qty > product.stockQty) {
      toast.error(`Only ${product.stockQty} items in stock`);
      return;
    }
    
    const effectivePrice = product.platformPrice ?? product.pricePerUnit;
    addItem({
      productId: product.id,
      productName: product.name,
      pricePerUnit: effectivePrice,
      quantity: qty,
      manufacturerId: product.manufacturerId,
      manufacturerName: product.manufacturerName
    });
    toast.success(`Added ${qty} ${product.unit} to cart`);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <Link href="/products">
        <Button variant="ghost" className="pl-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to catalog
        </Button>
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Package className="h-16 w-16 opacity-20 mb-4" />
              <span className="text-sm">No image available</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex gap-2 mb-3">
            <Badge>{product.category}</Badge>
            {product.stockQty <= product.minOrderQty && (
              <Badge variant="destructive">Low Stock</Badge>
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{product.name}</h1>
          
          <Link href={`/manufacturers/${product.manufacturerId}`} className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6 w-fit">
            <Building2 className="h-4 w-4 mr-2" />
            {product.manufacturerName}
          </Link>

          <div className="mb-6 pb-6 border-b">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                ${(product.platformPrice ?? product.pricePerUnit).toFixed(2)}
              </span>
              <span className="text-lg text-muted-foreground">/{product.unit}</span>
            </div>

          </div>

          <div className="space-y-4 mb-8 flex-1">
            <h3 className="font-semibold flex items-center">
              <Info className="h-4 w-4 mr-2 text-primary" />
              Description
            </h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg border space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground">Minimum Order</p>
                <p className="font-medium text-base">{product.minOrderQty} {product.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available Stock</p>
                <p className="font-medium text-base">{product.stockQty} {product.unit}</p>
              </div>
            </div>

            {auth?.user?.role === "shopkeeper" && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                <div className="flex items-center">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setQuantity(q => Math.max(product.minOrderQty, (q || product.minOrderQty) - 1))}
                    disabled={!quantity || quantity <= product.minOrderQty}
                  >
                    -
                  </Button>
                  <Input 
                    type="number" 
                    className="w-20 mx-2 text-center" 
                    value={quantity || product.minOrderQty}
                    onChange={(e) => setQuantity(Math.max(product.minOrderQty, parseInt(e.target.value) || product.minOrderQty))}
                    min={product.minOrderQty}
                    max={product.stockQty}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setQuantity(q => Math.min(product.stockQty, (q || product.minOrderQty) + 1))}
                    disabled={(quantity || product.minOrderQty) >= product.stockQty}
                  >
                    +
                  </Button>
                </div>
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={product.stockQty < product.minOrderQty}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
            
            {auth?.user?.role === "manufacturer" && auth.user.id === product.manufacturerId && (
              <div className="pt-4 border-t border-border/50">
                <Button className="w-full" onClick={() => setLocation(`/products/${product.id}/edit`)}>
                  Edit Product
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
