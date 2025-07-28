const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();

const connection = mysql.createConnection({
  host: 'ozitwa.h.filess.io',
  user: 'CA2library_fallennor',
  password: '377ad025e1933d3d05d3ee6580696b0f225b1daf',
  database: 'CA2library_fallennor',
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

connection.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

const checkAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  req.flash('error', 'Please log in first');
  res.redirect('/login');
};

const checkAdmin = (req, res, next) => {
  if (req.session.user.role === 'admin') return next();
  req.flash('error', 'Admins only');
  res.redirect('/');
};

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
  res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', (req, res) => {
  const { username, email, password, address, contact, role } = req.body;
  const sql = `INSERT INTO users (username, email, password, address, contact, role)
               VALUES (?, ?, SHA1(?), ?, ?, ?)`;

  connection.query(sql, [username, email, password, address, contact, role], (err) => {
    if (err) throw err;
    req.flash('success', 'Registered successfully!');
    res.redirect('/login');
  });
});

app.get('/login', (req, res) => {
  res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';

  connection.query(sql, [email, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      req.session.user = results[0];
      res.redirect(req.session.user.role === 'admin' ? '/admin-loans' : '/my-loans');
    } else {
      req.flash('error', 'Invalid credentials');
      res.redirect('/login');
    }
  });
});

app.get('/apply-loan', checkAuthenticated, (req, res) => {
  res.render('applyLoan', { user: req.session.user, messages: req.flash('error') });
});

app.post('/apply-loan', checkAuthenticated, (req, res) => {
  const { amount, term, reason } = req.body;
  const sql = 'INSERT INTO loans (userId, amount, term, reason) VALUES (?, ?, ?, ?)';

  connection.query(sql, [req.session.user.userId, amount, term, reason], (err) => {
    if (err) throw err;
    res.redirect('/my-loans');
  });
});

app.get('/my-loans', checkAuthenticated, (req, res) => {
  const sql = 'SELECT * FROM loans WHERE userId = ?';

  connection.query(sql, [req.session.user.userId], (err, results) => {
    if (err) throw err;
    res.render('myLoans', { user: req.session.user, loans: results });
  });
});

app.get('/admin-loans', checkAuthenticated, checkAdmin, (req, res) => {
  const sql = 'SELECT loans.*, users.username FROM loans JOIN users ON loans.userId = users.userId';

  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.render('adminLoans', { user: req.session.user, loans: results });
  });
});

app.post('/loan/:id/:action', checkAuthenticated, checkAdmin, (req, res) => {
  const loanId = req.params.id;
  const action = req.params.action;

  const status = action === 'approve' ? 'approved' : 'rejected';
  const sql = 'UPDATE loans SET status = ? WHERE loanId = ?';

  connection.query(sql, [status, loanId], (err) => {
    if (err) throw err;
    res.redirect('/admin-loans');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Loan Tracker running on port ${PORT}`));

const loanRoutes = require('./routes/loanRoutes');
app.use('/', loanRoutes);

// GET: Show add form
app.get('/loans/add', (req, res) => {
  res.render('loans/add'); // Create views/loans/add.ejs
});

// POST: Handle form submission
app.post('/loans/add', (req, res) => {
  const { title, author, borrow_date, due_date } = req.body;
  const db = getDbConnection();
  db.run(
    'INSERT INTO loans (title, author, borrow_date, due_date) VALUES (?, ?, ?, ?)',
    [title, author, borrow_date, due_date],
    err => {
      if (err) return res.send('Error adding loan');
      res.redirect('/loans');
    }
  );
});


// GET: Edit form
app.get('/loans/edit/:id', (req, res) => {
  const db = getDbConnection();
  db.get('SELECT * FROM loans WHERE loan_id = ?', [req.params.id], (err, loan) => {
    if (err || !loan) return res.send('Loan not found');
    res.render('loans/edit', { loan });
  });
});

// POST: Update loan
app.post('/loans/edit/:id', (req, res) => {
  const { title, author, borrow_date, due_date } = req.body;
  const db = getDbConnection();
  db.run(
    'UPDATE loans SET title = ?, author = ?, borrow_date = ?, due_date = ? WHERE loan_id = ?',
    [title, author, borrow_date, due_date, req.params.id],
    err => {
      if (err) return res.send('Update failed');
      res.redirect('/loans');
    }
  );
});

// GET: Show return update form
app.get('/loans/update/:id', (req, res) => {
  const db = getDbConnection();
  db.get('SELECT * FROM loans WHERE loan_id = ?', [req.params.id], (err, loan) => {
    if (err || !loan) return res.send('Loan not found');
    res.render('loans/update', { loan });
  });
});

// POST: Handle return date update
app.post('/loans/update/:id', (req, res) => {
  const { return_date } = req.body;
  const db = getDbConnection();
  db.run(
    'UPDATE loans SET return_date = ? WHERE loan_id = ?',
    [return_date, req.params.id],
    err => {
      if (err) return res.send('Failed to update return date');
      res.redirect('/loans');
    }
  );
});

