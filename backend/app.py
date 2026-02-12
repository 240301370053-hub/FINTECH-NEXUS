from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "agri.db")

# Connect to database
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database
def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            price REAL,
            wholesale_price REAL,
            quantity INTEGER,
            farmer_profit REAL,
            middleman_profit REAL,
            image_url TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

@app.route("/")
def home():
    return "Backend Running!"

# Add Product
@app.route("/add_product", methods=["POST"])
def add_product():
    data = request.json
    name = data.get("name")
    category = data.get("category", "General")
    price = float(data.get("price", 0))
    wholesale_price = float(data.get("wholesale_price", 0))
    quantity = int(data.get("quantity", 0))
    image_url = data.get("image_url", "https://via.placeholder.com/150")

    # Calculate profits
    farmer_profit = wholesale_price * 0.1
    middleman_profit = price - wholesale_price

    conn = get_db()
    conn.execute("""
        INSERT INTO products 
        (name, category, price, wholesale_price, quantity, farmer_profit, middleman_profit, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (name, category, price, wholesale_price, quantity, farmer_profit, middleman_profit, image_url))
    conn.commit()
    conn.close()

    return jsonify({"message": "Product added successfully!"})

# Get all products
@app.route("/products")
def get_products():
    conn = get_db()
    rows = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# Delete Product
@app.route("/delete_product/<int:id>", methods=["DELETE"])
def delete_product(id):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Product deleted successfully!"})

# Search Product by Name
@app.route("/search_product/<string:name>")
def search_product(name):
    conn = get_db()
    rows = conn.execute("SELECT * FROM products WHERE name LIKE ?", ('%' + name + '%',)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# Filter by Category
@app.route("/filter_category/<string:category>")
def filter_category(category):
    conn = get_db()
    rows = conn.execute("SELECT * FROM products WHERE category LIKE ?", ('%' + category + '%',)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

if __name__ == "__main__":
    print("Starting Backend...")
    app.run(host="127.0.0.1", port=5000)
