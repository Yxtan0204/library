const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const finesRoutes = require('./fines/finesRoutes');

function checkAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();

    req.flash('error', 'Please log in first.');
    res.redirect('/login');
}


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Use connection pool (NOT single connection)
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

// Set up view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// Session Middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
  next();
});


// To check if user is logged in
app.get('/', checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const query = `
        SELECT 
            u.username AS user_name,
            DATE_FORMAT(l.return_date, '%Y-%m') AS return_month,
            SUM(
                CASE
                    WHEN l.return_date > l.due_date THEN DATEDIFF(l.return_date, l.due_date) * 0.20
                    ELSE 0
                END
            ) AS total_fine
        FROM loans l
        JOIN users u ON l.userId = u.id
        WHERE l.userId = ?
        GROUP BY u.username, return_month;
    `;

    mysql.query(query, [userId], (err, results) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).send("Server error");
        }
        res.render('fines', { fines: results });
    });
});


// To check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied');
  res.redirect('/library');
};

app.use('/fines', checkAuthenticated, finesRoutes);

//  Form validation 
const validateRegistration = (req, res, next) => {
    const { username, email, password, contact, role } = req.body;

    if (!username || !email || !password || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 8) {
        req.flash('error', 'Password should be at least 8 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};



// homepage route
app.get('/', (req, res) => {
    res.render('homepage', {
        user: req.session.user,
        messages: req.flash('success')
    });
});
//register route
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});



//validate registration
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, contact, role } = req.body;
    const sql = 'INSERT INTO users (username, email, password, contact, role) VALUES (?, ?, SHA1(?), ?, ?)';
    
    pool.query(sql, [username, email, password, contact, role], (err, result) => {
        if (err) {
            console.error('Registration error:', err);
            req.flash('error', 'Database error');
            return res.redirect('register');
        }

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

// get login 
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});
// post login 
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/login');
  }

  const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
  pool.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error', 'Database error');
      return res.redirect('/login');
    }

    if (results.length > 0) {
      // Safe to access results[0]
      req.session.user = {
        id: results[0].id,
        username: results[0].username,
        email: results[0].email,
        contact: results[0].contact,
        role: results[0].role
      };

      req.flash('success', 'Login successful!');
      res.redirect('/library');
    } else {
      req.flash('error', 'Invalid email or password.');
      res.redirect('/login');
    }
  });
});

// logout route
app.get('/logout', (req, res) => {
    req.flash('success', 'You have been logged out.');
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password'); 
});
app.post('/forgot-password', (req, res) => {
  const email = req.body.email;
  res.render('forgot-success', { email });
});

//profile page
app.get('/profile', checkAuthenticated, (req, res) => {
  res.render('profile', { user: req.session.user });
});

//Update Profile
app.get('/updateProfile', checkAuthenticated, (req, res) => {
  const userData = req.session.user; // or fetch from DB by user ID
  res.render('updateProfile', {
    formData: userData,
    message: req.query.message || null
  });
});

app.post('/updateProfile', checkAuthenticated, (req, res) => {
  const { username, email, contact } = req.body;
  const userId = req.session.user.id; // from session

  const sql = 'UPDATE users SET username = ?, email = ?, contact = ? WHERE id = ?';

  pool.query(sql, [username, email, contact, userId], (err, results) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).send('Failed to update profile.');
    }

    // Update session values too
    req.session.user.username = username;
    req.session.user.email = email;
    req.session.user.contact = contact;

    // Redirect back to profile
    res.redirect('/profile');
  });
});

//User route:
app.get('/user', checkAuthenticated, checkAdmin, (req, res) => {
  pool.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).send('Database error');
    }

    res.render('user', { users: results, user: req.session.user });
  });
});

app.get('/addUser', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('addUser');
});

app.post('/addUser', checkAuthenticated, checkAdmin, (req, res) => {
  const { username, email, password, contact, role } = req.body;

  if (!username || !email || !password || !contact || !role) {
    return res.status(400).send('All fields are required.');
  }

  if (password.length < 8) {
    return res.status(400).send('Password must be at least 8 characters.');
  }

  const sql = 'INSERT INTO users (username, email, password, contact, role) VALUES (?, ?, SHA1(?), ?, ?)';
  pool.query(sql, [username, email, password, contact, role], (err, result) => {
    if (err) {
      console.error('Error adding user:', err);
      return res.status(500).send('Database error.');
    }

    res.redirect('/user');
  });
});

app.get('/updateUser/:id', checkAuthenticated, checkAdmin, (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT * FROM users WHERE id = ?';

  pool.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user for edit:', err);
      return res.status(500).send('Error retrieving user.');
    }

    if (results.length > 0) {
      res.render('updateUser', { user: results[0] });
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.post('/updateUser/:id', checkAuthenticated, checkAdmin, (req, res) => {
  const userId = req.params.id;
  const { username, email, contact, role } = req.body;

  const sql = 'UPDATE users SET username = ?, email = ?, contact = ?, role = ? WHERE id = ?';
  pool.query(sql, [username, email, contact, role, userId], (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).send('Failed to update user.');
    }

    res.redirect('/user');
  });
});

app.get('/deleteUser/:id', checkAuthenticated, checkAdmin, (req, res) => {
  const userId = req.params.id;
  pool.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error loading user for delete:', err);
      return res.status(500).send('Error loading user');
    }

    if (results.length > 0) {
      res.render('deleteUser', { user: results[0] });
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.post('/deleteUser/:id', checkAuthenticated, checkAdmin, (req, res) => {
  const userId = req.params.id;
  pool.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).send('Error deleting user');
    }

    res.redirect('/user');
  });
});

// ROUTES FOR BOOKS TABLE

// Main library route
app.get('/library', checkAuthenticated, (req, res) => {
    const { search, genre } = req.query;
    let sql = 'SELECT * FROM books WHERE 1=1';
    let params = [];

    if (search) {
        sql += ' AND (title LIKE ? OR author LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (genre) {
        sql += ' AND genre = ?';
        params.push(genre);
    }

    // Get all genres for the filter dropdown
    pool.query('SELECT DISTINCT genre FROM books', (err, genreResults) => {
        if (err) throw err;
        const genres = genreResults.map(row => row.genre);

        pool.query(sql, params, (error, results) => {
            if (error) throw error;
            res.render('library', {
                books: results,
                user: req.session.user,
                genres,
                genre,
                search
            });
        });
    });
});

// Add book route ( GET method)
app.get('/addBook', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addBook', { user: req.session.user });
});

// Add book route ( POST method)
app.post('/addBook', upload.single('coverImage'), (req, res) => {
    const { title, author, genre, quantity } = req.body;
    let coverImage = req.file ? req.file.filename : null;

    const sql = 'INSERT INTO books (title, author, genre, quantity, coverImage) VALUES (?, ?, ?, ?, ?)';
    pool.query(sql, [title, author, genre, quantity, coverImage], (error, results) => {
        if (error) {
            console.error("Error adding book:", error);
            res.status(500).send('Error adding book');
        } else {
            res.redirect('/library');
        }
    });
});

// Update book route ( GET method)
app.get('/updateBook/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const bookId = req.params.id;
    pool.query('SELECT * FROM books WHERE bookId = ?', [bookId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.render('updateBook', { book: results[0] });
        } else {
            res.status(404).send('Book not found');
        }
    });
});


// Update book route ( POST method)
app.post('/updateBook/:id', upload.single('coverImage'), (req, res) => {
    const bookId = req.params.id;
    const { title, author, genre, quantity, description, currentImage } = req.body;
    let coverImage = currentImage;
    if (req.file) coverImage = req.file.filename;
    const sql = 'UPDATE books SET title = ?, author = ?, genre = ?, quantity = ?, description = ?, coverImage = ? WHERE bookId = ?';
    pool.query(sql, [title, author, genre, quantity, description, coverImage, bookId], (error, results) => {
        if (error) {
            console.error("Error updating book:", error);
            res.status(500).send('Error updating book');
        } else {
            res.redirect('/library');
        }
    });
});
// View book details route
app.get('/book/:id', checkAuthenticated, (req, res) => {
    const bookId = req.params.id;
    pool.query('SELECT * FROM books WHERE bookId = ?', [bookId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.render('book', { book: results[0], user: req.session.user });
        } else {
            res.status(404).send('Book not found');
        }
    });
});

// Delete book route ( GET  method)
app.get('/deleteBook/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const bookId = req.params.id;

    pool.query('DELETE FROM books WHERE bookId = ?', [bookId], (error, results) => {
        if (error) {
            console.error("Error deleting book:", error);
            res.status(500).send('Error deleting book');
        } else {
            res.redirect('/library');
        }
    });
});
// Delete book route ( POST method)
app.post('/deleteBook/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const bookId = req.params.id;

    pool.query('DELETE FROM books WHERE bookId = ?', [bookId], (error, results) => {
        if (error) {
            console.error("Error deleting book:", error);
            res.status(500).send('Error deleting book');
        } else {
            res.redirect('/library');
        }
    });
});
// Cart route ( GET method, add books to cart after checking if user is authenticated)
// Add book to cart
app.get('/cart/add/:id', (req, res) => {
  const id = req.params.id;

  // Ensure cart exists in session
  if (!req.session.cart) req.session.cart = [];

  // To Avoid duplicates
  const alreadyInCart = req.session.cart.some(book => book.bookId == id);
  if (alreadyInCart) {
    return res.redirect('/library');
  }

  // Fetch book info from MYSQL
  pool.query('SELECT * FROM books WHERE bookId = ?', [id], (err, rows) => {
    if (err) {
      console.error('Error retrieving book:', err);
      return res.status(500).send('Error retrieving book.');
    }

    if (rows.length > 0) {
      const book = rows[0];

      req.session.cart.push({
        bookId: book.bookId,      
        title: book.title,
        author: book.author,
        quantity: book.quantity
      });
    }

    res.redirect('/library');
  });
});


// View cart
app.get('/cart', checkAuthenticated, (req, res) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.render('cart', { books: [], user: req.session.user });
  }

  // Get just the book IDs
  const bookIds = cart.map(book => book.bookId);

  // Use IN clause to fetch all book details
  pool.query('SELECT * FROM books WHERE bookId IN (?)', [bookIds], (err, results) => {
    if (err) {
      console.error('Error loading cart books:', err);
      return res.status(500).send('Error loading cart books');
    }

    res.render('cart', { books: results, user: req.session.user });
  });
});


// Remove book from cart
app.get('/cart/remove/:id', checkAuthenticated, (req, res) => {
  const bookIdToRemove = req.params.id;
  req.session.cart = (req.session.cart || []).filter(book => book.bookId != bookIdToRemove);
  res.redirect('/cart');
});

app.post('/checkout', async (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.redirect('/cart');

  try {
    const db = pool.promise();
    const userId = req.session.user.id;
    
    // Format dates for MySQL DATETIME
    const now = new Date();
    const loanDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const dueDate = new Date(now.setDate(now.getDate() + 14))
      .toISOString().slice(0, 19).replace('T', ' ');

    console.log('Debug - Checkout process:');
    console.log('User ID:', userId);
    console.log('Cart:', cart);

    for (const item of cart) {
      const [[book]] = await db.query('SELECT quantity FROM books WHERE bookId = ?', [item.bookId]);
      
      if (!book || book.quantity <= 0) {
        console.log('Book out of stock:', item.bookId);
        return res.status(400).send(`Book ID ${item.bookId} is out of stock.`);
      }

      // Create loan record
      console.log('Creating loan record for book:', item.bookId);
      await db.query(
        'INSERT INTO loans (userId, bookId, loan_date, due_date) VALUES (?, ?, ?, ?)',
        [userId, item.bookId, loanDate, dueDate]
      );

      // Update book quantity
      await db.query('UPDATE books SET quantity = quantity - 1 WHERE bookId = ?', [item.bookId]);
    }

    req.session.cart = []; // clear cart
    res.redirect('/checkout-success');

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).send('Checkout failed.');
  }
});

// GET /checkout-success
app.get('/checkout-success', (req, res) => {
  res.render('checkout-success'); // render the EJS file
});


// publishers route ( GET method)
app.get('/publishers', checkAuthenticated, (req, res) => {
    const search = req.query.query;
    let sql = 'SELECT * FROM publishers';
    let params = [];

    if (search) {
        sql += ' WHERE publisher_name LIKE ? OR publisher_country LIKE ? OR publisher_address LIKE ?';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    pool.query(sql, params, (error, results) => {
        if (error) {
            console.error("Error fetching publishers:", error);
            res.status(500).send('Error fetching publishers');
        } else {
            res.render('publishers', { publishers: results, user: req.session.user });
        }
    });
});




app.get('/publishers/:id', checkAuthenticated, (req, res) => {
  const publisher_id = req.params.id;

  pool.query('SELECT * FROM publishers WHERE publisher_id = ?', [publisher_id], (error, results) => {
    if (error) {
      console.error("Error fetching publisher by ID:", error);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      res.render('publisherDetails', {
        publisher: results[0],
        user: req.session.user
      });
    } else {
      res.status(404).send('Publisher not found');
    }
  });
});


app.get('/addPublisher', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addPublisher', { user: req.session.user });
});


// Add publisher route ( POST method)
app.post('/addPublisher', upload.single('images'), (req, res) => {
    // Extract publisher data from the request body
    const { publisher_name, publisher_address, publisher_country, publisher_contact} = req.body;
    let images;
    if (req.file) {
        images = req.file.filename; // Save only the filename
    } else {
        images = "noImage.png";
    }

    const sql = 'INSERT INTO publishers (publisher_name, publisher_address, publisher_country, publisher_contact, images) VALUES (?, ?, ?, ?, ?)';
    // Insert the new publisher into the database
    pool.query(sql , [publisher_name, publisher_address, publisher_country, publisher_contact, images], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding publisher:", error);
            res.status(500).send('Error adding publisher');
        } else {
            // Send a success response
            res.redirect('/publishers');
        }
    });
});

// Update publisher route ( GET method)
app.get('/updatePublisher/:id', checkAuthenticated, checkAdmin,(req,res) => {
    const publisher_id = req.params.id;
    const sql = 'SELECT * FROM publishers WHERE publisher_id = ?'; 

    pool.query(sql, [publisher_id], (error, results) => { 
        if (error) { 
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving publisher by ID');
            
        }

        if (results.length > 0) {
            res.render('updatePublisher', {publishers: results[0]});
        } else {
            
           res.status(404).send('Publisher not found');
    }
    });
});

// Update publisher route ( POST method)
app.post('/updatePublisher/:id', upload.single('images'), (req, res) => {
    const publisher_id = req.params.id;
    const {publisher_name,publisher_address,publisher_country,publisher_contact} = req.body;
    let images  = req.body.currentImages; 
    if (req.file) { 
        images = req.file.filename; 
    } 

    const sql = 'UPDATE publishers SET publisher_name = ? , publisher_address = ?, publisher_country = ?, publisher_contact =?, images =? WHERE publisher_id = ?';
    // Insert the new publisher into the database
    pool.query(sql, [publisher_name, publisher_address, publisher_country, publisher_contact, images, publisher_id], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating publisher:", error);
            res.status(500).send('Error updating publisher');
        } else {
            // Send a success response
            res.redirect('/publishers');
        }
    });
});

//Delete publisher route ( GET method)
app.get('/deletePublisher/:id', checkAuthenticated, checkAdmin, (req,res) => {
    const publisher_id = req.params.id;
    //Extract publisher data from the request body
    const sql = 'DELETE FROM publishers WHERE publisher_id = ?' ;
    //Insert the new publisher into the database: connection object to talk to db
    pool.query(sql, [publisher_id], (error,results) => { //These 4 info is to be passed to SQL statement, which is why there are 4 question marks//
        if (error) {
            //Handle any error that occurs during the database operation//
            console.error("Error deleting publisher:", error);
            res.status(500).send('Error deleting publisher');

        } else {
            //Send a success response
            res.redirect('/publishers');
        }
    });
});

// Return a book
app.get('/loans/return/:id', checkAuthenticated, async (req, res) => {
    const loanId = req.params.id;
    try {
        const db = pool.promise();
        
        // Get the loan record to check if it exists and hasn't been returned
        const [[loan]] = await db.query(
            'SELECT * FROM loans WHERE loanId = ? AND userId = ? AND returnDate IS NULL',
            [loanId, req.session.user.id]
        );

        if (!loan) {
            return res.status(404).send('Loan not found or already returned');
        }

        // Update the loan record with return date
        await db.query(
            'UPDATE loans SET returnDate = NOW() WHERE loanId = ?',
            [loanId]
        );

        // Increment the book quantity
        await db.query(
            'UPDATE books SET quantity = quantity + 1 WHERE bookId = ?',
            [loan.bookId]
        );

        res.redirect('/loans');
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).send('Error returning book');
    }
});

app.get("/loans", checkAuthenticated, (req, res) => {
    let sql, params;
    
    // Debug log
    console.log('Current user:', req.session.user);
    
    if (req.session.user.role === 'admin') {
        sql = `
            SELECT 
                loans.loanId,
                loans.dateRequested as loan_date,
                books.title,
                books.author,
                users.username,
                books.bookId,
                users.id as userId
            FROM loans
            JOIN books ON loans.bookId = books.bookId
            JOIN users ON loans.userId = users.id
            ORDER BY loans.dateRequested DESC
        `;
        params = [];
    } else {
        sql = `
            SELECT 
                loans.loanId,
                loans.dateRequested as loan_date,
                books.title,
                books.author,
                books.bookId
            FROM loans
            JOIN books ON loans.bookId = books.bookId
            WHERE loans.userId = ?
            ORDER BY loans.dateRequested DESC
        `;
        params = [req.session.user.id];
    }

    // Debug log
    console.log('SQL Query:', sql);
    console.log('Parameters:', params);

    pool.query(sql, params, (error, results) => {
        if (error) {
            console.error("Error fetching loans:", error);
            console.error("Detailed error:", error.message);
            return res.status(500).send('Error fetching loans: ' + error.message);
        }
        console.log('Query results:', results);
        res.render("loansMainPage", { loans: results, user: req.session.user });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Library App server is running at: http://localhost:${PORT}`);
});









