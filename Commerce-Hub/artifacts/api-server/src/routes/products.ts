import { Router, type IRouter } from "express";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  ListProductCategoriesResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  SetProductPlatformPriceParams,
  SetProductPlatformPriceBody,
  SetProductPlatformPriceResponse,
} from "@workspace/api-zod";
import {
  db,
  productsTable,
  usersTable,
  activityTable,
  type ProductRow,
  type UserRow,
} from "@workspace/db";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

function serialize(p: ProductRow, manufacturerName: string) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    unit: p.unit,
    pricePerUnit: Number(p.pricePerUnit),
    platformPrice: p.platformPrice != null ? Number(p.platformPrice) : null,
    minOrderQty: p.minOrderQty,
    stockQty: p.stockQty,
    imageUrl: p.imageUrl,
    manufacturerId: p.manufacturerId,
    manufacturerName,
    createdAt: p.createdAt,
  };
}

router.get("/products", async (req, res) => {
  const params = ListProductsQueryParams.parse(req.query);
  const conditions = [];
  if (params.search)
    conditions.push(ilike(productsTable.name, `%${params.search}%`));
  if (params.category)
    conditions.push(eq(productsTable.category, params.category));
  if (params.manufacturerId)
    conditions.push(eq(productsTable.manufacturerId, params.manufacturerId));

  // Manufacturers see only their own products by default
  if (req.user?.role === "manufacturer") {
    conditions.push(eq(productsTable.manufacturerId, req.user.id));
  }

  const rows = await db
    .select({ p: productsTable, m: usersTable })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.manufacturerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.createdAt));

  const data = ListProductsResponse.parse(
    rows.map((r) => serialize(r.p, r.m.companyName)),
  );
  res.json(data);
});

router.get("/products/categories", async (_req, res) => {
  const rows = await db
    .select({
      category: productsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(productsTable)
    .groupBy(productsTable.category)
    .orderBy(productsTable.category);
  const data = ListProductCategoriesResponse.parse(rows);
  res.json(data);
});

router.post("/products", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user: UserRow = req.user;
  if (user.role !== "manufacturer" && user.role !== "admin") {
    res.status(403).json({ error: "Only manufacturers can create products" });
    return;
  }
  const body = CreateProductBody.parse(req.body);
  const id = newId("prod");
  await db.insert(productsTable).values({
    id,
    name: body.name,
    description: body.description,
    category: body.category,
    unit: body.unit,
    pricePerUnit: body.pricePerUnit.toString(),
    minOrderQty: body.minOrderQty,
    stockQty: body.stockQty,
    imageUrl: body.imageUrl ?? null,
    manufacturerId: user.id,
  });
  await db.insert(activityTable).values({
    id: newId("act"),
    type: "product_created",
    title: "New product listed",
    description: `${user.companyName} listed ${body.name}`,
    ownerId: user.id,
    relatedId: id,
  });
  const [row] = await db
    .select({ p: productsTable, m: usersTable })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.manufacturerId))
    .where(eq(productsTable.id, id))
    .limit(1);
  if (!row) {
    res.status(500).json({ error: "Product creation failed" });
    return;
  }
  const data = CreateProductResponse.parse(serialize(row.p, row.m.companyName));
  res.json(data);
});

router.get("/products/:productId", async (req, res) => {
  const { productId } = GetProductParams.parse(req.params);
  const [row] = await db
    .select({ p: productsTable, m: usersTable })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.manufacturerId))
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data = GetProductResponse.parse(serialize(row.p, row.m.companyName));
  res.json(data);
});

router.patch("/products/:productId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { productId } = UpdateProductParams.parse(req.params);
  const body = UpdateProductBody.parse(req.body);
  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "manufacturer" && existing.manufacturerId === req.user.id)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const update: Partial<typeof productsTable.$inferInsert> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.category !== undefined) update.category = body.category;
  if (body.unit !== undefined) update.unit = body.unit;
  if (body.pricePerUnit !== undefined)
    update.pricePerUnit = body.pricePerUnit.toString();
  if (body.minOrderQty !== undefined) update.minOrderQty = body.minOrderQty;
  if (body.stockQty !== undefined) update.stockQty = body.stockQty;
  if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl;
  if (Object.keys(update).length > 0) {
    await db.update(productsTable).set(update).where(eq(productsTable.id, productId));
  }
  const [row] = await db
    .select({ p: productsTable, m: usersTable })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.manufacturerId))
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data = UpdateProductResponse.parse(serialize(row.p, row.m.companyName));
  res.json(data);
});

router.patch("/products/:productId/platform-price", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const { productId } = SetProductPlatformPriceParams.parse(req.params);
  const body = SetProductPlatformPriceBody.parse(req.body);
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await db
    .update(productsTable)
    .set({ platformPrice: body.platformPrice != null ? body.platformPrice.toString() : null })
    .where(eq(productsTable.id, productId));
  const [row] = await db
    .select({ p: productsTable, m: usersTable })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.manufacturerId))
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data = SetProductPlatformPriceResponse.parse(serialize(row.p, row.m.companyName));
  res.json(data);
});

router.delete("/products/:productId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { productId } = DeleteProductParams.parse(req.params);
  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "manufacturer" && existing.manufacturerId === req.user.id)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, productId));
  res.json({ success: true });
});

export default router;
