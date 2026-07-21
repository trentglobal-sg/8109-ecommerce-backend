USE ecommerce;

ALTER TABLE products
  ADD COLUMN stock INT UNSIGNED NOT NULL DEFAULT 0 AFTER price;

-- Seed stock levels for the existing catalog
UPDATE products SET stock = 25 WHERE id = 1;
UPDATE products SET stock = 80 WHERE id = 2;
UPDATE products SET stock = 60 WHERE id = 3;
UPDATE products SET stock = 15 WHERE id = 4;
UPDATE products SET stock = 40 WHERE id = 5;
UPDATE products SET stock = 55 WHERE id = 6;
UPDATE products SET stock = 70 WHERE id = 7;
UPDATE products SET stock = 35 WHERE id = 8;
UPDATE products SET stock = 10 WHERE id = 9;
UPDATE products SET stock = 45 WHERE id = 10;
UPDATE products SET stock = 20 WHERE id = 11;
UPDATE products SET stock = 65 WHERE id = 12;
UPDATE products SET stock = 8 WHERE id = 13;
UPDATE products SET stock = 90 WHERE id = 14;
UPDATE products SET stock = 30 WHERE id = 15;
UPDATE products SET stock = 0 WHERE id = 16;
