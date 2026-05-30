import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetTopProductsResponse,
  GetAdminOverviewResponse,
} from "@workspace/api-zod";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  shipmentsTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

const router: IRouter = Router();

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

router.get("/dashboard/summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const u = req.user;
  const stats: { label: string; value: string; sublabel?: string | null }[] = [];

  if (u.role === "shopkeeper") {
    const ord = await db
      .select({
        c: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.shopkeeperId, u.id));
    const pending = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(eq(ordersTable.shopkeeperId, u.id), eq(ordersTable.status, "pending")));
    const inTransit = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(eq(ordersTable.shopkeeperId, u.id), eq(ordersTable.status, "in_transit")));
    const delivered = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(eq(ordersTable.shopkeeperId, u.id), eq(ordersTable.status, "delivered")));
    stats.push(
      { label: "Total orders", value: String(ord[0]?.c ?? 0) },
      { label: "Total spend", value: fmtMoney(ord[0]?.total ?? 0) },
      { label: "Pending", value: String(pending[0]?.c ?? 0), sublabel: "awaiting acceptance" },
      { label: "In transit", value: String(inTransit[0]?.c ?? 0) },
      { label: "Delivered", value: String(delivered[0]?.c ?? 0) },
    );
  } else if (u.role === "manufacturer") {
    const products = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(eq(productsTable.manufacturerId, u.id));
    const ord = await db
      .select({
        c: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.manufacturerId, u.id));
    const pending = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(eq(ordersTable.manufacturerId, u.id), eq(ordersTable.status, "pending")));
    const accepted = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(eq(ordersTable.manufacturerId, u.id), eq(ordersTable.status, "accepted")));
    stats.push(
      { label: "Products listed", value: String(products[0]?.c ?? 0) },
      { label: "Orders received", value: String(ord[0]?.c ?? 0) },
      { label: "Revenue", value: fmtMoney(ord[0]?.total ?? 0) },
      { label: "Pending review", value: String(pending[0]?.c ?? 0), sublabel: "needs decision" },
      { label: "Awaiting dispatch", value: String(accepted[0]?.c ?? 0), sublabel: "assign transporter" },
    );
  } else if (u.role === "transporter") {
    const total = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.transporterId, u.id));
    const assigned = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.transporterId, u.id), eq(shipmentsTable.status, "assigned")));
    const inTransit = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(shipmentsTable)
      .where(
        and(
          eq(shipmentsTable.transporterId, u.id),
          or(
            eq(shipmentsTable.status, "picked_up"),
            eq(shipmentsTable.status, "in_transit"),
          )!,
        ),
      );
    const delivered = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.transporterId, u.id), eq(shipmentsTable.status, "delivered")));
    stats.push(
      { label: "Total shipments", value: String(total[0]?.c ?? 0) },
      { label: "Awaiting pickup", value: String(assigned[0]?.c ?? 0), sublabel: "ready to collect" },
      { label: "On the road", value: String(inTransit[0]?.c ?? 0) },
      { label: "Delivered", value: String(delivered[0]?.c ?? 0), sublabel: "completed runs" },
    );
  } else if (u.role === "admin") {
    const users = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(usersTable);
    const products = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(productsTable);
    const orders = await db
      .select({
        c: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
      })
      .from(ordersTable);
    const shipments = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(shipmentsTable);
    stats.push(
      { label: "Users", value: String(users[0]?.c ?? 0) },
      { label: "Products", value: String(products[0]?.c ?? 0) },
      { label: "Orders", value: String(orders[0]?.c ?? 0) },
      { label: "Shipments", value: String(shipments[0]?.c ?? 0) },
      { label: "GMV", value: fmtMoney(orders[0]?.total ?? 0), sublabel: "all-time" },
    );
  }

  const data = GetDashboardSummaryResponse.parse({ role: u.role, stats });
  res.json(data);
});

router.get("/dashboard/activity", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json([]);
    return;
  }
  const u = req.user;
  let rows;
  if (u.role === "admin") {
    rows = await db
      .select()
      .from(activityTable)
      .orderBy(desc(activityTable.createdAt))
      .limit(20);
  } else {
    rows = await db
      .select()
      .from(activityTable)
      .where(
        or(
          eq(activityTable.ownerId, u.id),
          eq(activityTable.counterpartId, u.id),
        ),
      )
      .orderBy(desc(activityTable.createdAt))
      .limit(20);
  }
  const data = GetRecentActivityResponse.parse(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      timestamp: r.createdAt,
      relatedId: r.relatedId,
    })),
  );
  res.json(data);
});

router.get("/dashboard/top-products", async (req, res) => {
  // Aggregate by orderItem
  const rows = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      manufacturerId: productsTable.manufacturerId,
      imageUrl: productsTable.imageUrl,
      unitsSold: sql<number>`sum(${orderItemsTable.quantity})::int`,
      revenue: sql<number>`coalesce(sum(${orderItemsTable.lineTotal}), 0)::float`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .where(
      req.user?.role === "manufacturer"
        ? eq(productsTable.manufacturerId, req.user.id)
        : undefined,
    )
    .groupBy(
      orderItemsTable.productId,
      orderItemsTable.productName,
      productsTable.manufacturerId,
      productsTable.imageUrl,
    )
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
    .limit(8);

  const manufacturerIds = Array.from(new Set(rows.map((r) => r.manufacturerId)));
  const manufacturers = manufacturerIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, manufacturerIds))
    : [];
  const mMap = new Map(manufacturers.map((m) => [m.id, m]));

  const data = GetTopProductsResponse.parse(
    rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      manufacturerName: mMap.get(r.manufacturerId)?.companyName ?? "",
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      imageUrl: r.imageUrl,
    })),
  );
  res.json(data);
});

router.get("/dashboard/admin-overview", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const [users] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(usersTable);
  const [products] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable);
  const [orders] = await db
    .select({
      c: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
    })
    .from(ordersTable);
  const [shipments] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(shipmentsTable);

  const ordersByStatus = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const usersByRole = await db
    .select({
      role: usersTable.role,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .groupBy(usersTable.role);

  const revenueByCategory = await db
    .select({
      category: productsTable.category,
      revenue: sql<number>`coalesce(sum(${orderItemsTable.lineTotal}), 0)::float`,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .groupBy(productsTable.category)
    .orderBy(desc(sql`coalesce(sum(${orderItemsTable.lineTotal}), 0)`));

  const data = GetAdminOverviewResponse.parse({
    totals: {
      users: users?.c ?? 0,
      products: products?.c ?? 0,
      orders: orders?.c ?? 0,
      shipments: shipments?.c ?? 0,
      revenue: orders?.total ?? 0,
    },
    ordersByStatus: ordersByStatus.map((r) => ({ status: r.status, count: r.count })),
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r.count })),
    revenueByCategory,
  });
  res.json(data);
});

export default router;
