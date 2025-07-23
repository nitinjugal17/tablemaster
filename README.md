
# TableMaster: The All-in-One Restaurant Management System

![TableMaster Dashboard](https://placehold.co/1200x600.png?text=TableMaster+App+Showcase](https://res.cloudinary.com/doqfbvwze/image/upload/v1753268973/Screenshot_2025-07-23_163911_f372bc.png)
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
  - **Kitchen Display System (KDS):** A dedicated interface for the kitchen staff to view and manage items for preparation, improving efficiency and reducing errors.

- **📜 Menu Management:**
  - **Centralized Menu Database:** Manage all menu items, descriptions, and pricing across all outlets.
  - **Recipe Management with Ingredient Tracking:** Define recipes for each dish, including ingredients and their quantities for accurate food costing and inventory deduction.
  - **Menu Engineering:** Analyze popularity and profitability of menu items to make data-driven decisions on menu design.
  - **Dynamic Menu Creation:** Easily add, edit, and manage menu items with multiple portion sizes and prices.
  - **AI-Powered Content:** Use Genkit to automatically generate enticing descriptions, recipes, and preparation methods.
  - **Nutritional Information:** Leverage AI to estimate nutritional values for your dishes.
  - **Add-on Groups:** Create customizable add-on groups (e.g., "Extra Toppings," "Side Dishes") and link them to menu items.

- **🏢 Multi-Outlet Management:**
  - **Centralized Control:** Manage all F&B outlets (restaurants, bars, cafes, room service, banquet halls) from a single interface.
  - **Outlet-Specific Menus & Pricing:** Ability to set different menus, pricing, and promotions for each outlet.

- **💼 Operations & HR:**
  - **Inventory Management:** Track stock levels, set reorder points, and manage suppliers.
  - **Real-time Inventory Tracking:** Automatically deduct ingredients from inventory as dishes are sold.
  - **Stock Alerts & Reorder Points:** Automated alerts when stock levels are low to prevent shortages.
  - **Wastage Tracking:** Monitor and report on food wastage to identify areas for improvement and cost reduction.
  - **Expense Tracking:** Record and categorize business expenses, with support for recurring costs.
  - **Employee Management:** Manage employee profiles, roles, and link them to user accounts for app access.
  - **Shift Management & Time Tracking:** Track employee work hours and manage shifts within F&B departments via a user-facing attendance page with OTP verification.
  - **Sales Performance by Employee:** Monitor individual server and bartender sales performance.

- **🔐 Authentication & Security:**
  - **Role-Based Access Control (RBAC):** Granular control over what different user roles (superadmin, admin, user) can see and do.
  - **OTP Authentication:** Secure user signup and password resets via email OTPs.
  - **Flexible Data Source:** Choose between simple, file-based CSV storage, a robust MongoDB database, or a high-speed Redis store.
  - **Data-at-Rest Encryption:** Optional AES encryption for CSV data files controlled via an environment variable.
  - **PIN-Protected Customer Info:** Customer phone numbers are hidden behind a configurable 4-digit PIN on order cards and invoices.

- **⚙️ Deep Customization & Billing:**
  - **Theme Engine:** Create, manage, and apply different color themes (light and dark modes) across the entire application.
  - **Invoice & Receipt Customization:** Configure thermal printers and fully customize the layout and content of printed invoices.
  - **Split Billing & Item Transfers:** Easily split bills by items or guests, and transfer items between tables or orders.
  - **Guest Account Charging (Room Posting):** Seamlessly post F&B charges directly to the guest's room bill, eliminating the need for separate payments at the outlet.
  - **Homepage Layout Manager:** Drag-and-drop interface to control the visibility and order of sections on the public homepage.
  - **Multi-lingual Support:** The user interface supports multiple languages, configurable by the user.

- **📊 Reporting & Analytics:**
  - **Sales Dashboard:** Visualize key metrics like total revenue, average order value, and peak hours.
  - **Performance Tracking by Outlet:** Generate reports to analyze sales, profitability, and popular items for each specific F&B venue.
  - **Automated Reports:** Configure and schedule automated email reports for expenses and inventory.

## 🚀 Why Choose TableMaster?

- **Streamlined Operations:** Automates F&B processes from order to inventory, reducing manual errors and increasing efficiency.
- **Improved Guest Experience:** Faster service, accurate billing, and seamless room charging enhance guest satisfaction.
- **Enhanced Revenue Optimization:** Data from sales and menu engineering reports helps in pricing strategies and menu adjustments to maximize F&B revenue.
- **Better Cost Control:** Detailed inventory and costing reports allow for precise control over F&B expenses, minimizing waste and optimizing purchasing.
- **Comprehensive Data for Decision-Making:** All F&B data is integrated, providing a holistic view of the hotel's performance for strategic planning.
- **Modern Tech Stack:** Built with **Next.js**, **React**, and **TypeScript**, ensuring a fast, reliable, and scalable application.
- **AI-Enhanced:** Leverages **Genkit** to automate creative and analytical tasks, saving time and enhancing your menu.
- **Flexible & Scalable:** Start with a simple CSV-based data backend and seamlessly switch to **MongoDB** or **Redis** as your business grows, without changing the application code.
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
- **Data Storage:** [MongoDB](https://www.mongodb.com/), [Redis](https://redis.io/), or Local CSV Files

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

- **`DATA_SOURCE`**: This is the most important setting, determining which backend to use.
  - `csv`: **(Default & Fully Implemented)** The app will use local CSV files located in `/src/data/`. This is great for getting started quickly without a database.
  - `mongodb`: **(Fully Implemented)** The app will connect to a MongoDB database.
  - `redis`: **(Conceptual)** The app is structured to support Redis, but the data actions need to be implemented. See the [Redis Setup Guide](/admin/settings/redis-guide).

- **`MONGODB_URI`** (if using `mongodb`): Your MongoDB connection string.
  - *Example: `mongodb+srv://<user>:<password>@cluster.mongodb.net/`*

- **`MONGODB_DB_NAME`** (if using `mongodb`): The name of the database to use.
  - *Example: `tablemaster_db`*

- **Redis Settings** (if using `redis`):
  - `REDIS_HOST`: Hostname of your Redis server. *Default: `127.0.0.1`*
  - `REDIS_PORT`: Port of your Redis server. *Default: `6379`*
  - `REDIS_PASSWORD`: Password for your Redis server (optional).

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
    
#### If using Redis (`DATA_SOURCE=redis`)
The Redis implementation is currently conceptual. You will need to implement the data storage logic in `src/lib/redis.ts` and the data actions in `src/app/actions/data-management-actions.ts`. For more details, visit the **Admin Panel > Settings > Redis Guide** within the application.

### 4. Running the Development Server

```bash
npm run dev
```

The application will now be running at `http://localhost:9002` (or the port specified in your environment).

## 🏢 Data Provider Architecture

TableMaster uses a flexible data provider architecture that allows you to easily switch between data backends (like CSV, MongoDB, Redis) or even add new ones (like Oracle or PostgreSQL).

- **Dispatcher (`data-management-actions.ts`):** This central file acts as a switchboard. It checks the `DATA_SOURCE` environment variable and calls the appropriate function from the relevant provider.
- **Providers:** Each data source has its own set of functions for creating, reading, updating, and deleting data (e.g., `getUsersFromCsv`, `getUsersFromMongo`).
- **Adding a New Provider:** To add a new data source like **Oracle**, you would:
  1. Create a new file (e.g., `src/lib/oracle.ts`) to handle the database connection.
  2. In `data-management-actions.ts`, create functions like `getUsersFromOracle`.
  3. Update the main `getUsers` function in the dispatcher to call your new Oracle function when `process.env.DATA_SOURCE === 'oracle'`.

This modular approach ensures that the rest of the application remains unchanged, regardless of the data source being used.

## 🚀 Deployment & Production

For running the application in a production environment, it's highly recommended to use a process manager like [PM2](https://pm2.keymetrics.io/) to keep the app alive and manage logs.

### Using PM2

1.  **Install PM2 globally:**
    ```bash
    npm install pm2 -g
    ```

2.  **Build the application for production:**
    Before running with PM2, you need to create a production build of your Next.js app.
    ```bash
    npm run build
    ```

3.  **Start the application with PM2:**
    This command starts the Next.js production server using the `npm start` script.
    ```bash
    pm2 start npm --name "tablemaster" -- start
    ```
    - `--name "tablemaster"`: Assigns a memorable name to your application process.
    - `-- start`: Tells PM2 to execute the `start` script defined in your `package.json`.

4.  **Managing the Application:**
    Here are some common PM2 commands to manage your app:
    - **List all processes:** `pm2 list`
    - **View logs:** `pm2 logs tablemaster`
    - **Restart the app:** `pm2 restart tablemaster`
    - **Stop the app:** `pm2 stop tablemaster`
    - **Delete the app from PM2's list:** `pm2 delete tablemaster`

5.  **Enable Startup Script:**
    To ensure your application restarts automatically after a server reboot, generate and run the PM2 startup script.
    ```bash
    pm2 startup
    # Follow the instructions provided by the command
    pm2 save
    ```

## 👨‍💻 Developer Guide

This section provides technical details for developers working on or extending TableMaster.

### Performance Testing & Optimization

- **Lighthouse:** Use Chrome DevTools' Lighthouse panel to audit performance, accessibility, and SEO. Aim for scores above 90 in all categories.
- **Next.js Analytics:** For production deployments on Vercel, leverage the built-in [Analytics](https://nextjs.org/analytics) to monitor Core Web Vitals and real-user performance.
- **Bundle Analysis:** Use `@next/bundle-analyzer` to inspect the JavaScript bundles and identify large dependencies that could be optimized or code-split.
- **Server Component Profiling:** The Next.js App Router prioritizes Server Components. Profile server-side rendering times to identify slow data-fetching operations or complex component trees.

### API Endpoints & Webhooks

The application primarily uses **Next.js Server Actions** for form submissions and data mutations, which simplifies the architecture by avoiding the need for traditional API routes for many client-server interactions. However, it does expose specific endpoints for external services and health checks.

- **Health Check:**
  - **Endpoint:** `GET /api/health`
  - **Description:** A simple endpoint that returns a `{ status: 'ok' }` JSON response. Used by client-side hooks to verify server connectivity.
- **Delivery Platform Webhooks:**
  - **Endpoint:** `POST /api/webhooks/delivery`
  - **Description:** A generic endpoint to receive real-time order notifications from third-party delivery platforms like Zomato or Swiggy.
  - **Implementation:** It currently logs the entire incoming payload and headers to the server logs for inspection. You would need to add platform-specific verification (e.g., checking HMAC signatures) and data parsing logic to create or update orders in TableMaster based on the webhook data.

### Scalability Considerations

- **Data Source:** The choice of `DATA_SOURCE` is the single most important factor for scalability.
  - **CSV:** Suitable only for single-instance, low-traffic development or very small-scale deployments. It does not support concurrent writes and will become a bottleneck quickly.
  - **MongoDB:** The recommended choice for production. It's horizontally scalable and can handle large volumes of data and concurrent users. For high performance, ensure you create indexes on frequently queried fields (e.g., `email` in the `users` collection, `date` in the `orders` collection).
  - **Redis:** A powerful option for high-speed scenarios. As a data source, it would excel but requires a more complex implementation to ensure data durability and structure. It's ideal for caching, session management, or as a real-time message broker between services.
- **Load Balancing:** When deploying to production with multiple server instances (e.g., using PM2 cluster mode or a cloud platform like Vercel/AWS), ensure session management is handled externally (e.g., using Redis or a database-backed session store) if you implement sticky sessions.
- **Caching:** Implement caching strategies for frequently accessed, non-dynamic data. For example, general settings or menu items could be cached using Redis or Next.js's built-in `unstable_cache` function to reduce database lookups.

### Server & Client Architecture

- **Next.js App Router:** The application is built on the modern App Router, which uses Server Components by default. This reduces the amount of JavaScript shipped to the client, leading to faster initial page loads.
- **Server Components:** Pages and components in the `app` directory are Server Components unless they include the `"use client";` directive. They handle data fetching and rendering on the server.
- **Client Components:** Components requiring interactivity (e.g., using hooks like `useState`, `useEffect`) must be marked with `"use client";`. These are rendered on the server for the initial HTML and then "hydrated" on the client to become interactive. Keep Client Components as small and focused as possible.
- **Server Actions:** Used for handling form submissions and mutations securely on the server without needing to create separate API routes.

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
A: 1. Set up your MongoDB database and get the connection URI. 2. Stop your TableMaster server. 3. Update the `DATA_SOURCE` variable in your `.env` file to `mongodb`. 4. Add your `MONGODB_URI` and `MONGODB_DB_NAME` to the `.env` file. 5. If it's a new database, create the first superadmin user as described in the "Initial Setup" section. 6. Restart the server. You can use the "Data Management" page to export your data from CSV and import it into your new MongoDB setup.

**Q: Is the password storage secure?**  
A: **NO.** In its current prototype state, the application uses plaintext passwords when in CSV mode for simplicity. This is **extremely insecure** and must be replaced with a proper hashing mechanism (like bcrypt or Argon2) before any real-world use. The MongoDB setup is also basic and relies on the developer to implement password hashing within the application logic for true security.

**Q: How do I add a new admin user?**  
A: As a logged-in superadmin, navigate to the "User Management" page. You can either edit an existing user's role to 'admin' or create a new user and assign them the 'admin' role. All user data is managed in the data source (either `users.csv` or the `users` collection in MongoDB).

**Q: Where are the CSV data files located?**  
A: When using the CSV data source, all data files (`.csv`, `.json`, `.txt`) are located in the `/src/data/` directory of the project.
