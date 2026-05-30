import { useState } from "react";
import {
  useListProducts,
  useSetProductPlatformPrice,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, Pencil, Check, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useListProducts({});
  const setPlatformPrice = useSetProductPlatformPrice();

  // Map of productId → draft platform price string while editing
  const [editing, setEditing] = useState<Record<string, string>>({});

  const startEdit = (productId: string, currentPlatformPrice: number | null | undefined, pricePerUnit: number) => {
    setEditing((prev) => ({
      ...prev,
      [productId]: currentPlatformPrice != null ? String(currentPlatformPrice) : String(pricePerUnit),
    }));
  };

  const cancelEdit = (productId: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const savePrice = (productId: string) => {
    const raw = editing[productId];
    const parsed = raw === "" ? null : parseFloat(raw ?? "");
    if (raw !== "" && (isNaN(parsed as number) || (parsed as number) <= 0)) {
      toast.error("Enter a valid price greater than 0, or leave blank to clear");
      return;
    }
    setPlatformPrice.mutate(
      { productId, data: { platformPrice: parsed ?? undefined } },
      {
        onSuccess: () => {
          toast.success(parsed == null ? "Platform price cleared" : `Platform price set to $${parsed.toFixed(2)}`);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          cancelEdit(productId);
        },
        onError: () => toast.error("Failed to update price"),
      }
    );
  };

  const clearPrice = (productId: string) => {
    setPlatformPrice.mutate(
      { productId, data: { platformPrice: undefined } },
      {
        onSuccess: () => {
          toast.success("Platform price cleared — using manufacturer's price");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          cancelEdit(productId);
        },
        onError: () => toast.error("Failed to clear price"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalWithOverride = products?.filter((p) => p.platformPrice != null).length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Pricing</h1>
        <p className="text-muted-foreground mt-1">
          Override the price shopkeepers see and pay. Manufacturers always receive their own listed price.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold mt-1">{products?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">With Platform Price</p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalWithOverride}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Using Manufacturer Price</p>
            <p className="text-2xl font-bold mt-1">{(products?.length ?? 0) - totalWithOverride}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            All Products
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Manufacturer</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Mfr. Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Platform Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Shopkeeper Pays</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => {
                  const isEditingThis = product.id in editing;
                  const effectivePrice = product.platformPrice ?? product.pricePerUnit;
                  const hasOverride = product.platformPrice != null;
                  const margin = hasOverride
                    ? ((product.platformPrice! - product.pricePerUnit) / product.pricePerUnit) * 100
                    : 0;

                  return (
                    <tr key={product.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-muted overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                                N/A
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium leading-tight">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category} · per {product.unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{product.manufacturerName}</td>
                      <td className="px-4 py-4 text-right font-mono text-muted-foreground">
                        ${product.pricePerUnit.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editing[product.id]}
                              onChange={(e) =>
                                setEditing((prev) => ({ ...prev, [product.id]: e.target.value }))
                              }
                              className="w-28 h-8 text-right font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") savePrice(product.id);
                                if (e.key === "Escape") cancelEdit(product.id);
                              }}
                            />
                          </div>
                        ) : hasOverride ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono font-semibold text-primary">
                              ${product.platformPrice!.toFixed(2)}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <TrendingUp className="h-2.5 w-2.5 mr-1" />
                              {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">not set</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-mono font-semibold ${hasOverride ? "text-primary" : ""}`}>
                          ${effectivePrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {isEditingThis ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => savePrice(product.id)}
                                disabled={setPlatformPrice.isPending}
                              >
                                {setPlatformPrice.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => cancelEdit(product.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => startEdit(product.id, product.platformPrice, product.pricePerUnit)}
                              >
                                <Pencil className="h-3 w-3" />
                                {hasOverride ? "Edit" : "Set Price"}
                              </Button>
                              {hasOverride && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => clearPrice(product.id)}
                                  disabled={setPlatformPrice.isPending}
                                  title="Clear platform price (revert to manufacturer's price)"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products?.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No products found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
