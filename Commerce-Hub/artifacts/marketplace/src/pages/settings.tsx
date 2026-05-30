import { useState } from "react";
import { useGetMe, useUpdatePaymentCredentials } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard, Building2, CheckCircle2, Loader2,
  Wallet, ShieldCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export function Settings() {
  const { data: auth } = useGetMe();
  const queryClient = useQueryClient();
  const updatePayment = useUpdatePaymentCredentials();

  const user = auth?.user;

  const [upiId, setUpiId]         = useState(user?.upiId ?? "");
  const [bankAccount, setBankAccount] = useState(user?.bankAccount ?? "");
  const [bankIfsc, setBankIfsc]   = useState(user?.bankIfsc ?? "");
  const [bankName, setBankName]   = useState(user?.bankName ?? "");
  const [saved, setSaved]         = useState(false);

  // Sync initial values once user loads
  useState(() => {
    if (user) {
      setUpiId(user.upiId ?? "");
      setBankAccount(user.bankAccount ?? "");
      setBankIfsc(user.bankIfsc ?? "");
      setBankName(user.bankName ?? "");
    }
  });

  const hasPaymentInfo = user?.upiId || user?.bankAccount;

  const handleSave = () => {
    updatePayment.mutate(
      {
        data: {
          upiId: upiId.trim() || null,
          bankAccount: bankAccount.trim() || null,
          bankIfsc: bankIfsc.trim() || null,
          bankName: bankName.trim() || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getMe"] });
          setSaved(true);
          toast.success("Payment credentials saved");
          setTimeout(() => setSaved(false), 2500);
        },
        onError: () => toast.error("Failed to save credentials"),
      },
    );
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* Profile summary */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user.companyName}</p>
            <Badge variant="outline" className="mt-1 capitalize text-xs">{user.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payment credentials — manufacturers & sellers */}
      {(user.role === "manufacturer" || user.role === "shopkeeper") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Credentials
              {hasPaymentInfo && (
                <Badge className="bg-green-100 text-green-700 border-green-200 ml-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Enter your UPI ID or bank account details so buyers can make payments to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* UPI section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">UPI / Instant Transfer</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upi">UPI ID</Label>
                <Input
                  id="upi"
                  placeholder="yourname@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Works with PhonePe, GPay, Paytm, BHIM and all UPI apps
                </p>
              </div>
            </div>

            <Separator />

            {/* Bank account section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Bank Account</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccount">Account Number</Label>
                  <Input
                    id="bankAccount"
                    placeholder="1234 5678 9012 3456"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bankIfsc">IFSC Code</Label>
                  <Input
                    id="bankIfsc"
                    placeholder="SBIN0001234"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                These details are shared with buyers who place orders with you so they can make payment. Keep them accurate.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={updatePayment.isPending}
              className="w-full sm:w-auto"
            >
              {updatePayment.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : saved ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved!</>
              ) : (
                "Save Payment Credentials"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transporter — info panel about payment */}
      {user.role === "transporter" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              Payment Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As a transporter, payments are managed by the platform. Your freight charges are settled by the manufacturer after each successful delivery.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
