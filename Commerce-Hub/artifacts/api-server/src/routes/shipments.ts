import { Router, type IRouter } from "express";
import {
  ListShipmentsQueryParams,
  ListShipmentsResponse,
  GetShipmentParams,
  GetShipmentResponse,
  UpdateShipmentStatusParams,
  UpdateShipmentStatusBody,
  UpdateShipmentStatusResponse,
  UpdateShipmentLocationParams,
  UpdateShipmentLocationBody,
  UpdateShipmentLocationResponse,
} from "@workspace/api-zod";
import {
  db,
  shipmentsTable,
  ordersTable,
  usersTable,
  activityTable,
  type ShipmentRow,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { newId } from "../lib/ids";
import { serializeShipment } from "../lib/serializers";

const router: IRouter = Router();

router.get("/shipments", async (req, res) => {
  const params = ListShipmentsQueryParams.parse(req.query);
  const conditions = [];
  if (params.status)
    conditions.push(eq(shipmentsTable.status, params.status as ShipmentRow["status"]));

  if (req.isAuthenticated()) {
    const u = req.user;
    if (u.role === "transporter") {
      conditions.push(eq(shipmentsTable.transporterId, u.id));
    } else if (u.role === "manufacturer" || u.role === "shopkeeper") {
      const orderRows = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(
          u.role === "manufacturer"
            ? eq(ordersTable.manufacturerId, u.id)
            : eq(ordersTable.shopkeeperId, u.id),
        );
      const orderIds = orderRows.map((o) => o.id);
      if (orderIds.length === 0) {
        res.json([]);
        return;
      }
      conditions.push(inArray(shipmentsTable.orderId, orderIds));
    }
  }

  const shipmentRows = await db
    .select()
    .from(shipmentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shipmentsTable.createdAt));

  if (shipmentRows.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = shipmentRows.map((s) => s.orderId);
  const transporterIds = Array.from(new Set(shipmentRows.map((s) => s.transporterId)));
  const orderRows = await db
    .select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(inArray(ordersTable.id, orderIds));
  const transporterRows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, transporterIds));

  const orderMap = new Map(orderRows.map((o) => [o.id, o]));
  const transporterMap = new Map(transporterRows.map((u) => [u.id, u]));

  const out = shipmentRows.map((s) =>
    serializeShipment(s, {
      orderNumber: orderMap.get(s.orderId)?.orderNumber ?? "",
      transporter: transporterMap.get(s.transporterId)!,
    }),
  );
  const data = ListShipmentsResponse.parse(out);
  res.json(data);
});

router.get("/shipments/:shipmentId", async (req, res) => {
  const { shipmentId } = GetShipmentParams.parse(req.params);
  const [s] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const [o] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, s.orderId))
    .limit(1);
  if (!o) {
    res.status(404).json({ error: "Shipment context missing" });
    return;
  }
  const [t, shopkeeper, manufacturer] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, s.transporterId)).limit(1).then(r => r[0]),
    db.select().from(usersTable).where(eq(usersTable.id, o.shopkeeperId)).limit(1).then(r => r[0]),
    db.select().from(usersTable).where(eq(usersTable.id, o.manufacturerId)).limit(1).then(r => r[0]),
  ]);
  if (!t) {
    res.status(404).json({ error: "Shipment context missing" });
    return;
  }
  const data = GetShipmentResponse.parse(
    serializeShipment(s, { orderNumber: o.orderNumber, transporter: t, shopkeeper, manufacturer }),
  );
  res.json(data);
});

router.post("/shipments/:shipmentId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { shipmentId } = UpdateShipmentStatusParams.parse(req.params);
  const body = UpdateShipmentStatusBody.parse(req.body);
  const [s] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const u = req.user;
  if (u.role !== "admin" && !(u.role === "transporter" && s.transporterId === u.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // PIN verification for key status transitions
  if (body.status === "picked_up" && s.pickupPin) {
    if (!body.pin || body.pin.trim() !== s.pickupPin) {
      res.status(400).json({ error: "Invalid pickup PIN. Check the code shown by the manufacturer." });
      return;
    }
  }
  if (body.status === "delivered" && s.deliveryPin) {
    if (!body.pin || body.pin.trim() !== s.deliveryPin) {
      res.status(400).json({ error: "Invalid delivery PIN. Check the code shown by the shopkeeper." });
      return;
    }
  }
  const update: Partial<typeof shipmentsTable.$inferInsert> = {
    status: body.status,
    notes: body.notes ?? s.notes,
  };
  if (body.status === "picked_up" && !s.pickupDate) {
    update.pickupDate = new Date();
  }
  if (body.status === "delivered") {
    update.deliveredAt = new Date();
  }
  await db.update(shipmentsTable).set(update).where(eq(shipmentsTable.id, shipmentId));

  if (body.status === "delivered") {
    await db
      .update(ordersTable)
      .set({ status: "delivered" })
      .where(eq(ordersTable.id, s.orderId));
  } else if (body.status === "in_transit" || body.status === "picked_up") {
    await db
      .update(ordersTable)
      .set({ status: "in_transit" })
      .where(eq(ordersTable.id, s.orderId));
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, s.orderId))
    .limit(1);

  const activityType =
    body.status === "delivered"
      ? "shipment_delivered"
      : body.status === "picked_up"
        ? "shipment_picked_up"
        : body.status === "in_transit"
          ? "shipment_in_transit"
          : "shipment_assigned";

  await db.insert(activityTable).values({
    id: newId("act"),
    type: activityType,
    title: `Shipment ${body.status.replace("_", " ")}`,
    description: `Tracking ${s.trackingNumber}${order ? ` for order ${order.orderNumber}` : ""}`,
    ownerId: s.transporterId,
    counterpartId: order?.shopkeeperId ?? null,
    relatedId: shipmentId,
  });

  const [updated] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  const [transporter] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, s.transporterId))
    .limit(1);
  if (!updated || !transporter || !order) {
    res.status(500).json({ error: "Failed to load shipment" });
    return;
  }
  const data = UpdateShipmentStatusResponse.parse(
    serializeShipment(updated, {
      orderNumber: order.orderNumber,
      transporter,
    }),
  );
  res.json(data);
});

router.post("/shipments/:shipmentId/location", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { shipmentId } = UpdateShipmentLocationParams.parse(req.params);
  const body = UpdateShipmentLocationBody.parse(req.body);
  const [s] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const u = req.user;
  if (u.role !== "admin" && !(u.role === "transporter" && s.transporterId === u.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db
    .update(shipmentsTable)
    .set({ currentLat: body.lat, currentLng: body.lng, lastLocationAt: new Date() })
    .where(eq(shipmentsTable.id, shipmentId));
  const [updated] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId))
    .limit(1);
  const [o] = await db
    .select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(eq(ordersTable.id, s.orderId))
    .limit(1);
  const [t] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, s.transporterId))
    .limit(1);
  if (!updated || !o || !t) {
    res.status(500).json({ error: "Failed to load shipment" });
    return;
  }
  const data = UpdateShipmentLocationResponse.parse(
    serializeShipment(updated, { orderNumber: o.orderNumber, transporter: t }),
  );
  res.json(data);
});

export default router;
