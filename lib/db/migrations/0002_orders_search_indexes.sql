-- Improve admin search and listing performance on the orders table.
--
-- 1. FULLTEXT index on the three columns queried by /orders?search=...
--    The route uses MATCH ... AGAINST in boolean mode, which this index
--    accelerates. A leading-wildcard LIKE ('%term%') cannot use a B-tree
--    index, so FULLTEXT is the correct choice for arbitrary-substring search.
--
-- 2. B-tree index on created_at to speed up the ORDER BY desc(created_at)
--    that is emitted on every listing query (searched or not).

ALTER TABLE `orders` ADD FULLTEXT INDEX `orders_search_ft` (`customer_name`, `customer_phone`, `order_number`);
--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);
