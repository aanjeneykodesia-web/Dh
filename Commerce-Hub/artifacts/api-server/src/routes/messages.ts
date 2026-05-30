import { Router, type IRouter } from "express";
import {
  ListOrderMessagesParams,
  ListOrderMessagesResponse,
  SendOrderMessageParams,
  SendOrderMessageBody,
  SendOrderMessageResponse,
} from "@workspace/api-zod";
import {
  db,
  messagesTable,
  ordersTable,
  usersTable,
  type MessageRow,
  type UserRow,
} from "@workspace/db";
import { asc, eq, inArray } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

function canAccessOrder(user: UserRow, order: typeof ordersTable.$inferSelect) {
  if (user.role === "admin") return true;
  if (user.id === order.shopkeeperId) return true;
  if (user.id === order.manufacturerId) return true;
  return false;
}

async function userIsTransporterOnOrder(
  userId: string,
  orderId: string,
): Promise<boolean> {
  const { shipmentsTable } = await import("@workspace/db");
  const rows = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.orderId, orderId))
    .limit(1);
  return rows[0]?.transporterId === userId;
}

function serialize(m: MessageRow, sender: UserRow) {
  return {
    id: m.id,
    orderId: m.orderId,
    senderId: m.senderId,
    senderName: sender.name,
    senderCompany: sender.companyName,
    senderRole: sender.role,
    body: m.body,
    createdAt: m.createdAt,
  };
}

router.get("/orders/:orderId/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { orderId } = ListOrderMessagesParams.parse(req.params);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const allowed =
    canAccessOrder(req.user, order) ||
    (req.user.role === "transporter" &&
      (await userIsTransporterOnOrder(req.user.id, orderId)));
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.orderId, orderId))
    .orderBy(asc(messagesTable.createdAt));

  const senderIds = Array.from(new Set(rows.map((r) => r.senderId)));
  const senders = senderIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, senderIds))
    : [];
  const senderMap = new Map(senders.map((u) => [u.id, u]));

  const data = ListOrderMessagesResponse.parse(
    rows
      .map((m) => {
        const sender = senderMap.get(m.senderId);
        return sender ? serialize(m, sender) : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  );
  res.json(data);
});

router.post("/orders/:orderId/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { orderId } = SendOrderMessageParams.parse(req.params);
  const body = SendOrderMessageBody.parse(req.body);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const allowed =
    canAccessOrder(req.user, order) ||
    (req.user.role === "transporter" &&
      (await userIsTransporterOnOrder(req.user.id, orderId)));
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = newId("msg");
  await db.insert(messagesTable).values({
    id,
    orderId,
    senderId: req.user.id,
    body: body.body.trim(),
  });
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id))
    .limit(1);
  if (!row) {
    res.status(500).json({ error: "Failed to send message" });
    return;
  }
  const data = SendOrderMessageResponse.parse(serialize(row, req.user));
  res.json(data);
});

export default router;
