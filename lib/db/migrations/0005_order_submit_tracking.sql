-- Final-submit tracking for orders (email-the-order-number feature):
--   submitted_at: set once when the customer finishes the order wizard
--                 (Submit after PDF uploads). Idempotency guard so the
--                 confirmation email is attempted at most once per order.
--   confirmation_email_sent_at: set only when the confirmation email
--                 actually went out, so replayed submits report an
--                 accurate emailSent flag.
-- Keep both additions in this single ALTER TABLE statement: the mysql2
-- migration runner does not permit multiple SQL statements in one query.
ALTER TABLE `orders`
  ADD COLUMN `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `confirmation_email_sent_at` TIMESTAMP NULL DEFAULT NULL;
