import os
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__, instance_path="/tmp/instance")
app.config['SECRET_KEY'] = 'change-this-secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///marketplace.db'
app.config['UPLOAD_FOLDER'] = 'uploads'
db = SQLAlchemy(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='buyer')

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    image = db.Column(db.String(255))
    approved = db.Column(db.Boolean, default=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    total = db.Column(db.Float)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def seed_admin():
    if not User.query.filter_by(email='admin@example.com').first():
        admin = User(
            name='Admin',
            email='admin@example.com',
            password=generate_password_hash('admin123'),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()

@app.route('/')
def home():
    products = Product.query.filter_by(approved=True).all()
    return render_template('home.html', products=products)

@app.route('/register/<role>', methods=['GET', 'POST'])
def register(role):
    if role not in ['buyer', 'seller']:
        return redirect(url_for('home'))
    if request.method == 'POST':
        user = User(
            name=request.form['name'],
            email=request.form['email'],
            password=generate_password_hash(request.form['password']),
            role=role
        )
        db.session.add(user)
        db.session.commit()
        flash('Registration successful. Please login.')
        return redirect(url_for('login'))
    return render_template('register.html', role=role)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(email=request.form['email']).first()
        if user and check_password_hash(user.password, request.form['password']):
            login_user(user)
            if user.role == 'seller':
                return redirect(url_for('seller_dashboard'))
            if user.role == 'admin':
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('home'))
        flash('Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/seller', methods=['GET', 'POST'])
@login_required
def seller_dashboard():
    if current_user.role != 'seller':
        return redirect(url_for('home'))
    if request.method == 'POST':
        filename = ''
        file = request.files.get('image')
        if file and file.filename:
            filename = secure_filename(file.filename)
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        product = Product(
            name=request.form['name'],
            description=request.form['description'],
            price=float(request.form['price']),
            category=request.form['category'],
            image=filename,
            seller_id=current_user.id
        )
        db.session.add(product)
        db.session.commit()
        flash('Product submitted for admin approval.')
    products = Product.query.filter_by(seller_id=current_user.id).all()
    return render_template('seller.html', products=products)

@app.route('/admin')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        return redirect(url_for('home'))
    pending = Product.query.filter_by(approved=False).all()
    return render_template('admin.html', pending=pending,
                           users=User.query.count(),
                           products=Product.query.count(),
                           orders=Order.query.count())

@app.route('/approve/<int:product_id>')
@login_required
def approve_product(product_id):
    if current_user.role != 'admin':
        return redirect(url_for('home'))
    product = Product.query.get_or_404(product_id)
    product.approved = True
    db.session.commit()
    return redirect(url_for('admin_dashboard'))

@app.route('/add-to-cart/<int:product_id>')
def add_to_cart(product_id):
    cart = session.get('cart', [])
    cart.append(product_id)
    session['cart'] = cart
    flash('Added to cart.')
    return redirect(url_for('home'))

@app.route('/cart')
def cart():
    ids = session.get('cart', [])
    products = Product.query.filter(Product.id.in_(ids)).all() if ids else []
    total = sum(p.price for p in products)
    return render_template('cart.html', products=products, total=total)

@app.route('/checkout')
@login_required
def checkout():
    if current_user.role != 'buyer':
        return redirect(url_for('home'))
    ids = session.get('cart', [])
    products = Product.query.filter(Product.id.in_(ids)).all() if ids else []
    total = sum(p.price for p in products)
    if total > 0:
        order = Order(buyer_id=current_user.id, total=total)
        db.session.add(order)
        db.session.commit()
    session['cart'] = []
    flash('Order placed successfully.')
    return redirect(url_for('home'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_admin()
    app.run(debug=True)
