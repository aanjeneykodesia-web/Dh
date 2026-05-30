import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  useGetShipment,
  useGetMe,
  useUpdateShipmentStatus,
  getGetShipmentQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, ArrowLeft, Truck, MapPin, CheckCircle2,
  Clock, CalendarDays, ExternalLink, Package, Phone,
  Store, Factory, Navigation, KeyRound, ShieldCheck, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ShipmentMap } from "@/components/shipments/ShipmentMap";

function CallCard({
  icon: Icon,
  role,
  name,
  company,
  phone,
}: {
  icon: React.ElementType;
  role: string;
  name: string | null | undefined;
  company: string | null | undefined;
  phone: string | null | undefined;
}) {
  if (!name && !phone) return null;
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{role}</p>
          <p className="font-semibold text-sm truncate">{name ?? "—"}</p>
          {company && <p className="text-xs text-muted-foreground truncate">{company}</p>}
        </div>
      </div>
      {phone ? (
        <a href={`tel:${phone}`} className="flex-shrink-0">
          <Button size="sm" className="gap-1.5 rounded-full px-4">
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
        </a>
      ) : (
        <span className="text-xs text-muted-foreground flex-shrink-0">No number</span>
      )}
    </div>
  );
}

function PinDisplay({
  pin,
  label,
  description,
}: {
  pin: string;
  label: string;
  description: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {visible ? "Hide" : "Reveal"}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {visible ? (
          <div className="flex gap-2">
            {pin.split("").map((d, i) => (
              <div
                key={i}
                className="h-10 w-9 flex items-center justify-center rounded-lg bg-background border-2 border-primary/30 font-mono text-xl font-bold text-primary shadow-sm"
              >
                {d}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {pin.split("").map((_, i) => (
              <div
                key={i}
                className="h-10 w-9 flex items-center justify-center rounded-lg bg-background border-2 border-muted font-mono text-xl text-muted-foreground"
              >
                •
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

const STATUS_FLOW = ["assigned", "picked_up", "in_transit", "delivered"] as const;
type ShipmentStatus = (typeof STATUS_FLOW)[number];

function needsPin(status: string): boolean {
  return status === "picked_up" || status === "delivered";
}

function pinLabel(nextStatus: string): string {
  return nextStatus === "picked_up"
    ? "Enter Pickup PIN"
    : "Enter Delivery PIN";
}

function pinHint(nextStatus: string): string {
  return nextStatus === "picked_up"
    ? "Ask the manufacturer for the 6-digit pickup code."
    : "Ask the shopkeeper for the 6-digit delivery code.";
}

export function ShipmentDetail() {
  const [, params] = useRoute("/shipments/:id");
  const shipmentId = params?.id;
  const [, setLocation] = useLocation();
  const { data: auth } = useGetMe();
  const queryClient = useQueryClient();

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShipmentStatus | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const { data: shipment, isLoading } = useGetShipment(shipmentId!, {
    query: {
      queryKey: getGetShipmentQueryKey(shipmentId!),
      enabled: !!shipmentId,
      refetchInterval: (query) => {
        const s = query.state.data;
        if (!s || s.status === "delivered") return false;
        return 10_000;
      },
    },
  });

  const updateStatus = useUpdateShipmentStatus();

  const handleAdvanceStatus = () => {
    if (!shipment) return;
    const currentIndex = STATUS_FLOW.indexOf(shipment.status as ShipmentStatus);
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIndex + 1];

    if (needsPin(nextStatus)) {
      setPendingStatus(nextStatus);
      setPinInput("");
      setPinError("");
      setPinDialogOpen(true);
    } else {
      submitStatus(nextStatus, undefined);
    }
  };

  const submitStatus = (status: ShipmentStatus, pin: string | undefined) => {
    updateStatus.mutate(
      { shipmentId: shipmentId!, data: { status, pin: pin ?? null } },
      {
        onSuccess: () => {
          toast.success(`Shipment marked as ${status.replace("_", " ")}`);
          queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId!) });
          setPinDialogOpen(false);
          setPinInput("");
          setPendingStatus(null);
        },
        onError: (err: Error) => {
          const msg = err.message ?? "Invalid PIN";
          setPinError(msg.includes("PIN") ? msg : "Invalid PIN. Try again.");
        },
      },
    );
  };

  const handlePinSubmit = () => {
    if (!pendingStatus) return;
    if (pinInput.trim().length < 4) {
      setPinError("Please enter the full PIN.");
      return;
    }
    setPinError("");
    submitStatus(pendingStatus, pinInput.trim());
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Shipment not found</h2>
        <Button variant="link" onClick={() => setLocation("/shipments")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to shipments
        </Button>
      </div>
    );
  }

  const role = auth?.user?.role;
  const isTransporter = role === "transporter";
  const isManufacturer = role === "manufacturer";
  const isShopkeeper = role === "shopkeeper";
  const currentStepIndex = STATUS_FLOW.indexOf(shipment.status as ShipmentStatus);
  const nextStatus = currentStepIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStepIndex + 1] : null;

  const hasContacts =
    shipment.shopkeeperName || shipment.shopkeeperPhone ||
    shipment.manufacturerName || shipment.manufacturerPhone;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
      <Button
        variant="ghost"
        onClick={() => setLocation("/shipments")}
        className="pl-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shipments
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono">
              {shipment.trackingNumber}
            </h1>
            <Badge variant="outline" className="capitalize text-sm px-3 py-1">
              {shipment.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center">
            <CalendarDays className="h-4 w-4 mr-2" />
            Created {format(new Date(shipment.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        {isTransporter && shipment.status !== "delivered" && nextStatus && (
          <Button
            size="lg"
            onClick={handleAdvanceStatus}
            disabled={updateStatus.isPending}
            className="w-full md:w-auto"
          >
            {updateStatus.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : needsPin(nextStatus) ? (
              <KeyRound className="mr-2 h-5 w-5" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Mark as {nextStatus.replace("_", " ")}
          </Button>
        )}
      </div>

      {/* Progress stepper */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="relative">
            <div className="absolute top-6 left-0 w-full h-2 bg-muted rounded-full" />
            <div
              className="absolute top-6 left-0 h-2 bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(currentStepIndex / (STATUS_FLOW.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {[
                { key: "assigned",  label: "Assigned",   icon: Clock    },
                { key: "picked_up", label: "Picked Up",  icon: Package  },
                { key: "in_transit",label: "In Transit", icon: Truck    },
                { key: "delivered", label: "Delivered",  icon: MapPin   },
              ].map((step, idx) => {
                const isCompleted = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center border-4 relative z-10 transition-colors duration-500 ${
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted text-muted-foreground"
                      } ${isCurrent ? "shadow-[0_0_0_8px_hsl(var(--primary)/0.15)]" : ""}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={`mt-4 font-medium text-xs sm:text-sm ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIN cards — show to the right party */}
      {(isManufacturer || isShopkeeper) && (
        <div className="space-y-3">
          {isManufacturer && shipment.pickupPin && shipment.status === "assigned" && (
            <PinDisplay
              pin={shipment.pickupPin}
              label="Pickup Code"
              description="Share this 6-digit code with the transporter when they arrive to collect the shipment."
            />
          )}
          {isShopkeeper && shipment.deliveryPin && shipment.status !== "delivered" && (
            <PinDisplay
              pin={shipment.deliveryPin}
              label="Delivery Code"
              description="Share this 6-digit code with the transporter when they arrive to deliver your order."
            />
          )}
        </div>
      )}

      {/* Call contacts */}
      {hasContacts && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CallCard
              icon={Store}
              role="Shopkeeper (Recipient)"
              name={shipment.shopkeeperName}
              company={shipment.shopkeeperCompany}
              phone={shipment.shopkeeperPhone}
            />
            <CallCard
              icon={Factory}
              role="Manufacturer (Supplier)"
              name={shipment.manufacturerName}
              company={shipment.manufacturerCompany}
              phone={shipment.manufacturerPhone}
            />
          </CardContent>
        </Card>
      )}

      {/* Live Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Live Tracking Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShipmentMap
            shipmentId={shipment.id}
            originAddress={shipment.originAddress}
            destinationAddress={shipment.destinationAddress}
            status={shipment.status}
            originLat={shipment.originLat}
            originLng={shipment.originLng}
            destLat={shipment.destLat}
            destLng={shipment.destLng}
            currentLat={shipment.currentLat}
            currentLng={shipment.currentLng}
            lastLocationAt={shipment.lastLocationAt}
            isTransporter={isTransporter}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Route */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
                Route Details
              </span>
              {shipment.status !== "delivered" && (() => {
                const url =
                  shipment.destLat != null && shipment.destLng != null
                    ? `https://www.google.com/maps/dir/?api=1&destination=${shipment.destLat},${shipment.destLng}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shipment.destinationAddress)}`;
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Navigation className="h-3.5 w-3.5" />
                      Google Maps
                    </Button>
                  </a>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative pl-6 border-l-2 border-muted pb-6">
              <div className="absolute w-3 h-3 bg-muted-foreground rounded-full -left-[7.5px] top-1" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Origin</p>
              <p className="font-medium">{shipment.originAddress}</p>
              {shipment.pickupDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Picked up on {format(new Date(shipment.pickupDate), "MMM d, h:mm a")}
                </p>
              )}
            </div>
            <div className="relative pl-6 border-l-2 border-transparent">
              <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7.5px] top-1 shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Destination</p>
              <p className="font-medium">{shipment.destinationAddress}</p>
              {shipment.deliveredAt && (
                <p className="text-sm text-green-600 mt-1 font-medium flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Delivered on {format(new Date(shipment.deliveredAt), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Order link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="font-bold text-lg">{shipment.orderNumber}</p>
                </div>
                <Link href={`/orders/${shipment.orderId}`}>
                  <Button variant="outline" size="sm">
                    View Order <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {!isTransporter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transporter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">{shipment.transporterCompany ?? "Independent Courier"}</p>
                    <p className="text-sm text-muted-foreground">Driver: {shipment.transporterName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {shipment.notes && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm bg-muted/50 p-4 rounded-md whitespace-pre-wrap leading-relaxed">
                  {shipment.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* PIN entry dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={(open) => { if (!updateStatus.isPending) setPinDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {pendingStatus ? pinLabel(pendingStatus) : "Enter PIN"}
            </DialogTitle>
            <DialogDescription>
              {pendingStatus ? pinHint(pendingStatus) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pinInput">6-digit PIN</Label>
              <Input
                id="pinInput"
                type="number"
                inputMode="numeric"
                placeholder="• • • • • •"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest h-14"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.slice(0, 6));
                  if (pinError) setPinError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePinSubmit(); }}
                autoFocus
              />
              {pinError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>⚠</span> {pinError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPinDialogOpen(false)}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePinSubmit}
              disabled={updateStatus.isPending || pinInput.length < 4}
            >
              {updateStatus.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
              ) : (
                "Verify & Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
