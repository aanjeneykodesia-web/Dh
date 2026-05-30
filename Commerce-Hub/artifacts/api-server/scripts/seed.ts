import bcrypt from "bcryptjs";
import {
  db,
  pool,
  usersTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  shipmentsTable,
  activityTable,
  sessionsTable,
} from "@workspace/db";

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(activityTable);
  await db.delete(sessionsTable);
  await db.delete(shipmentsTable);
  await db.delete(orderItemsTable);
  await db.delete(ordersTable);
  await db.delete(productsTable);
  await db.delete(usersTable);

  console.log("Seeding users...");
  const demoPasswordHash = await bcrypt.hash("demo1234", 10);
  const rawUsers = [
    {
      id: "user_shop_kavya",
      name: "Kavya Reddy",
      email: "kavya@brightside.demo",
      role: "shopkeeper" as const,
      companyName: "Brightside General Store",
      description: "Family-run retail store stocking household essentials, snacks, and packaged goods.",
      phone: "+14155550142",
      city: "San Francisco, CA",
      avatarUrl: null,
    },
    {
      id: "user_shop_marcus",
      name: "Marcus Chen",
      email: "marcus@cornermart.demo",
      role: "shopkeeper" as const,
      companyName: "Corner Mart Express",
      description: "Convenience chain across the Bay Area focused on grab-and-go beverages and snacks.",
      phone: "+14155550188",
      city: "Oakland, CA",
      avatarUrl: null,
    },
    {
      id: "user_mfg_aurora",
      name: "Priya Sharma",
      email: "priya@aurorafoods.demo",
      role: "manufacturer" as const,
      companyName: "Aurora Foods",
      description: "Producer of organic beverages, dairy, and pantry staples since 2014.",
      phone: "+14085550231",
      city: "San Jose, CA",
      avatarUrl: null,
    },
    {
      id: "user_mfg_summit",
      name: "Daniel Okafor",
      email: "daniel@summitgoods.demo",
      role: "manufacturer" as const,
      companyName: "Summit Goods Co.",
      description: "Personal care, cleaning supplies, and household paper products.",
      phone: "+15105550399",
      city: "Berkeley, CA",
      avatarUrl: null,
    },
    {
      id: "user_trans_swift",
      name: "Riya Patel",
      email: "riya@swiftroute.demo",
      role: "transporter" as const,
      companyName: "Swift Route Logistics",
      description: "Same-day and next-day regional freight across Northern California.",
      phone: "+16505550117",
      city: "Fremont, CA",
      avatarUrl: null,
    },
    {
      id: "user_trans_haul",
      name: "Carlos Rivera",
      email: "carlos@hauline.demo",
      role: "transporter" as const,
      companyName: "Haul Line Freight",
      description: "Refrigerated and dry-van long-haul carrier serving the West Coast.",
      phone: "+17075550264",
      city: "Sacramento, CA",
      avatarUrl: null,
    },
    {
      id: "user_admin_root",
      name: "Alex Morgan",
      email: "alex@traderoute.demo",
      role: "admin" as const,
      companyName: "TradeRoute Operations",
      description: "Platform administrator with full visibility across the marketplace.",
      phone: "+14155550001",
      city: "San Francisco, CA",
      avatarUrl: null,
    },
  ];
  const users = rawUsers.map((u) => ({ ...u, phoneNumber: u.phone, passwordHash: demoPasswordHash }));
  await db.insert(usersTable).values(users);

  console.log("Seeding products...");
  const products = [
    {
      id: "prod_aurora_001",
      name: "Cold-Pressed Orange Juice 1L",
      description: "Single-origin Valencia oranges, never from concentrate. 12-bottle case.",
      category: "Beverages",
      unit: "case",
      pricePerUnit: "42.00",
      minOrderQty: 5,
      stockQty: 240,
      imageUrl: null,
      manufacturerId: "user_mfg_aurora",
    },
    {
      id: "prod_aurora_002",
      name: "Sparkling Mineral Water 500ml",
      description: "Naturally carbonated spring water sourced from Mt. Shasta. 24-bottle case.",
      category: "Beverages",
      unit: "case",
      pricePerUnit: "28.50",
      minOrderQty: 4,
      stockQty: 480,
      imageUrl: null,
      manufacturerId: "user_mfg_aurora",
    },
    {
      id: "prod_aurora_003",
      name: "Organic Whole Milk 1 Gallon",
      description: "Grass-fed, non-GMO whole milk from family farms. 4-gallon case, refrigerated.",
      category: "Dairy",
      unit: "case",
      pricePerUnit: "36.00",
      minOrderQty: 6,
      stockQty: 120,
      imageUrl: null,
      manufacturerId: "user_mfg_aurora",
    },
    {
      id: "prod_aurora_004",
      name: "Artisan Sourdough Crackers 200g",
      description: "Slow-fermented sourdough crackers with sea salt. 16-pack case.",
      category: "Snacks",
      unit: "case",
      pricePerUnit: "32.00",
      minOrderQty: 4,
      stockQty: 200,
      imageUrl: null,
      manufacturerId: "user_mfg_aurora",
    },
    {
      id: "prod_aurora_005",
      name: "Premium Granola Bars 50g",
      description: "Oat, honey, and almond granola bars. Individually wrapped, 36-bar case.",
      category: "Snacks",
      unit: "case",
      pricePerUnit: "39.00",
      minOrderQty: 4,
      stockQty: 320,
      imageUrl: null,
      manufacturerId: "user_mfg_aurora",
    },
    {
      id: "prod_summit_001",
      name: "Plant-Based Dish Soap 750ml",
      description: "Biodegradable, fragrance-free dish soap. 12-bottle case.",
      category: "Cleaning",
      unit: "case",
      pricePerUnit: "44.00",
      minOrderQty: 4,
      stockQty: 180,
      imageUrl: null,
      manufacturerId: "user_mfg_summit",
    },
    {
      id: "prod_summit_002",
      name: "Bamboo Toilet Tissue 12-roll",
      description: "100% bamboo, 3-ply toilet tissue. 8-pack case (96 rolls).",
      category: "Paper Goods",
      unit: "case",
      pricePerUnit: "58.00",
      minOrderQty: 3,
      stockQty: 90,
      imageUrl: null,
      manufacturerId: "user_mfg_summit",
    },
    {
      id: "prod_summit_003",
      name: "Natural Hand Soap Refill 2L",
      description: "Lavender and chamomile hand soap refill pouch. 6-pouch case.",
      category: "Personal Care",
      unit: "case",
      pricePerUnit: "48.00",
      minOrderQty: 3,
      stockQty: 110,
      imageUrl: null,
      manufacturerId: "user_mfg_summit",
    },
    {
      id: "prod_summit_004",
      name: "Multi-Surface Spray Cleaner 1L",
      description: "Streak-free citrus multi-surface cleaner. 12-bottle case.",
      category: "Cleaning",
      unit: "case",
      pricePerUnit: "38.00",
      minOrderQty: 4,
      stockQty: 160,
      imageUrl: null,
      manufacturerId: "user_mfg_summit",
    },
    {
      id: "prod_summit_005",
      name: "Cotton Kitchen Towels 6-pack",
      description: "Absorbent organic cotton kitchen towels. 12-pack case (72 towels).",
      category: "Paper Goods",
      unit: "case",
      pricePerUnit: "52.00",
      minOrderQty: 2,
      stockQty: 60,
      imageUrl: null,
      manufacturerId: "user_mfg_summit",
    },
  ];
  await db.insert(productsTable).values(products);

  console.log("Seeding orders & shipments...");
  // Order 1: pending (Brightside ordering Aurora juices)
  await db.insert(ordersTable).values({
    id: "ord_demo_001",
    orderNumber: "ORD-DEMO-0001",
    status: "pending",
    shopkeeperId: "user_shop_kavya",
    manufacturerId: "user_mfg_aurora",
    totalAmount: "210.00",
    shippingAddress: "Brightside General Store, 1480 Haight St, San Francisco, CA 94117",
    notes: "Please deliver before 10am for the morning rush.",
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_001a",
      orderId: "ord_demo_001",
      productId: "prod_aurora_001",
      productName: "Cold-Pressed Orange Juice 1L",
      quantity: 5,
      pricePerUnit: "42.00",
      lineTotal: "210.00",
    },
  ]);

  // Order 2: accepted (Corner Mart from Aurora, awaiting transporter assignment)
  await db.insert(ordersTable).values({
    id: "ord_demo_002",
    orderNumber: "ORD-DEMO-0002",
    status: "accepted",
    shopkeeperId: "user_shop_marcus",
    manufacturerId: "user_mfg_aurora",
    totalAmount: "256.50",
    shippingAddress: "Corner Mart Express, 2200 Broadway, Oakland, CA 94612",
    notes: null,
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_002a",
      orderId: "ord_demo_002",
      productId: "prod_aurora_002",
      productName: "Sparkling Mineral Water 500ml",
      quantity: 9,
      pricePerUnit: "28.50",
      lineTotal: "256.50",
    },
  ]);

  // Order 3: in_transit (Brightside from Summit, has shipment with Swift Route)
  await db.insert(ordersTable).values({
    id: "ord_demo_003",
    orderNumber: "ORD-DEMO-0003",
    status: "in_transit",
    shopkeeperId: "user_shop_kavya",
    manufacturerId: "user_mfg_summit",
    totalAmount: "328.00",
    shippingAddress: "Brightside General Store, 1480 Haight St, San Francisco, CA 94117",
    notes: "Loading dock available at side entrance.",
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_003a",
      orderId: "ord_demo_003",
      productId: "prod_summit_001",
      productName: "Plant-Based Dish Soap 750ml",
      quantity: 4,
      pricePerUnit: "44.00",
      lineTotal: "176.00",
    },
    {
      id: "oi_demo_003b",
      orderId: "ord_demo_003",
      productId: "prod_summit_004",
      productName: "Multi-Surface Spray Cleaner 1L",
      quantity: 4,
      pricePerUnit: "38.00",
      lineTotal: "152.00",
    },
  ]);

  await db.insert(shipmentsTable).values({
    id: "shp_demo_001",
    trackingNumber: "TR-DEMO-0001",
    status: "in_transit",
    orderId: "ord_demo_003",
    transporterId: "user_trans_swift",
    originAddress: "Summit Goods Co., 2401 Eighth St, Berkeley, CA 94710",
    destinationAddress: "Brightside General Store, 1480 Haight St, San Francisco, CA 94117",
    pickupDate: new Date(Date.now() - 1000 * 60 * 60 * 6),
    deliveredAt: null,
    notes: "Driver en route via I-80 / Bay Bridge.",
    pickupPin: "483921",
    deliveryPin: "726104",
  });

  // Order 4: delivered (Corner Mart from Summit, completed shipment with Haul Line)
  await db.insert(ordersTable).values({
    id: "ord_demo_004",
    orderNumber: "ORD-DEMO-0004",
    status: "delivered",
    shopkeeperId: "user_shop_marcus",
    manufacturerId: "user_mfg_summit",
    totalAmount: "464.00",
    shippingAddress: "Corner Mart Express, 2200 Broadway, Oakland, CA 94612",
    notes: null,
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_004a",
      orderId: "ord_demo_004",
      productId: "prod_summit_002",
      productName: "Bamboo Toilet Tissue 12-roll",
      quantity: 4,
      pricePerUnit: "58.00",
      lineTotal: "232.00",
    },
    {
      id: "oi_demo_004b",
      orderId: "ord_demo_004",
      productId: "prod_summit_003",
      productName: "Natural Hand Soap Refill 2L",
      quantity: 4,
      pricePerUnit: "48.00",
      lineTotal: "192.00",
    },
    {
      id: "oi_demo_004c",
      orderId: "ord_demo_004",
      productId: "prod_summit_005",
      productName: "Cotton Kitchen Towels 6-pack",
      quantity: 1,
      pricePerUnit: "52.00",
      lineTotal: "52.00",
    },
  ]);
  await db.insert(shipmentsTable).values({
    id: "shp_demo_002",
    trackingNumber: "TR-DEMO-0002",
    status: "delivered",
    orderId: "ord_demo_004",
    transporterId: "user_trans_haul",
    originAddress: "Summit Goods Co., 2401 Eighth St, Berkeley, CA 94710",
    destinationAddress: "Corner Mart Express, 2200 Broadway, Oakland, CA 94612",
    pickupDate: new Date(Date.now() - 1000 * 60 * 60 * 48),
    deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    notes: "Signed for by store manager.",
    pickupPin: "315872",
    deliveryPin: "649038",
  });

  // Order 5: pending for Aurora to review (Brightside ordering snacks)
  await db.insert(ordersTable).values({
    id: "ord_demo_005",
    orderNumber: "ORD-DEMO-0005",
    status: "pending",
    shopkeeperId: "user_shop_kavya",
    manufacturerId: "user_mfg_aurora",
    totalAmount: "284.00",
    shippingAddress: "Brightside General Store, 1480 Haight St, San Francisco, CA 94117",
    notes: "Restocking weekend snack aisle.",
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_005a",
      orderId: "ord_demo_005",
      productId: "prod_aurora_004",
      productName: "Artisan Sourdough Crackers 200g",
      quantity: 4,
      pricePerUnit: "32.00",
      lineTotal: "128.00",
    },
    {
      id: "oi_demo_005b",
      orderId: "ord_demo_005",
      productId: "prod_aurora_005",
      productName: "Premium Granola Bars 50g",
      quantity: 4,
      pricePerUnit: "39.00",
      lineTotal: "156.00",
    },
  ]);

  // Order 6: accepted (Corner Mart from Aurora dairy, ready to assign transporter)
  await db.insert(ordersTable).values({
    id: "ord_demo_006",
    orderNumber: "ORD-DEMO-0006",
    status: "accepted",
    shopkeeperId: "user_shop_marcus",
    manufacturerId: "user_mfg_aurora",
    totalAmount: "216.00",
    shippingAddress: "Corner Mart Express, 2200 Broadway, Oakland, CA 94612",
    notes: "Refrigerated transport required.",
  });
  await db.insert(orderItemsTable).values([
    {
      id: "oi_demo_006a",
      orderId: "ord_demo_006",
      productId: "prod_aurora_003",
      productName: "Organic Whole Milk 1 Gallon",
      quantity: 6,
      pricePerUnit: "36.00",
      lineTotal: "216.00",
    },
  ]);

  console.log("Seeding activity feed...");
  const now = Date.now();
  await db.insert(activityTable).values([
    {
      id: "act_demo_001",
      type: "order_placed",
      title: "Order placed",
      description: "Brightside General Store placed order ORD-DEMO-0001",
      ownerId: "user_shop_kavya",
      counterpartId: "user_mfg_aurora",
      relatedId: "ord_demo_001",
      createdAt: new Date(now - 1000 * 60 * 60 * 2),
    },
    {
      id: "act_demo_002",
      type: "order_accepted",
      title: "Order accepted",
      description: "Aurora Foods accepted order ORD-DEMO-0002",
      ownerId: "user_mfg_aurora",
      counterpartId: "user_shop_marcus",
      relatedId: "ord_demo_002",
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
    {
      id: "act_demo_003",
      type: "shipment_assigned",
      title: "Shipment assigned",
      description: "Swift Route Logistics assigned to order ORD-DEMO-0003",
      ownerId: "user_trans_swift",
      counterpartId: "user_mfg_summit",
      relatedId: "shp_demo_001",
      createdAt: new Date(now - 1000 * 60 * 60 * 8),
    },
    {
      id: "act_demo_004",
      type: "shipment_in_transit",
      title: "Shipment in transit",
      description: "Tracking TR-DEMO-0001 for order ORD-DEMO-0003",
      ownerId: "user_trans_swift",
      counterpartId: "user_shop_kavya",
      relatedId: "shp_demo_001",
      createdAt: new Date(now - 1000 * 60 * 60 * 6),
    },
    {
      id: "act_demo_005",
      type: "shipment_delivered",
      title: "Shipment delivered",
      description: "Tracking TR-DEMO-0002 for order ORD-DEMO-0004",
      ownerId: "user_trans_haul",
      counterpartId: "user_shop_marcus",
      relatedId: "shp_demo_002",
      createdAt: new Date(now - 1000 * 60 * 60 * 36),
    },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
