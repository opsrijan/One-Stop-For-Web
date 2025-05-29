// server.js
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Create a separate multer instance for note file uploads (can reuse same storage)
const notesUpload = upload; // We can reuse the same storage since they all go to /public/uploads

// Class Slot Map for timetable
const classSlotMap = new Map([
  // Monday
  ["A,Monday", "8:00 – 8:55"],
  ["B,Monday", "9:00 – 9:55"],
  ["C,Monday", "10:00 – 10:55"],
  ["D,Monday", "11:00 – 11:55"],
  ["F,Monday", "12:00 – 12:55"],
  ["F1,Monday", "1:00 – 1:55"],
  ["D1,Monday", "2:00 – 2:55"],
  ["C1,Monday", "3:00 – 3:55"],
  ["B1,Monday", "4:00 – 4:55"],
  ["A1,Monday", "5:00 – 5:55"],
  // Tuesday
  ["E,Tuesday", "8:00 – 8:55"],
  ["A,Tuesday", "9:00 – 9:55"],
  ["B,Tuesday", "10:00 – 10:55"],
  ["C,Tuesday", "11:00 – 11:55"],
  ["F,Tuesday", "12:00 – 12:55"],
  ["F1,Tuesday", "1:00 – 1:55"],
  ["C1,Tuesday", "2:00 – 2:55"],
  ["B1,Tuesday", "3:00 – 3:55"],
  ["A1,Tuesday", "4:00 – 4:55"],
  ["E1,Tuesday", "5:00 – 5:55"],
  // Wednesday
  ["D,Wednesday", "8:00 – 8:55"],
  ["E,Wednesday", "9:00 – 9:55"],
  ["A,Wednesday", "10:00 – 10:55"],
  ["B,Wednesday", "11:00 – 11:55"],
  ["G,Wednesday", "12:00 – 12:55"],
  ["G1,Wednesday", "1:00 – 1:55"],
  ["B1,Wednesday", "2:00 – 2:55"],
  ["A1,Wednesday", "3:00 – 3:55"],
  ["E1,Wednesday", "4:00 – 4:55"],
  ["D1,Wednesday", "5:00 – 5:55"],
  // Thursday
  ["C,Thursday", "8:00 – 8:55"],
  ["D,Thursday", "9:00 – 9:55"],
  ["E,Thursday", "10:00 - 10:55"],
  ["A,Thursday", "11:00 - 11:55"],
  ["G,Thursday", "12:00 – 12:55"],
  ["G1,Thursday", "1:00 – 1:55"],
  ["A1,Thursday", "2:00 – 2:55"],
  ["E1,Thursday", "3:00 – 3:55"],
  ["D1,Thursday", "4:00 – 4:55"],
  ["C1,Thursday", "5:00 – 5:55"],
  // Friday
  ["B,Friday", "8:00 – 8:55"],
  ["C,Friday", "9:00 – 9:55"],
  ["D,Friday", "10:00 – 10:55"],
  ["F,Friday", "11:00 – 11:55"],
  ["G,Friday", "12:00 – 12:55"],
  ["G1,Friday", "1:00 – 1:55"],
  ["F1,Friday", "2:00 – 2:55"],
  ["D1,Friday", "3:00 – 3:55"],
  ["C1,Friday", "4:00 – 4:55"],
  ["B1,Friday", "5:00 – 5:55"]
]);
const classSlotMapObj = Object.fromEntries(classSlotMap);

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing request bodies.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware.
app.use(session({
  secret: 'somesecretkey',
  resave: false,
  saveUninitialized: false
}));

// Set view engine and serve static files from "public".
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Define days array for timetable/menu.
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday" ];

// MongoDB connection setup.
const mongoURI = 'mongodb://localhost:27017';
const dbName = 'onesto';

MongoClient.connect(mongoURI, { useUnifiedTopology: true })
.then(client => {
  console.log("Connected to MongoDB");
  const db = client.db(dbName);
  const usersCollection = db.collection('users');
  const coursesCollection = db.collection('timetable');  // Timetable courses data
  const shopCollection = db.collection('shop');          // Shop listings data
  const menuCollection = db.collection('menu');          // Menu data
  const lostCollection = db.collection('lost');          // Lost items data
  const foundCollection = db.collection('found');        // Found items data
  const notesCollection = db.collection('notes');        // Notes sharing data
  const HSSCollection = db.collection('hss');          // HSS courses data
  const MinorCollection = db.collection('minor');        // Minor courses data

  // Middleware to ensure the user is authenticated.
  function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.roll) {
      next();
    } else {
      res.redirect('/login');
    }
  }

  // Public Routes.
  app.get('/', (req, res) => {
    res.render('index', { page: 'home' });
  });

  // Login Routes.
  app.get('/login', (req, res) => {
    res.render('login', { error: null, page: 'login' });
  });

  app.get('/cpicalc', (req, res) => {
    res.render('cpicalc', { error: null, page: 'cpicalc' });
  });


  app.post('/login', async (req, res) => {
    const { roll, password } = req.body;
    const user = await usersCollection.findOne({ roll: roll });
    if (!user || user.password !== password) {
      return res.render('login', { error: "Invalid roll number or password.", page: 'login' });
    }
    req.session.user = {
      roll: user.roll,
      department: user.department,
      semester: user.semester,
      name: user.name
    };
    res.redirect('/timetable');
  });

  // Register Routes.
  app.get('/register', async (req, res) => {
    const HSS = await HSSCollection.find({}).toArray();
    const Minor = await MinorCollection.find({}).toArray();
    console.log(HSS , Minor);
    res.render('register', { error: null, page: 'register' , HSS : HSS , Minor : Minor });
  });

  app.post('/register', async (req, res) => {
    const { name, roll, password, department, semester, minor, HSS } = req.body;
    const newUser = { name, roll, password, department, semester, minor : minor, HSS : HSS };
    const existingUser = await usersCollection.findOne({ roll: roll });
    if (existingUser) {
      return res.render('register', { error: "User with this roll number already exists.", page: 'register' });
    }
    await usersCollection.insertOne(newUser);
    res.redirect('/login');
  });

  // Protected Routes.

  // Timetable Route.
  app.get('/timetable', ensureAuthenticated, async (req, res) => {
    const user = req.session.user;
    let minor = await usersCollection.findOne({ roll: user.roll }).then(user => user.minor);
    let hss = await usersCollection.findOne({ roll: user.roll }).then(user => user.HSS);
    minor = await MinorCollection.findOne({ course_code: minor });
    hss = await HSSCollection.findOne({ course_code: hss });

    const selectedDay = req.query.day || "Monday";
    const semesterNumber = Number(user.semester);
    const courses = await coursesCollection.find({ 
      department: new RegExp('^' + user.department + '$', 'i') ,
      semester: semesterNumber 
    }).toArray();
    const filteredCourses = courses.filter(course => {
      if (course.lab_slot) {
        return course.lab_day && course.lab_day.toLowerCase() === selectedDay.toLowerCase();
      } else {
        return !!classSlotMapObj[course.class_slot + ',' + selectedDay];
      }
    });
    filteredCourses.forEach(course => {
      if (course.lab_slot) {
        course.class_timing = course.lab_slot;
      } else {
        course.class_timing = classSlotMapObj[course.class_slot + ',' + selectedDay];
      }
    });
    // Add minor hss class timings
    function parseTimeToMinutes(timeStr) {
      let time = timeStr.trim();
      if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
        let today = new Date();
        let dateStr = today.toDateString() + " " + time;
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return 0;
        return d.getHours() * 60 + d.getMinutes();
      } else {
        let parts = time.split(":");
        if (parts.length < 2) return 0;
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1], 10);
        if (hours !== 12) { // assume PM if not specified
          hours += 12;
        }
        return hours * 60 + minutes;
      }
    }

    function extractStartTime(timingStr) {
      let parts = timingStr.split("–");
      return parts[0].trim();
    }

    filteredCourses.sort((a, b) => {
      let timeA = parseTimeToMinutes(extractStartTime(a.class_timing));
      let timeB = parseTimeToMinutes(extractStartTime(b.class_timing));
      return timeA - timeB;
    });
    console.log(minor,hss);
    res.render('timetable', { 
      user : {minor : minor , hss : hss} ,
      department: user.department,
      semester: user.semester,
      selectedDay: selectedDay,
      days: days,
      courses: filteredCourses,
      page: 'timetable'
    });
  });

  // Shop Routes.
  app.get('/shop', ensureAuthenticated, async (req, res) => {
    const listings = await shopCollection.find({}).toArray();
    res.render('shop', { listings, user: req.session.user, page: 'shop' });
  });

  app.get('/shop/add', ensureAuthenticated, (req, res) => {
    const categories = ["Electronics", "Books", "Clothing", "Accessories", "Food"];
    res.render('shopAdd', { categories, page: 'shop' });
  });

  app.post('/shop/add', ensureAuthenticated, upload.single('image'), async (req, res) => {
    const { product_name, description, price, category, contact_roll, contact_phone } = req.body;
    // Convert file path to relative URL.
    const image_url = req.file
      ? "/" + path.relative(path.join(__dirname, "public"), req.file.path).replace(/\\/g, "/")
      : "";
    const newListing = {
      product_name,
      description,
      price: Number(price),
      category,
      image_url,
      contact_info: { roll: contact_roll, phone: contact_phone },
      seller_roll: req.session.user.roll,
      seller_name: req.session.user.name,
      created_at: new Date(),
      updated_at: new Date()
    };
    await shopCollection.insertOne(newListing);
    res.redirect('/shop');
  });

  app.get('/shop/remove/:id', ensureAuthenticated, async (req, res) => {
    const listingId = req.params.id;
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    const listing = await shopCollection.findOne({ _id: new ObjectId(listingId) });
    if (listing && listing.seller_roll === user.roll) {
      if (listing.image_url) {
        const fullImagePath = path.join(__dirname, 'public', listing.image_url);
        if (fs.existsSync(fullImagePath)) {
          fs.unlink(fullImagePath, (err) => {
            if (err) console.error("Error deleting image file:", err);
            else console.log("Deleted image file:", fullImagePath);
          });
        }
      }
      await shopCollection.deleteOne({ _id: new ObjectId(listingId) });
    }
    res.redirect('/shop');
  });

  // Menu Route.
  app.get('/menu', ensureAuthenticated, async (req, res) => {
    const selectedDay = req.query.day || new Date().toLocaleDateString('en-US', { weekday: 'long' });
    let menuData = await menuCollection.findOne({ day: selectedDay });
    if (!menuData) {
      menuData = { breakfast: [], lunch: [], dinner: [] };
    } else {
      menuData = JSON.parse(JSON.stringify(menuData));
    }
    res.render('menu', { selectedDay, menu: menuData, page: 'menu' });
  });

  // Lost & Found Routes (Unified Page with Tabs).
  app.get('/lostandfound', ensureAuthenticated, async (req, res) => {
    const lostItems = await lostCollection.find({}).toArray();
    const foundItems = await foundCollection.find({}).toArray();
    res.render('lostAndFound', { lostItems, foundItems, user: req.session.user, page: 'lostandfound' });
  });

  // Notes Routes.
  // GET /notes: Display notes for a given course, provided via query parameter course_code.
  app.get('/notes', ensureAuthenticated, async (req, res) => {
    const department = req.session.user.department;
    const sem = req.session.user.semester;
    if (!department) {
      return res.send("Department not specified.");
    }
    const notes = await notesCollection.find({ department : department , semester : sem}).toArray();
    res.render('notes', { notes, user: req.session.user, page: 'notes' });
  });

  // GET /notes/add: Render form to add a note for a given course.
  app.get('/notes/add', ensureAuthenticated, async (req, res) => {
    const courses = await coursesCollection.find({ 
      department: new RegExp('^' + req.session.user.department + '$', 'i'),
      semester: Number(req.session.user.semester)
    }).toArray();
    res.render('notesAdd', { user: req.session.user, page: 'notes' , courses : courses});
  });

  // POST /notes/add: Process form submission for adding a note.
  app.post('/notes/add', ensureAuthenticated, notesUpload.single('noteFile'), async (req, res) => {
    const { course_code , title } = req.body;
    const file_url = req.file
      ? "/" + path.relative(path.join(__dirname, "public"), req.file.path).replace(/\\/g, "/")
      : "";
    const noteDoc = {
      course_code,
      title,
      file_url,
      department : req.session.user.department,
      semester: req.session.user.semester,
      uploader: { roll: req.session.user.roll, name: req.session.user.name },
      created_at: new Date(),
      updated_at: new Date()
    };
    await notesCollection.insertOne(noteDoc);
    res.redirect('/notes');
  });

  // GET /notes/remove/:id: Remove a note if it belongs to the logged-in user.
  app.get('/notes/remove/:id', ensureAuthenticated, async (req, res) => {
    const noteId = req.params.id;
    const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
    if (note && note.uploader.roll === req.session.user.roll) {
      if (note.file_url) {
        const fullPath = path.join(__dirname, 'public', note.file_url);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err) console.error("Error deleting note file:", err);
          });
        }
      }
      await notesCollection.deleteOne({ _id: new ObjectId(noteId) });
      return res.redirect('/notes?course_code=' + note.course_code);
    }
    res.redirect('/notes');
  });

  // Lost Item Routes.
  app.get('/lost/add', ensureAuthenticated, (req, res) => {
    res.render('lostAdd', { page: 'lostandfound' });
  });

  app.post('/lost/add', ensureAuthenticated, upload.single('image'), async (req, res) => {
    const { item_name, description, where_lost, when_lost, contact_roll, contact_phone } = req.body;
    const image_url = req.file
      ? "/" + path.relative(path.join(__dirname, "public"), req.file.path).replace(/\\/g, "/")
      : "";
    const lostItem = {
      item_name,
      description,
      where_lost,
      when_lost,
      image_url,
      contact_info: { roll: contact_roll, phone: contact_phone },
      seller_roll: req.session.user.roll,
      seller_name: req.session.user.name,
      created_at: new Date(),
      updated_at: new Date()
    };
    await lostCollection.insertOne(lostItem);
    res.redirect('/lostandfound');
  });

  app.get('/lost/remove/:id', ensureAuthenticated, async (req, res) => {
    const itemId = req.params.id;
    const user = req.session.user;
    const item = await lostCollection.findOne({ _id: new ObjectId(itemId) });
    if (item && item.seller_roll === user.roll) {
      if (item.image_url) {
        const fullPath = path.join(__dirname, 'public', item.image_url);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err) console.error("Error deleting lost item image:", err);
          });
        }
      }
      await lostCollection.deleteOne({ _id: new ObjectId(itemId) });
    }
    res.redirect('/lostandfound');
  });

  // Found Item Routes.
  app.get('/found/add', ensureAuthenticated, (req, res) => {
    res.render('foundAdd', { page: 'lostandfound' });
  });

  app.post('/found/add', ensureAuthenticated, upload.single('image'), async (req, res) => {
    const { item_name, description, when_found, submitted_where, contact_roll, contact_phone } = req.body;
    const image_url = req.file
      ? "/" + path.relative(path.join(__dirname, "public"), req.file.path).replace(/\\/g, "/")
      : "";
    const foundItem = {
      item_name,
      description,
      when_found,
      submitted_where,
      image_url,
      contact_info: { roll: contact_roll, phone: contact_phone },
      seller_roll: req.session.user.roll,
      seller_name: req.session.user.name,
      created_at: new Date(),
      updated_at: new Date()
    };
    await foundCollection.insertOne(foundItem);
    res.redirect('/lostandfound');
  });

  app.get('/found/remove/:id', ensureAuthenticated, async (req, res) => {
    const itemId = req.params.id;
    const user = req.session.user;
    const item = await foundCollection.findOne({ _id: new ObjectId(itemId) });
    if (item && item.seller_roll === user.roll) {
      if (item.image_url) {
        const fullPath = path.join(__dirname, 'public', item.image_url);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err) console.error("Error deleting found item image:", err);
          });
        }
      }
      await foundCollection.deleteOne({ _id: new ObjectId(itemId) });
    }
    res.redirect('/lostandfound');
  });

  // Logout Route.
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
  });

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})
.catch(err => {
  console.error("Error connecting to MongoDB", err);
});
