# OneStopForWeb - IIT Guwahati Student Utility Portal

**OneStopForWeb** is a centralized web portal developed for the students of **IIT Guwahati**, providing access to essential campus utilities such as:

- **Time Tables**  
- **Mess Menus**  
- **CPI Calculator**  
- **Campus Shop**  
- **Lost & Found**

This project was developed as part of the **DA214 (Database Management Systems)** course.

> **Note:** The website is currently in its development phase. When interacting with the application, especially during form submissions, **please enter `"DSAI"` as your branch name**.

---

## 🛠️ Tech Stack

- **Frontend:** React.js  
- **Backend:** Node.js, Express  
- **Database:** MongoDB  

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/OneStopForWeb.git
cd OneStopForWeb
```

### 2. Install MongoDB

Ensure MongoDB is installed and running on your local machine.  
If not installed, you can download it from: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

### 3. Start the application

```bash
npm install
npm start
```

Navigate to your browser and go to: [http://localhost:3000](http://localhost:3000)

---

## 🗃️ Restoring the Database

To populate the database with sample data:

1. Open your command prompt or terminal in the project directory (`OneStopForWeb/`)
2. Run the following command:

```bash
mongorestore --db onesto dump/
```

This will restore the sample database from the `dump/` folder.

---

## 🌐 Live Deployment

You can view the deployed version of the site at:

**[http://51.79.156.194:3000](http://51.79.156.194:3000)**

---

## 👥 Authors

This project was developed by:

- **Srijan Kumar**  
- **Billa Cherish**  
- **Avneesh Kumar**

---
