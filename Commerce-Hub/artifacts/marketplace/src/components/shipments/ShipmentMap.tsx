import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, Locate, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateShipmentLocation, getGetShipmentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

interface ShipmentMapProps {
  shipmentId: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocationAt?: string | null;
  isTransporter: boolean;
}

const DEFAULT_ORIGIN = { lat: 19.076, lng: 72.8777 };
const DEFAULT_DEST   = { lat: 18.5204, lng: 73.8567 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function statusProgress(status: string): number {
  const map: Record<string, number> = {
    assigned:  0,
    picked_up: 0.15,
    in_transit: 0.55,
    delivered:  1,
  };
  return map[status] ?? 0;
}

type GeoState = "idle" | "requesting" | "tracking" | "denied" | "error";

export function ShipmentMap({
  shipmentId,
  originAddress,
  destinationAddress,
  status,
  originLat,
  originLng,
  destLat,
  destLng,
  currentLat,
  currentLng,
  lastLocationAt,
  isTransporter,
}: ShipmentMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const markers    = useRef<{
    origin?: import("leaflet").CircleMarker;
    dest?:   import("leaflet").Marker;
    truck?:  import("leaflet").Marker;
    me?:     import("leaflet").CircleMarker;
    line?:   import("leaflet").Polyline;
  }>({});
  const watchIdRef = useRef<number | null>(null);

  const [geoState, setGeoState]   = useState<GeoState>("idle");
  const [accuracy, setAccuracy]   = useState<number | null>(null);
  const [lastPushed, setLastPushed] = useState<Date | null>(null);

  const queryClient    = useQueryClient();
  const updateLocation = useUpdateShipmentLocation();

  const origin = {
    lat: originLat ?? DEFAULT_ORIGIN.lat,
    lng: originLng ?? DEFAULT_ORIGIN.lng,
  };
  const dest = {
    lat: destLat ?? DEFAULT_DEST.lat,
    lng: destLng ?? DEFAULT_DEST.lng,
  };
  const progress = statusProgress(status);
  const currentPos =
    currentLat != null && currentLng != null
      ? { lat: currentLat, lng: currentLng }
      : { lat: lerp(origin.lat, dest.lat, progress), lng: lerp(origin.lng, dest.lng, progress) };

  // ── Leaflet init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      const iconUrl       = new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href;
      const iconRetinaUrl = new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href;
      const shadowUrl     = new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href;
      // @ts-expect-error private
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

      if (cancelled || !mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true }).setView(
        [lerp(origin.lat, dest.lat, 0.5), lerp(origin.lng, dest.lng, 0.5)],
        9,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const line = L.polyline(
        [[origin.lat, origin.lng], [dest.lat, dest.lng]],
        { color: "hsl(220 70% 50%)", weight: 3, dashArray: "8 6", opacity: 0.7 },
      ).addTo(map);

      const originMarker = L.circleMarker([origin.lat, origin.lng], {
        radius: 10, color: "#16a34a", fillColor: "#22c55e", fillOpacity: 1, weight: 2,
      }).addTo(map).bindPopup(`<b>Origin</b><br>${originAddress}`);

      const destIcon = L.divIcon({
        html: `<div style="background:#dc2626;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24], className: "",
      });
      const destMarker = L.marker([dest.lat, dest.lng], { icon: destIcon })
        .addTo(map).bindPopup(`<b>Destination</b><br>${destinationAddress}`);

      const truckIcon = L.divIcon({
        html: `<div style="background:#2563eb;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:16px">🚚</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16], className: "",
      });
      const truckMarker = L.marker([currentPos.lat, currentPos.lng], { icon: truckIcon })
        .addTo(map).bindPopup(`<b>Shipment location</b>`);

      map.fitBounds(
        L.latLngBounds([
          [origin.lat, origin.lng],
          [dest.lat, dest.lng],
          [currentPos.lat, currentPos.lng],
        ]),
        { padding: [50, 50] },
      );

      mapInstance.current = map;
      markers.current = { origin: originMarker, dest: destMarker, truck: truckMarker, line };
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync truck marker when position updates ───────────────────────────────
  useEffect(() => {
    if (markers.current.truck) {
      markers.current.truck.setLatLng([currentPos.lat, currentPos.lng]);
    }
  }, [currentPos.lat, currentPos.lng]);

  // ── Push GPS position to backend ──────────────────────────────────────────
  const pushPosition = useCallback(
    (lat: number, lng: number) => {
      updateLocation.mutate(
        { shipmentId, data: { lat, lng } },
        {
          onSuccess: () => {
            setLastPushed(new Date());
            queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipmentId],
  );

  // ── Update "my location" blue dot on map ─────────────────────────────────
  const updateMyDot = useCallback(async (lat: number, lng: number) => {
    const L = (await import("leaflet")).default;
    const map = mapInstance.current;
    if (!map) return;
    if (markers.current.me) {
      markers.current.me.setLatLng([lat, lng]);
    } else {
      markers.current.me = L.circleMarker([lat, lng], {
        radius: 8, color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 2,
      }).addTo(map).bindPopup("<b>You are here</b>");
    }
    markers.current.truck?.setLatLng([lat, lng]);
  }, []);

  // ── Start GPS tracking ────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS not available on this device");
      setGeoState("error");
      return;
    }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setAccuracy(Math.round(acc));
        setGeoState("tracking");
        await updateMyDot(lat, lng);
        pushPosition(lat, lng);
        // Pan map to current position
        mapInstance.current?.panTo([lat, lng]);
        toast.success("Location detected — sharing with shipment");

        // Watch for continuous updates
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (p) => {
            const { latitude: la, longitude: ln, accuracy: ac } = p.coords;
            setAccuracy(Math.round(ac));
            await updateMyDot(la, ln);
            pushPosition(la, ln);
          },
          () => { /* silent on watch error */ },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState("denied");
          toast.error("Location permission denied. Enable it in browser settings.");
        } else {
          setGeoState("error");
          toast.error("Could not get location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [pushPosition, updateMyDot]);

  // ── Stop GPS tracking ─────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGeoState("idle");
    setAccuracy(null);
    toast("Location sharing stopped");
  }, []);

  // Cleanup watch on unmount
  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  // ── Google Maps navigation URL ────────────────────────────────────────────
  const googleMapsUrl =
    destLat != null && destLng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border h-72 md:h-96 relative">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Legend + last-updated */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" /> Origin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-600" /> Destination
          </span>
          <span className="flex items-center gap-1.5">🚚 Current</span>
        </div>
        {lastLocationAt && (
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Updated {new Date(lastLocationAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Transporter action bar */}
      {isTransporter && status !== "delivered" && (
        <div className="flex flex-wrap items-center gap-2">
          {geoState === "tracking" ? (
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={stopTracking}
            >
              <CheckCircle2 className="h-4 w-4" />
              Sharing location
              {accuracy !== null && (
                <Badge variant="secondary" className="text-xs ml-1">
                  ±{accuracy}m
                </Badge>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={startTracking}
              disabled={geoState === "requesting"}
            >
              <Locate className={`h-4 w-4 ${geoState === "requesting" ? "animate-pulse" : ""}`} />
              {geoState === "requesting"
                ? "Detecting location…"
                : geoState === "denied"
                  ? "Location blocked — retry"
                  : "Share My Location"}
            </Button>
          )}

          {lastPushed && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Sent {lastPushed.toLocaleTimeString()}
            </span>
          )}

          {geoState === "denied" && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Allow location in browser settings
            </span>
          )}

          {/* Google Maps navigation */}
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Button variant="outline" size="sm" className="gap-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              Navigate
            </Button>
          </a>
        </div>
      )}

      {!isTransporter && status !== "delivered" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Live position updates as the transporter moves. Refreshes automatically.
        </p>
      )}
    </div>
  );
}
