# Inventory Management

`stock_quantity` is physical available-for-sale stock after checkout reservation. Active `inventory_reservations` are displayed separately and are excluded from available-stock reporting. Each administrator correction is a PostgreSQL transaction that updates stock, creates an inventory movement, and appends an audit event.

Low stock is determined per variant using `low_stock_threshold`, defaulting to 10. Stock cannot become negative. Only released/expired payment reservations restore stock; consumed reservations remain historical.
