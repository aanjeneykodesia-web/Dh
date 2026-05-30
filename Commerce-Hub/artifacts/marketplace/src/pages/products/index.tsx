import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  useListProducts, 
  useListProductCategories,
  useGetMe,
  useDeleteProduct,
  getListProductsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, ShoppingCart, Edit, Trash2, Package } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export function ProductsList() {
  const [, setLocation] = useLocation();
  const { data: auth } = useGetMe();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: category !== "all" ? category : undefined
  });
  
  const { data: categories } = useListProductCategories();
  const deleteProduct = useDeleteProduct();
  const addItem = useCartStore(state => state.addItem);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate({ productId: id }, {
        onSuccess: () => {
          toast.success("Product deleted");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: () => toast.error("Failed to delete product")
      });
    }
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const effectivePrice = product.platformPrice ?? product.pricePerUnit;
    addItem({
      productId: product.id,
      productName: product.name,
      pricePerUnit: effectivePrice,
      quantity: product.minOrderQty,
      manufacturerId: product.manufacturerId,
      manufacturerName: product.manufacturerName
    });
    toast.success(`Added ${product.minOrderQty} ${product.unit} to cart`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            {auth?.user?.role === "manufacturer" 
              ? "Manage your product catalog." 
              : "Browse and order wholesale products."}
          </p>
        </div>
        
        {auth?.user?.role === "manufacturer" && (
          <Button onClick={() => setLocation("/products/new")} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products?.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={`/products/${product.id}`}>
              <Card className="h-full flex flex-col cursor-pointer hover:border-primary/50 hover:shadow-md transition-all overflow-hidden group">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {product.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight line-clamp-1">{product.name}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{product.manufacturerName}</p>
                </CardHeader>
                
                <CardContent className="p-4 pt-0 flex-1">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-2xl font-bold tracking-tight">
                      ${(product.platformPrice ?? product.pricePerUnit).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">/{product.unit}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                    <Badge variant="outline">Min: {product.minOrderQty}</Badge>
                    <span className={product.stockQty > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                      {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0 mt-auto border-t border-border/50 bg-muted/20">
                  {auth?.user?.role === "shopkeeper" ? (
                    <Button 
                      className="w-full mt-3" 
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stockQty < product.minOrderQty}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  ) : (auth?.user?.role === "manufacturer" && auth.user.id === product.manufacturerId) || auth?.user?.role === "admin" ? (
                    <div className="flex w-full gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLocation(`/products/${product.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(product.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </CardFooter>
              </Card>
            </Link>
          </motion.div>
        ))}
        
        {products?.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
