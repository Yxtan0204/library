const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

const finesRoutes = require('./fines/finesRoutes');


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

// ✅ Use connection pool (NOT single connection)
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

// ✅ Session Middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));
app.use(flash());

// ✅ Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

// ✅ Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied');
    res.redirect('/shopping');
};

// ✅ Form validation middleware
const validateRegistration = (req, res, next) => {
    const { username, email, password, contact, role } = req.body;

    if (!username || !email || !password || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// ROUTES
app.get('/', (req, res) => {
    res.render('homepage', {
        user: req.session.user,
        messages: req.flash('success')
    });
});

app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

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

app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

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
            return res.redirect('login');
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role === 'user') {
                res.redirect('/library');
            } else {
                res.redirect('/library');
            }
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

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
// ROUTES FOR BOOKS

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

app.get('/addBook', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addBook', { user: req.session.user });
});

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

app.get('/cart/add/:id', checkAuthenticated, (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  if (!req.session.cart.includes(req.params.id)) req.session.cart.push(req.params.id);
  res.redirect('/library');
});

app.get('/cart', checkAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.render('cart', { books: [], user: req.session.user });
  pool.query('SELECT * FROM books WHERE bookId IN (?)', [cart], (err, results) => {
    if (err) throw err;
    res.render('cart', { books: results, user: req.session.user });
  });
});

app.get('/cart/remove/:id', checkAuthenticated, (req, res) => {
  req.session.cart = (req.session.cart || []).filter(id => id !== req.params.id);
  res.redirect('/cart');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Library App server is running at: http://localhost:${PORT}`);
});

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




//Display details of a particular publisher//
app.get('/publishers/:id', checkAuthenticated, (req, res) => {
  // Extract the publisher ID from the request parameters
  const publisher_id = req.params.id;

  // Fetch data from MySQL based on the publisher ID
    pool.query('SELECT * FROM publishers WHERE publisher_id = ?', [publisher_id], (error, results) => {
      if (error) throw error;

      // Check if any publisher the given ID was found
      if (results.length > 0) {
          // Render HTML page with the publishers data
          res.render('publishers', { publishers: results[0]});
      } else {
          // If no publisher with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('Publisher not found');
      }
  });
});


app.get('/addPublisher', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addPublisher', { user: req.session.user });
});

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

//Delete route//
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











