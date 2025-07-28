# 📚 Library Management System

A full-stack Library Management Web App designed for administrators and users to manage books and publishers. Built with **Node.js**, **Express**, **EJS**, **MySQL**, and **Bootstrap**, it supports full CRUD operations, user authentication, image uploads, a borrow cart, fines, and profile management.

---

## ✨ Key Features

### 🧾 Book Management
- List all books with title, author, year, and cover image
- Add new books with image upload
- Edit book details and image
- Delete books
- Out-of-stock or unavailable message handling

### 🏷️ Publisher Management
- Add, view, edit, and delete publishers
- View publisher details for each book

### 👤 User Authentication
- Register, login, and logout
- Role-based views (admin, users)
- Session-based access control

### 📦 Borrow Cart
- Add books to a borrow cart
- Checkout simulation with success page
- Cart clears after confirmation

### 💰 Fines Module
- View overdue fines (manually or automatically managed)

### 👥 User Profile
- Profile viewing and editing
- See borrowed books and personal information

### 📋 Admin Dashboard
- Manage users, books, and publishers
- Access extra admin-only functionality

---

## ⚙️ Tech Stack

| Layer       | Technology                     |
|-------------|---------------------------------|
| Backend     | Node.js, Express.js             |
| Frontend    | HTML, CSS, Bootstrap, EJS       |
| Database    | MySQL                           |
| File Upload | Multer                          |
| Sessions    | express-session                 |
| Views       | EJS templating engine           |

---

## 🗃️ Database Schema (Simplified)

```sql
-- Book Table
CREATE TABLE books (
  bookId INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  author VARCHAR(255),
  genre VARCHAR(100),
  quantity INT,
  coverImage VARCHAR(255)
);


-- Publisher Table
CREATE TABLE publishers (
  publisher_id INT AUTO_INCREMENT PRIMARY KEY,
  publisher_name VARCHAR(255) NOT NULL,
  publisher_contact VARCHAR(100),
  publisher_country VARCHAR(100),
  address TEXT
);

-- User Table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user'
);

-- Fines Table (optional)
CREATE TABLE fines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  amount DECIMAL(10,2),
  reason TEXT
);


library-app/
├── app.js                  # Main Express app
├── package.json
├── public/
│   └── images/             # Default image and static assets      
├── views/                  # EJS views
│   ├── addBook.ejs
│   ├── addPublisher.ejs
│   ├── admin.ejs
│   ├── book.ejs
│   ├── cart.ejs
│   ├── checkout-success.ejs
│   ├── fines.ejs
│   ├── forgot-password.ejs
│   ├── forgot-success.ejs
│   ├── homepage.ejs
│   ├── index.ejs
│   ├── library.ejs
│   ├── login.ejs
│   ├── profile.ejs
│   ├── publisherDetails.ejs
│   ├── publishers.ejs
│   ├── register.ejs
│   ├── updateBook.ejs
│   └── updatePublisher.ejs
├── routes/
│   └── library.js          # (Assumed) routes for books and publishers

---
1. Install dependencies: npm install

2. Set up MySQL , Create a database (e.g., librarydb)
Run the SQL statements above to create books and publishers tables

3. Configure DB pool in app.js
const pool = mysql.createPool({
    host: 'ozitwa.h.filess.io',
    port: 3307,
    user: 'CA2library_fallennor',
    password: '377ad025e1933d3d05d3ee6580696b0f225b1daf',
    database: 'CA2library_fallennor',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
4. Run the application
npx nodemon app.js

Access at: http://localhost:3000

🔐 User Roles
Role	Permissions
Admin	Full access to books, users, publishers
User	Can view, borrow, and update own profile only

---

🧪 Sample Routes
Method	Route	Description
GET	/library	View all books
GET	/library/add	Add a new book
POST	/library/add	Submit book form
GET	/library/edit/:id	Edit existing book
POST	/library/edit/:id	Submit edit form
POST	/library/delete/:id	Delete a book
GET	/publishers	View publishers
GET	/publishers/add	Add a publisher
POST	/publishers/add	Submit publisher form

---
📦 Dependencies
{
  "express": "^4.18.2",
  "ejs": "^3.1.9",
  "mysql": "^2.18.1",
  "multer": "^1.4.5",
  "body-parser": "^1.20.2",
  "nodemon": "^3.0.1"
}


📄 License
This project is for educational use only and not for commercial deployment.


