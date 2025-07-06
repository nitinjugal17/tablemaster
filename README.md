
# TableMaster: The All-in-One Restaurant Management System

![TableMaster Dashboard](https://placehold.co/1200x600.png?text=TableMaster+App+Showcase)
*<p align="center">A placeholder image showcasing the app's interface. Replace with a real screenshot.</p>*

**TableMaster** is a modern, feature-rich, and highly customizable web application designed to be the central nervous system for any restaurant. From managing table reservations and takeaway orders to tracking inventory, handling HR tasks, and leveraging AI for menu creation, TableMaster provides a comprehensive suite of tools to streamline restaurant operations.

Built on a robust and scalable tech stack, it's designed for both ease of use for restaurant staff and ease of development for administrators and contributors.

## ✨ Key Features

TableMaster is packed with features designed to cover every aspect of restaurant management:

- **🍽️ Reservations & Bookings:**
  - **Table & Room Bookings:** Allow customers to book tables or even on-site rooms.
  - **Booking Management:** A central dashboard for admins to view, confirm, and manage all reservations.
  - **Pre-ordering:** Customers can pre-order items with their booking.

- **🥡 Ordering System:**
  - **POS Terminal:** A comprehensive Point-of-Sale interface for walk-in and phone orders.
  - **Takeaway Orders:** Customers can place orders directly from the public menu page.
  - **Order Management:** A real-time view of all orders, with status tracking from "Pending" to "Completed".
  - **Kitchen/Chef View:** A dedicated interface for the kitchen staff to view and manage items for preparation.

- **📜 Menu Management:**
  - **Dynamic Menu Creation:** Easily add, edit, and manage menu items with multiple portion sizes and prices.
  - **AI-Powered Content:** Use Genkit to automatically generate enticing descriptions, recipes, and preparation methods.
  - **Nutritional Information:** Leverage AI to estimate nutritional values for your dishes.
  - **Add-on Groups:** Create customizable add-on groups (e.g., "Extra Toppings," "Side Dishes") and link them to menu items.

- **💼 Operations & HR:**
  - **Inventory Management:** Track stock levels, set reorder points, and manage suppliers.
  - **Expense Tracking:** Record and categorize business expenses, with support for recurring costs.
  - **Employee Management:** Manage employee profiles, roles, and link them to user accounts for app access.
  - **Attendance & Payroll:** Track employee attendance and calculate salaries based on attendance and performance bonuses.

- **🔐 Authentication & Security:**
  - **Role-Based Access Control (RBAC):** Granular control over what different user roles (superadmin, admin, user) can see and do.
  - **OTP Authentication:** Secure user signup and password resets via email OTPs.
  - **Flexible Data Source:** Choose between simple, file-based CSV storage or a robust MongoDB database.
  -**Data-at-Rest Encryption:** Optional AES encryption for CSV data files controlled via an environment variable.

- **⚙️ Deep Customization:**
  - **Theme Engine:** Create, manage, and apply different color themes (light and dark modes) across the entire application.
  - **Invoice & Receipt Customization:** Configure thermal printers and fully customize the layout and content of printed invoices.
  - **Homepage Layout Manager:** Drag-and-drop interface to control the visibility and order of sections on the public homepage.
  -**Multi-lingual Support:** The user interface supports multiple languages, configurable by the user.

- **📊 Reporting & Analytics:**
  - **Sales Dashboard:** Visualize key metrics like total revenue, average order value, and peak hours.
  -**Automated Reports:** Configure and schedule automated email reports for expenses and inventory.

## 🚀 Why Choose TableMaster?

- **All-in-One Solution:** Replaces the need for separate POS, booking, inventory, and marketing systems.
- **Modern Tech Stack:** Built with **Next.js**, **React**, and **TypeScript**, ensuring a fast, reliable, and scalable application.
- **AI-Enhanced:** Leverages **Genkit** to automate creative and analytical tasks, saving time and enhancing your menu.
- **Flexible & Scalable:** Start with a simple CSV-based data backend and seamlessly switch to **MongoDB** as your business grows, without changing the application code.
- **Highly Customizable:** From visual themes to invoice layouts, tailor the application to perfectly match your brand.
- **Developer-Friendly:** A clear, well-structured codebase with a powerful data management layer, making it easy to extend and contribute.

## 🛠️ Technology Stack

- **Frontend:** [Next.js](https://nextjs.org/) (React Framework)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **AI Integration:** [Genkit](https://firebase.google.com/docs/genkit)
- **Forms:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Charts & Reports:** [Recharts](https://recharts.org/)
- **Internationalization (i18n):** [i18next](https://www.i18next.com/)
- **Data Storage:** [MongoDB](https://www.mongodb.com/) or Local CSV Files

---

## 🏁 Getting Started

Follow these steps to get a local instance of TableMaster up and running.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20.x or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Installation

Clone the repository and install the dependencies.

```bash
git clone <repository-url>
cd tablemaster
npm install
```

### 2. Configuration (`.env` file)

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Now, open the `.env` file and configure the following variables:

- **`DATA_SOURCE`**: This is the most important setting.
  - `csv`: (Default) The app will use local CSV files located in `/src/data/`. This is great for getting started quickly without a database.
  - `mongodb`: The app will connect to a MongoDB database.

- **`MONGODB_URI`** (if using `mongodb`): Your MongoDB connection string.
  - *Example: `mongodb+srv://<user>:<password>@cluster.mongodb.net/`*

- **`MONGODB_DB_NAME`** (if using `mongodb`): The name of the database to use.
  - *Example: `tablemaster_db`*

- **`ENCRYPTION_KEY`** (Optional, for CSV mode): A strong, secret key for encrypting the CSV data files at rest. If not provided, data will be stored in plaintext.
  - *Example: `a_very_strong_32_character_secret_phrase`*
  - **Note:** Losing this key means losing access to your encrypted data.

- **Email (SMTP) Settings** (for OTP, notifications, etc.):
  - `SMTP_HOST`: e.g., `smtp.gmail.com`
  - `SMTP_PORT`: e.g., `587`
  - `SMTP_USER`: Your email username.
  - `SMTP_PASS`: Your email password or app-specific password.
  - `EMAIL_FROM`: The "From" address for outgoing emails, e.g., `"TableMaster" <no-reply@yourdomain.com>`

- **`GOOGLE_API_KEY`**: Your Google AI API key for using Genkit features.

### 3. Initial Setup (Critical First Steps)

#### If using CSV (`DATA_SOURCE=csv`)
The application is ready to go! On the first run, it will automatically create the necessary (and empty) `.csv` files in the `/src/data/` directory if they don't exist. The first default user is defined in `users.csv`.

#### If using MongoDB (`DATA_SOURCE=mongodb`)
When starting with an empty MongoDB database, you **must create the first superadmin user manually** to be able to log in.

1.  Connect to your MongoDB instance (e.g., using MongoDB Compass or `mongosh`).
2.  Select your database: `use your_db_name`
3.  Run the following command to insert the first user.

    > **SECURITY WARNING:** The default password system in this prototype is plaintext. For a real application, you must hash the password before inserting it.

    ```javascript
    db.getCollection("users").insertOne({
      "email": "super@example.com",
      "password": "superadminpassword", // Use a secure password
      "name": "Super Admin",
      "role": "superadmin",
      "accountStatus": "active",
      "loyaltyPoints": 0
    });
    ```

### 4. Running the Development Server

```bash
npm run dev
```

The application will now be running at `http://localhost:3000` (or the port specified in your environment).

## 📖 Usage Guide

1.  **Login:** Access the login page and use the default credentials for your chosen data source.
2.  **Admin Dashboard:** After logging in as an admin/superadmin, you will be taken to the dashboard, which provides an overview of the restaurant's status.
3.  **Configure Settings:** The most important first step is to visit **Admin Panel > Settings > General** to configure your restaurant's name, address, currency, and other core details.
4.  **Manage Data:** Use the **Admin Panel > Settings > Data Management** page to import or export data for any module via CSV. This is a powerful tool for bulk-editing or backing up your data.
5.  **Explore:** Navigate through the sidebar to explore all the features, from menu management to user roles.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  **Fork** the repository.
2.  Create a new **branch** (`git checkout -b feature/amazing-feature`).
3.  Make your changes.
4.  **Commit** your changes (`git commit -m 'Add some amazing feature'`).
5.  **Push** to the branch (`git push origin feature/amazing-feature`).
6.  Open a **Pull Request**.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## ❓ FAQ

**Q: How do I switch from the CSV data source to MongoDB?**  
A: Simply update the `DATA_SOURCE` variable in your `.env` file from `csv` to `mongodb`, provide your `MONGODB_URI` and `MONGODB_DB_NAME`, and restart the server. You can use the "Data Management" page to export your data from CSV and import it into your new MongoDB setup.

**Q: Is the password storage secure?**  
A: **NO.** In its current prototype state, the application uses plaintext passwords when in CSV mode for simplicity. This is **extremely insecure** and must be replaced with a proper hashing mechanism (like bcrypt or Argon2) before any real-world use. The MongoDB setup is also basic and relies on the developer to implement password hashing within the application logic for true security.

**Q: How do I add a new admin user?**  
A: As a logged-in superadmin, navigate to the "User Management" page. You can either edit an existing user's role to 'admin' or create a new user and assign them the 'admin' role. All user data is managed in the data source (either `users.csv` or the `users` collection in MongoDB).

**Q: Where are the CSV data files located?**  
A: When using the CSV data source, all data files (`.csv`, `.json`, `.txt`) are located in the `/src/data/` directory of the project.
