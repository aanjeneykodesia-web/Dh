import { Router, type IRouter } from "express";
import {
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  AssignTransporterParams,
  AssignTransporterBody,
  AssignTransporterResponse,
} from "@workspace/api-zod";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  shipmentsTable,
  activityTable,
  type OrderRow,
  type OrderItemRow,
  type ShipmentRow,
  type UserRow,
} from "@workspace/db";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { newId, newOrderNumber, newTrackingNumber, newPin } from "../lib/ids";
import { serializeOrder } from "../lib/serializers";

const router: IRouter = Router();

async function loadFullOrder(orderId: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
  shopkeeper: UserRow;
  manufacturer: UserRow;
  shipment: ShipmentRow | null;
  transporter: UserRow | null;
} | null> {
  const [orderRow] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!orderRow) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));
  const userRows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, [orderRow.shopkeeperId, orderRow.manufacturerId]));
  const shopkeeper = userRows.find((u) => u.id === orderRow.shopkeeperId);
  const manufacturer = userRows.find((u) => u.id === orderRow.manufacturerId);
  if (!shopkeeper || !manufacturer) return null;

  const [shipmentRow] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.orderId, orderId))
    .limit(1);

  let transporter: UserRow | null = null;
  if (shipmentRow) {
    const [t] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, shipmentRow.transporterId))
      .limit(1);
    transporter = t ?? null;
  }

  return {
    order: orderRow,
    items,
    shopkeeper,
    manufacturer,
    shipment: shipmentRow ?? null,
    transporter,
  };
}

router.get("/orders", async (req, res) => {
  const params = ListOrdersQueryParams.parse(req.query);
  const conditions = [];
  if (params.status) conditions.push(eq(ordersTable.status, params.status as OrderRow["status"]));

  if (req.isAuthenticated()) {
    const u = req.user;
    if (u.role === "shopkeeper") {
      conditions.push(eq(ordersTable.shopkeeperId, u.id));
    } else if (u.role === "manufacturer") {
      conditions.push(eq(ordersTable.manufacturerId, u.id));
    } else if (u.role === "transporter") {
      // Transporters see orders they have shipments on
      const myShipmentOrders = await db
        .select({ id: shipmentsTable.orderId })
        .from(shipmentsTable)
        .where(eq(shipmentsTable.transporterId, u.id));
      const ids = myShipmentOrders.map((r) => r.id);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      conditions.push(inArray(ordersTable.id, ids));
    }
  }

  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  if (orderRows.length === 0) {
    res.json([]);
    return;
  }
  const orderIds = orderRows.map((o) => o.id);
  const userIdsSet = new Set<string>();
  orderRows.forEach((o) => {
    userIdsSet.add(o.shopkeeperId);
    userIdsSet.add(o.manufacturerId);
  });
  const allItems = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));
  const allShipments = await db
    .select()
    .from(shipmentsTable)
    .where(inArray(shipmentsTable.orderId, orderIds));
  allShipments.forEach((s) => userIdsSet.add(s.transporterId));
  const userRows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, Array.from(userIdsSet)));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  const out = orderRows.map((o) => {
    const items = allItems.filter((i) => i.orderId === o.id);
    const shipment = allShipments.find((s) => s.orderId === o.id) ?? null;
    return serializeOrder(o, {
      items,
      shopkeeper: userMap.get(o.shopkeeperId)!,
      manufacturer: userMap.get(o.manufacturerId)!,
      shipment,
      transporter: shipment ? userMap.get(shipment.transporterId) ?? null : null,
    });
  });
  const data = ListOrdersResponse.parse(out);
  res.json(data);
});

router.post("/orders", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  if (user.role !== "shopkeeper") {
    res.status(403).json({ error: "Only shopkeepers can place orders" });
    return;
  }
  const body = CreateOrderBody.parse(req.body);
  if (body.items.length === 0) {
    res.status(400).json({ error: "Order must contain at least one item" });
    return;
  }

  // Load all referenced products
  const productIds = body.items.map((i) => i.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  if (products.length !== body.items.length) {
    res.status(400).json({ error: "One or more products not found" });
    return;
  }
  // Verify all products are from the same manufacturer (frontend splits cart per manufacturer)
  const manufacturerIds = new Set(products.map((p) => p.manufacturerId));
  if (manufacturerIds.size !== 1) {
    res
      .status(400)
      .json({ error: "All items in an order must be from the same manufacturer" });
    return;
  }
  const manufacturerId = products[0]!.manufacturerId;

  const orderId = newId("ord");
  const orderNumber = newOrderNumber();
  let total = 0;
  const itemRows = body.items.map((it) => {
    const product = products.find((p) => p.id === it.productId)!;
    // Use admin-set platform price if available, otherwise manufacturer's listed price
    const effectivePrice = product.platformPrice != null
      ? Number(product.platformPrice)
      : Number(product.pricePerUnit);
    const lineTotal = effectivePrice * it.quantity;
    total += lineTotal;
    return {
      id: newId("oi"),
      orderId,
      productId: product.id,
      productName: product.name,
      quantity: it.quantity,
      pricePerUnit: effectivePrice.toString(),
      lineTotal: lineTotal.toFixed(2),
    };
  });

  await db.insert(ordersTable).values({
    id: orderId,
    orderNumber,
    status: "pending",
    shopkeeperId: user.id,
    manufacturerId,
    totalAmount: total.toFixed(2),
    shippingAddress: body.shippingAddress,
    notes: body.notes ?? null,
  });
  await db.insert(orderItemsTable).values(itemRows);

  // Decrement stock
  for (const it of body.items) {
    const p = products.find((pp) => pp.id === it.productId)!;
    await db
      .update(productsTable)
      .set({ stockQty: Math.max(0, p.stockQty - it.quantity) })
      .where(eq(productsTable.id, p.id));
  }

  await db.insert(activityTable).values({
    id: newId("act"),
    type: "order_placed",
    title: "Order placed",
    description: `${user.companyName} placed order ${orderNumber}`,
    ownerId: user.id,
    counterpartId: manufacturerId,
    relatedId: orderId,
  });

  const full = await loadFullOrder(orderId);
  if (!full) {
    res.status(500).json({ error: "Failed to load order" });
    return;
  }
  const data = CreateOrderResponse.parse(serializeOrder(full.order, full));
  res.json(data);
});

router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = GetOrderParams.parse(req.params);
  const full = await loadFullOrder(orderId);
  if (!full) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const data = GetOrderResponse.parse(serializeOrder(full.order, full));
  res.json(data);
});

router.post("/orders/:orderId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { orderId } = UpdateOrderStatusParams.parse(req.params);
  const body = UpdateOrderStatusBody.parse(req.body);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const u = req.user;
  if (body.status === "accepted" || body.status === "rejected") {
    if (u.role !== "manufacturer" || order.manufacturerId !== u.id) {
      if (u.role !== "admin") {
        res.status(403).json({ error: "Only the manufacturer can accept/reject" });
        return;
      }
    }
    if (order.status !== "pending") {
      res.status(400).json({ error: "Order is not pending" });
      return;
    }
  }
  if (body.status === "cancelled") {
    if (u.role !== "shopkeeper" || order.shopkeeperId !== u.id) {
      if (u.role !== "admin") {
        res.status(403).json({ error: "Only the shopkeeper can cancel" });
        return;
      }
    }
    if (order.status !== "pending") {
      res.status(400).json({ error: "Only pending orders can be cancelled" });
      return;
    }
  }

  await db
    .update(ordersTable)
    .set({ status: body.status })
    .where(eq(ordersTable.id, orderId));

  await db.insert(activityTable).values({
    id: newId("act"),
    type:
      body.status === "accepted"
        ? "order_accepted"
        : body.status === "rejected"
          ? "order_rejected"
          : "order_placed",
    title:
      body.status === "accepted"
        ? "Order accepted"
        : body.status === "rejected"
          ? "Order rejected"
          : "Order cancelled",
    description: `Order ${order.orderNumber} ${body.status}${
      body.reason ? ` — ${body.reason}` : ""
    }`,
    ownerId: order.manufacturerId,
    counterpartId: order.shopkeeperId,
    relatedId: orderId,
  });

  const full = await loadFullOrder(orderId);
  if (!full) {
    res.status(500).json({ error: "Failed to reload order" });
    return;
  }
  const data = UpdateOrderStatusResponse.parse(serializeOrder(full.order, full));
  res.json(data);
});

router.post("/orders/:orderId/assign-transporter", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { orderId } = AssignTransporterParams.parse(req.params);
  const body = AssignTransporterBody.parse(req.body);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const u = req.user;
  if (u.role !== "admin" && !(u.role === "manufacturer" && order.manufacturerId === u.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (order.status !== "accepted") {
    res.status(400).json({ error: "Order must be accepted before assignment" });
    return;
  }
  const [transporter] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, body.transporterId), eq(usersTable.role, "transporter")))
    .limit(1);
  if (!transporter) {
    res.status(400).json({ error: "Transporter not found" });
    return;
  }
  const [manufacturer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, order.manufacturerId))
    .limit(1);

  // Remove existing shipment if any (re-assignment)
  await db.delete(shipmentsTable).where(eq(shipmentsTable.orderId, orderId));

  const shipmentId = newId("shp");
  const trackingNumber = newTrackingNumber();
  const originAddress =
    `${manufacturer?.companyName ?? ""}` +
    (manufacturer?.city ? `, ${manufacturer.city}` : "");
  await db.insert(shipmentsTable).values({
    id: shipmentId,
    trackingNumber,
    status: "assigned",
    orderId,
    transporterId: transporter.id,
    originAddress: originAddress || "Manufacturer warehouse",
    destinationAddress: order.shippingAddress,
    pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
    notes: body.notes ?? null,
    pickupPin: newPin(),
    deliveryPin: newPin(),
  });
  await db
    .update(ordersTable)
    .set({ status: "in_transit" })
    .where(eq(ordersTable.id, orderId));

  await db.insert(activityTable).values({
    id: newId("act"),
    type: "shipment_assigned",
    title: "Shipment assigned",
    description: `${transporter.companyName} assigned to order ${order.orderNumber}`,
    ownerId: transporter.id,
    counterpartId: order.manufacturerId,
    relatedId: shipmentId,
  });

  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  if (!shipment) {
    res.status(500).json({ error: "Failed to load shipment" });
    return;
  }
  const data = AssignTransporterResponse.parse({
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    orderId: shipment.orderId,
    orderNumber: order.orderNumber,
    transporterId: shipment.transporterId,
    transporterName: transporter.name,
    transporterCompany: transporter.companyName,
    originAddress: shipment.originAddress,
    destinationAddress: shipment.destinationAddress,
    pickupDate: shipment.pickupDate,
    deliveredAt: shipment.deliveredAt,
    notes: shipment.notes,
    createdAt: shipment.createdAt,
  });
  res.json(data);
});

// Suppress unused import lint
void or;

export default router;
