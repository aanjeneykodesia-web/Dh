import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { Signup } from "@/pages/signup";
import { Dashboard } from "@/pages/dashboard";
import { ProductsList } from "@/pages/products";
import { ProductDetail } from "@/pages/products/detail";
import { ProductForm } from "@/pages/products/form";
import { Cart } from "@/pages/cart";
import { OrdersList } from "@/pages/orders";
import { OrderDetail } from "@/pages/orders/detail";
import { ShipmentsList } from "@/pages/shipments";
import { ShipmentDetail } from "@/pages/shipments/detail";
import { UsersList } from "@/pages/admin/users";
import { AdminProducts } from "@/pages/admin/products";
import { Settings } from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Protected Routes */}
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      
      {/* Products */}
      <Route path="/products">
        <AppLayout>
          <ProductsList />
        </AppLayout>
      </Route>
      <Route path="/products/new">
        <AppLayout>
          <ProductForm />
        </AppLayout>
      </Route>
      <Route path="/products/:id/edit">
        <AppLayout>
          <ProductForm />
        </AppLayout>
      </Route>
      <Route path="/products/:id">
        <AppLayout>
          <ProductDetail />
        </AppLayout>
      </Route>
      
      {/* Cart */}
      <Route path="/cart">
        <AppLayout>
          <Cart />
        </AppLayout>
      </Route>

      {/* Orders */}
      <Route path="/orders">
        <AppLayout>
          <OrdersList />
        </AppLayout>
      </Route>
      <Route path="/orders/:id">
        <AppLayout>
          <OrderDetail />
        </AppLayout>
      </Route>

      {/* Shipments */}
      <Route path="/shipments">
        <AppLayout>
          <ShipmentsList />
        </AppLayout>
      </Route>
      <Route path="/shipments/:id">
        <AppLayout>
          <ShipmentDetail />
        </AppLayout>
      </Route>

      {/* Admin */}
      <Route path="/admin/users">
        <AppLayout>
          <UsersList />
        </AppLayout>
      </Route>
      <Route path="/admin/products">
        <AppLayout>
          <AdminProducts />
        </AppLayout>
      </Route>

      {/* Settings */}
      <Route path="/settings">
        <AppLayout>
          <Settings />
        </AppLayout>
      </Route>

      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
