-- Synthetic fixtures, applied only to the runner's disposable database.
INSERT INTO categories (_pk_category_id, category_name, slug) VALUES ('feature-category', 'Test', 'test');
INSERT INTO colors (name, hex_code) VALUES ('Black', '#000000');
INSERT INTO sizes (label, sort_order) VALUES ('M', 0);
INSERT INTO products (_pk_product_id, slug, product_name, _fk_category_id, base_price)
VALUES ('feature-product', 'feature-product', 'Feature shirt', 'feature-category', 100);
INSERT INTO product_variants (_pk_product_variant_id, _fk_product_id, _fk_size_id, _fk_color_id, sku, stock_quantity)
SELECT 'feature-variant', 'feature-product', s._pk_size_id, c._pk_color_id, 'FEATURE', 10 FROM sizes s CROSS JOIN colors c LIMIT 1;
INSERT INTO addresses (_pk_address_id, recipient_name, phone, line1, barangay, city, province, postal_code, is_default, address_type)
VALUES ('feature-address', 'Test Customer', '000000000', 'Test', 'Test', 'Manila', 'Metro Manila', '1000', false, 0);
INSERT INTO orders (_pk_order_id, status, order_number, _fk_user_id, _fk_shipping_address_id, subtotal, discount_amount, shipping_fee, total_amount)
SELECT 'feature-order', 4, 'FEATURE-DELIVERED', _pk_user_id, 'feature-address', 100, 0, 0, 100 FROM users LIMIT 1;
INSERT INTO order_items (_pk_order_item_id, _fk_order_id, _fk_product_variant_id, product_name, sku, size_label, color_name, unit_price, quantity, line_total)
VALUES ('feature-item', 'feature-order', 'feature-variant', 'Feature shirt', 'FEATURE', 'M', 'Black', 100, 1, 100);
