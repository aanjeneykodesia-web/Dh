import type {
  OrderRow,
  OrderItemRow,
  ShipmentRow,
  UserRow,
} from "@workspace/db";

export function serializeUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    companyName: u.companyName,
    phone: u.phone,
    phoneNumber: u.phoneNumber,
    idProofType: u.idProofType,
    idProofNumber: u.idProofNumber,
    gstin: u.gstin,
    city: u.city,
    avatarUrl: u.avatarUrl,
    upiId: u.upiId ?? null,
    bankAccount: u.bankAccount ?? null,
    bankIfsc: u.bankIfsc ?? null,
    bankName: u.bankName ?? null,
    createdAt: u.createdAt,
  };
}

export function serializeShipment(
  s: ShipmentRow,
  ctx: {
    orderNumber: string;
    transporter: UserRow;
    shopkeeper?: UserRow | null;
    manufacturer?: UserRow | null;
  },
) {
  return {
    id: s.id,
    trackingNumber: s.trackingNumber,
    status: s.status,
    orderId: s.orderId,
    orderNumber: ctx.orderNumber,
    transporterId: s.transporterId,
    transporterName: ctx.transporter.name,
    transporterCompany: ctx.transporter.companyName,
    shopkeeperName: ctx.shopkeeper?.name ?? null,
    shopkeeperCompany: ctx.shopkeeper?.companyName ?? null,
    shopkeeperPhone: ctx.shopkeeper?.phone ?? null,
    manufacturerName: ctx.manufacturer?.name ?? null,
    manufacturerCompany: ctx.manufacturer?.companyName ?? null,
    manufacturerPhone: ctx.manufacturer?.phone ?? null,
    originAddress: s.originAddress,
    destinationAddress: s.destinationAddress,
    pickupDate: s.pickupDate,
    deliveredAt: s.deliveredAt,
    notes: s.notes,
    originLat: s.originLat,
    originLng: s.originLng,
    destLat: s.destLat,
    destLng: s.destLng,
    currentLat: s.currentLat,
    currentLng: s.currentLng,
    lastLocationAt: s.lastLocationAt,
    pickupPin: s.pickupPin ?? null,
    deliveryPin: s.deliveryPin ?? null,
    createdAt: s.createdAt,
  };
}

export function serializeOrder(
  o: OrderRow,
  ctx: {
    items: OrderItemRow[];
    shopkeeper: UserRow;
    manufacturer: UserRow;
    shipment?: ShipmentRow | null;
    transporter?: UserRow | null;
  },
) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    shopkeeperId: o.shopkeeperId,
    shopkeeperName: ctx.shopkeeper.name,
    shopkeeperCompany: ctx.shopkeeper.companyName,
    shopkeeperPhone: ctx.shopkeeper.phone ?? null,
    manufacturerId: o.manufacturerId,
    manufacturerName: ctx.manufacturer.companyName,
    manufacturerPhone: ctx.manufacturer.phone ?? null,
    items: ctx.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      pricePerUnit: Number(it.pricePerUnit),
      lineTotal: Number(it.lineTotal),
    })),
    totalAmount: Number(o.totalAmount),
    shippingAddress: o.shippingAddress,
    notes: o.notes,
    shipment:
      ctx.shipment && ctx.transporter
        ? serializeShipment(ctx.shipment, {
            orderNumber: o.orderNumber,
            transporter: ctx.transporter,
          })
        : null,
    createdAt: o.createdAt,
  };
}
