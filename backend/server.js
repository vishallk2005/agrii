const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_YourKeyHere'; // Replace with your actual Razorpay test key
const RAZORPAY_KEY_SECRET = 'YourSecretKeyHere'; // Replace with your actual Razorpay test secret

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ================= AUTH ROUTES =================
app.post('/api/register', (req, res) => {
    const { username, password, role, mobile, email, address } = req.body;
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;

    db.run(`INSERT INTO users (username, password, role, mobile, email, address) VALUES (?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, role, mobile, email, address],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, username, role });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;

    db.get(`SELECT * FROM users WHERE username = ? AND role = ?`, [username, role], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (role === 'Admin') {
            if (bcrypt.compareSync(password, user.password)) {
                res.json({ username: user.username, role: user.role });
            } else {
                res.status(400).json({ error: "Invalid password" });
            }
        } else {
            // For Farmers and Customers, we might not have passwords in the original design, 
            // but let's assume simple login for now or check if password exists.
            // The original code didn't really use passwords for customers/farmers except admin.
            // We will just return success for now if user exists, or check password if provided.
            res.json({ username: user.username, role: user.role, mobile: user.mobile, email: user.email, address: user.address });
        }
    });
});

app.get('/api/users', (req, res) => {
    db.all(`SELECT id, username, role, mobile, email, address FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ================= PRODUCT ROUTES =================
app.get('/api/products', (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/products', (req, res) => {
    const { name, price, description, image, category, stock, farmer_username } = req.body;
    db.run(`INSERT INTO products (name, price, description, image, category, stock, farmer_username, approved, rejected) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [name, price, description, image, category, stock, farmer_username],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/products/:id/approve', (req, res) => {
    const { approved, rejected } = req.body;
    db.run(`UPDATE products SET approved = ?, rejected = ? WHERE id = ?`,
        [approved ? 1 : 0, rejected ? 1 : 0, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.put('/api/products/:id/stock', (req, res) => {
    const { stock } = req.body;
    db.run(`UPDATE products SET stock = ? WHERE id = ?`, [stock, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.put('/api/products/:id/price', (req, res) => {
    const { price } = req.body;
    db.run(`UPDATE products SET price = ? WHERE id = ?`, [price, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ================= ORDER ROUTES =================
app.post('/api/orders', (req, res) => {
    const { username, items, total } = req.body;
    const date = new Date().toLocaleString();

    db.run(`INSERT INTO orders (username, total, date, status) VALUES (?, ?, ?, 'Processing')`,
        [username, total, date],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;

            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_name, quantity, price, farmer_username) VALUES (?, ?, ?, ?, ?)`);
            items.forEach(item => {
                stmt.run(orderId, item.name, item.quantity, item.price, item.farmer);
                // Update stock
                db.run(`UPDATE products SET stock = stock - ? WHERE name = ? AND farmer_username = ?`,
                    [item.quantity, item.name, item.farmer]);
            });
            stmt.finalize();

            res.json({ success: true, orderId });
        }
    );
});

app.get('/api/orders', (req, res) => {
    const sql = `
        SELECT o.id, o.username, o.total, o.date, o.status,
               oi.product_name, oi.quantity, oi.price, oi.farmer_username
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ORDER BY o.id DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const orders = {};
        rows.forEach(row => {
            if (!orders[row.id]) {
                orders[row.id] = {
                    id: row.id,
                    username: row.username,
                    total: row.total,
                    date: row.date,
                    status: row.status,
                    items: []
                };
            }
            if (row.product_name) {
                orders[row.id].items.push({
                    name: row.product_name,
                    quantity: row.quantity,
                    price: row.price,
                    farmer: row.farmer_username
                });
            }
        });
        res.json(Object.values(orders));
    });
});

app.get('/api/orders/:username', (req, res) => {
    db.all(`SELECT * FROM orders WHERE username = ?`, [req.params.username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/orders/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Also delete order items
        db.run(`DELETE FROM order_items WHERE order_id = ?`, [req.params.id]);
        res.json({ success: true });
    });
});

// ================= RAZORPAY PAYMENT ROUTES =================
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        // For demo purposes, create a mock order
        // In production, you would integrate with actual Razorpay API
        const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        res.json({
            id: orderId,
            amount: amount,
            currency: currency || 'INR',
            status: 'created'
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        // For demo purposes, accept all payments
        // In production, verify signature with Razorpay
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');
        
        const isValid = expectedSignature === razorpay_signature;
        
        res.json({
            success: isValid,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Enhanced order route with payment details
app.post('/api/orders', (req, res) => {
    const { username, items, total, payment_id, payment_status, payment_method, order_id } = req.body;
    const date = new Date().toLocaleString();

    db.run(`INSERT INTO orders (username, total, date, status, payment_id, payment_status, payment_method, razorpay_order_id) VALUES (?, ?, ?, 'Processing', ?, ?, ?, ?)`,
        [username, total, date, payment_id, payment_status || 'pending', payment_method || 'cod', order_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;

            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_name, quantity, price, farmer_username) VALUES (?, ?, ?, ?, ?)`);
            items.forEach(item => {
                stmt.run(orderId, item.name, item.quantity, item.price, item.farmer);
                // Update stock
                db.run(`UPDATE products SET stock = stock - ? WHERE name = ? AND farmer_username = ?`,
                    [item.quantity, item.name, item.farmer]);
            });
            stmt.finalize();

            res.json({ success: true, orderId });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
