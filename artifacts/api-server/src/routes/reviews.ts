import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { reviewsTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { parseAdminToken } from "../lib/auth";

const router = Router();

const SubmitReviewBody = z.object({
  orderNumber: z.string().min(1),
  customerName: z.string().min(2),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(5).max(1000),
  photoUrl: z.string().url().optional(),
});

const UpdateReviewStatusBody = z.object({
  status: z.enum(["approved", "rejected"]),
});

function formatReview(r: any) {
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    customerName: r.customerName,
    district: r.district,
    cardType: r.cardType,
    rating: r.rating,
    quote: r.quote,
    photoUrl: r.photoUrl ?? null,
    status: r.status,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

// GET /reviews — public list of approved reviews
router.get("/reviews", async (req: Request, res: Response) => {
  try {
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "approved"))
      .orderBy(desc(reviewsTable.createdAt));
    res.json(reviews.map(formatReview));
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Failed to list reviews" });
  }
});

// POST /reviews — customer submits a review (must match a dispatched/delivered order)
router.post("/reviews", async (req: Request, res: Response) => {
  try {
    const body = SubmitReviewBody.parse(req.body);

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, body.orderNumber))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.status !== "dispatched" && order.status !== "delivered") {
      res.status(400).json({ error: "Reviews can only be submitted for dispatched or delivered orders" });
      return;
    }

    await db.insert(reviewsTable).values({
      orderNumber: body.orderNumber,
      customerName: body.customerName,
      district: order.district,
      cardType: order.cardType,
      rating: body.rating,
      quote: body.quote,
      photoUrl: body.photoUrl ?? null,
    });

    const [review] = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.orderNumber, body.orderNumber))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(1);

    if (!review) {
      res.status(500).json({ error: "Failed to create review" });
      return;
    }

    res.status(201).json(formatReview(review));
  } catch (err) {
    req.log.error({ err }, "Failed to submit review");
    res.status(400).json({ error: "Invalid review data" });
  }
});

// GET /admin/reviews — admin list all reviews with optional status filter
router.get("/admin/reviews", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const statusParam = req.query.status as string | undefined;
    const validStatuses = ["pending", "approved", "rejected"];

    const query = db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
    const reviews = statusParam && validStatuses.includes(statusParam)
      ? await db.select().from(reviewsTable).where(eq(reviewsTable.status, statusParam as any)).orderBy(desc(reviewsTable.createdAt))
      : await query;

    res.json(reviews.map(formatReview));
  } catch (err) {
    req.log.error({ err }, "Failed to list admin reviews");
    res.status(500).json({ error: "Failed to list reviews" });
  }
});

// PATCH /admin/reviews/:id — approve or reject a review
router.patch("/admin/reviews/:id", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }

    const body = UpdateReviewStatusBody.parse(req.body);

    await db
      .update(reviewsTable)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(reviewsTable.id, id));

    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }

    res.json(formatReview(review));
  } catch (err) {
    req.log.error({ err }, "Failed to update review status");
    res.status(400).json({ error: "Failed to update review" });
  }
});

export default router;
