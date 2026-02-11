# SheenClassics - Premium Clothing E-commerce Website

A beautiful and modern MERN stack e-commerce website for SheenClassics clothing brand built with MVC architecture.

## Features

- **User Features:**
  - Home page with featured products and new arrivals
  - Product browsing with filtering and search
  - Shopping cart functionality
  - Wishlist management
  - User authentication (login/signup)
  - Account management
  - Order placement with coupon code support
  - Order history and tracking

- **Admin Features:**
  - Admin dashboard with statistics
  - Product management (add, edit, delete)
  - Order management
  - Coupon code management

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Frontend:** EJS templating engine (MVC pattern)
- **Styling:** Custom CSS with modern design
- **Authentication:** Session-based authentication

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update MongoDB connection string and session secret

3. Start MongoDB (if running locally):
```bash
mongod
```

4. Run the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
sheenclassics/
├── config/          # Configuration files
├── controllers/     # Business logic (MVC controllers)
├── middleware/      # Authentication middleware
├── models/          # MongoDB models
├── public/          # Static files (CSS, JS)
│   ├── css/
│   └── js/
├── routes/          # Route definitions
├── views/           # EJS templates
│   ├── admin/      # Admin panel views
│   ├── auth/       # Authentication views
│   └── partials/   # Reusable partials
├── images/          # Product and brand images
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## Admin Access

There are three ways to create an admin user:

### Method 1: Admin Signup (Recommended)
1. Sign up a regular user first
2. Use the script below to make them admin

### Method 2: Using Script (Easiest)
To make an existing user an admin, run:
```bash
npm run make-admin <user-email>
```
Example:
```bash
npm run make-admin admin@sheenclassics.com
```

### Method 3: List All Users
To see all users and their admin status:
```bash
npm run list-users
```

### Method 4: Direct Database Update
You can also update the user directly in MongoDB:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { isAdmin: true } }
)
```

## Features in Detail

### Products
- Browse all products with category filtering
- Search functionality
- Sort by price or date
- Product detail pages with size/color selection
- Add to cart and wishlist

### Shopping Cart
- Add/remove items
- Update quantities
- Proceed to checkout

### Order Management
- Order summary with shipping address
- Coupon code application
- Order confirmation
- Order history

### Admin Panel
- Dashboard with key metrics
- Product CRUD operations
- Order status management
- Coupon code creation and management

## Images

The website uses images from the `images/` folder:
- `logo.jpeg` - Brand logo (used in navigation)
- `EMB1.jpeg`, `EMB2.jpeg` - Home page decoration
- `p1.jpeg`, `p2.jpeg` - Product images
- `bag.jpeg`, `mypic.jpeg` - Home page gallery
- `qrcode_*.png` - QR code in footer

## License

ISC

