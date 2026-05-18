from flask import Flask, render_template, request, redirect, url_for
app = Flask(__name__)
app.secret_key = "secret123"

products = [{"id": 1, "name": "Sample Product", "price": 499, "seller": "Demo Seller"}]
sellers = []
buyers = []

@app.route("/")
def home():
    return render_template("home.html", products=products)

@app.route("/register/buyer", methods=["GET", "POST"])
def register_buyer():
    if request.method == "POST":
        buyers.append(request.form.to_dict())
        return redirect(url_for("home"))
    return render_template("register_buyer.html")

@app.route("/register/seller", methods=["GET", "POST"])
def register_seller():
    if request.method == "POST":
        sellers.append(request.form.to_dict())
        return redirect(url_for("seller_dashboard"))
    return render_template("register_seller.html")

@app.route("/seller", methods=["GET", "POST"])
def seller_dashboard():
    if request.method == "POST":
        products.append({
            "id": len(products) + 1,
            "name": request.form["name"],
            "price": request.form["price"],
            "seller": request.form["seller"]
        })
        return redirect(url_for("seller_dashboard"))
    return render_template("seller_dashboard.html", products=products)

@app.route("/admin")
def admin():
    return render_template("admin.html",
                           product_count=len(products),
                           seller_count=len(sellers),
                           buyer_count=len(buyers))

if __name__ == "__main__":
    app.run(debug=True)