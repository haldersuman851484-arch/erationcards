import { db, ordersTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "./email";

type Log = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

/** Minimal order shape the finalizer needs (a full row also satisfies it). */
export interface FinalizableOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  amount: string | number;
  quantity: number;
  paymentStatus: string;
  confirmationEmailSentAt: Date | null;
}

/**
 * Marks a paid order as submitted and sends the order-number confirmation
 * email. Since the order wizard became 3 steps (payment is the last step),
 * payment confirmation IS the completion event, so every place that flips
 * paymentStatus to "paid" calls this.
 *
 * Idempotent: `submittedAt` is claimed atomically, so concurrent callers
 * (status poll + webhook + legacy submit endpoint) send at most one email.
 * Never throws — completion must not be lost because an email failed.
 */
export async function finalizeOrderOnPayment(
  order: FinalizableOrder,
  log: Log,
): Promise<{ emailSent: boolean }> {
  try {
    const [claim] = await db
      .update(ordersTable)
      .set({ submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.submittedAt)));
    if (claim.affectedRows === 0) {
      // Another caller won the claim — our `order` row is stale, so re-read
      // the email outcome (the winner may have just sent it).
      const [fresh] = await db
        .select({ confirmationEmailSentAt: ordersTable.confirmationEmailSentAt })
        .from(ordersTable)
        .where(eq(ordersTable.id, order.id))
        .limit(1);
      return { emailSent: (fresh?.confirmationEmailSentAt ?? order.confirmationEmailSentAt) != null };
    }

    if (!order.customerEmail) {
      log.warn({ orderNumber: order.orderNumber }, "Order finalized without customerEmail; skipping email");
      return { emailSent: false };
    }

    const emailSent = await sendOrderConfirmationEmail(
      {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        amount: String(order.amount),
        quantity: order.quantity,
        paymentReceived: true,
      },
      log,
    );
    if (emailSent) {
      await db
        .update(ordersTable)
        .set({ confirmationEmailSentAt: new Date() })
        .where(eq(ordersTable.id, order.id));
    }
    return { emailSent };
  } catch (err) {
    log.error({ err, orderNumber: order.orderNumber }, "Failed to finalize order after payment");
    return { emailSent: false };
  }
}
