USE ecommerce;

ALTER TABLE users
    ADD COLUMN role
        ENUM('admin', 'customer') NOT NULL DEFAULT 'customer';