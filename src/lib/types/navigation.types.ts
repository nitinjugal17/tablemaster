
// src/lib/types/navigation.types.ts

export interface AppRoute {
  id: string; // Unique identifier for the route, e.g., 'admin_menu_management'
  name: string; // User-friendly name, e.g., "Menu Management"
  path: string; // Actual URL path, e.g., "/admin/menu-management"
  group: 'General' | 'Admin Core' | 'Admin HR' | 'Admin Settings' | 'Admin Marketing' | 'Admin Operations' | 'Admin Tools' | 'Admin Menu' | 'Admin Reports'; // For sidebar organization
  description?: string; // Optional description for settings pages etc.
}

export const ALL_APPLICATION_ROUTES: AppRoute[] = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard', group: 'General', description: 'Main dashboard view for all logged-in users.' },
  { id: 'menu_public', name: 'Public Menu View', path: '/menu', group: 'General', description: 'Customer-facing menu page.' },
  { id: 'bookings_public', name: 'Public Booking Form', path: '/bookings', group: 'General', description: 'Customer-facing booking page.' },
  { id: 'rooms_public', name: 'View Rooms', path: '/rooms', group: 'General', description: 'Customer-facing page to view bookable rooms.' },
  { id: 'orders_public', name: 'My Orders (User)', path: '/orders', group: 'General', description: 'Customer view of their own orders.' },
  { id: 'chef_view', name: 'Chef Preparation View', path: '/chef-view', group: 'General', description: 'View for kitchen staff to manage order preparation.' },
  { id: 'attendance_user', name: 'Mark Attendance', path: '/attendance', group: 'General', description: 'User-facing page for employees to mark their attendance.' },
  { id: 'contact_public', name: 'Contact Us', path: '/contact', group: 'General', description: 'Public contact form.' },
  { id: 'feedback_public', name: 'Give Feedback', path: '/feedback', group: 'General', description: 'Public-facing page for customers to submit feedback.' },
  { id: 'user_guide_public', name: 'User Guide', path: '/user-guide', group: 'General', description: 'Guide for customers on how to use the website.' },
  { id: 'faq_public', name: 'FAQ', path: '/faq', group: 'General', description: 'Frequently Asked Questions.' },
  { id: 'disclaimer_public', name: 'Disclaimer', path: '/disclaimer', group: 'General', description: 'Legal disclaimer page.' },
  { id: 'terms_public', name: 'Terms & Conditions', path: '/terms-and-conditions', group: 'General', description: 'Terms and Conditions page.' },

  // Admin Core
  { id: 'admin_pos', name: 'Admin: POS Terminal', path: '/admin/pos', group: 'Admin Core', description: 'Point of Sale terminal for creating and managing orders.' },
  { id: 'admin_bookings_management', name: 'Admin: Bookings Management', path: '/admin/bookings-management', group: 'Admin Core', description: 'Oversee and manage all customer table bookings.' },
  { id: 'admin_tables_management', name: 'Admin: Table Management', path: '/admin/tables', group: 'Admin Core', description: 'Configure restaurant tables and statuses.' },
  { id: 'admin_rooms_management', name: 'Admin: Room Management', path: '/admin/rooms', group: 'Admin Core', description: 'Configure and manage bookable rooms.' },
  { id: 'admin_orders_management', name: 'Admin: Order Management', path: '/admin/orders', group: 'Admin Core', description: 'Manage all customer orders (dine-in, takeaway).' },
  { id: 'admin_user_management', name: 'Admin: User Management', path: '/admin/user-management', group: 'Admin Core', description: 'Manage user accounts and roles.' },
  
  // Admin Reports
  { id: 'admin_reports_overview', name: 'Admin: Reports', path: '/admin/reports', group: 'Admin Reports', description: 'Reporting and analytics dashboard.' },
  { id: 'admin_reports_sales', name: 'Admin: Sales Reports', path: '/admin/reports/sales', group: 'Admin Reports', description: 'Analyze sales data and view key performance metrics.' },
  { id: 'admin_reports_feedback', name: 'Admin: Feedback Report', path: '/admin/reports/feedback', group: 'Admin Reports', description: 'View and analyze customer feedback submissions.' },

  // Admin Menu
  { id: 'admin_menu_overview', name: 'Admin: Menu Management', path: '/admin/menu-management', group: 'Admin Menu', description: 'Menu management dashboard.' },
  { id: 'admin_menu_items', name: 'Admin: Menu Items', path: '/admin/menu-management/items', group: 'Admin Menu', description: 'Manage individual menu items, recipes, and details.' },
  { id: 'admin_menu_menus', name: 'Admin: Menus', path: '/admin/menu-management/menus', group: 'Admin Menu', description: 'Create and organize different menus (e.g., Lunch, Dinner).' },
  { id: 'admin_menu_addons', name: 'Admin: Add-ons', path: '/admin/menu-management/addons', group: 'Admin Menu', description: 'Manage item add-ons and variations.' },


  // Admin HR
  { id: 'admin_hr_overview', name: 'Admin: HR', path: '/admin/hr', group: 'Admin HR', description: 'Human Resources management dashboard.' },
  { id: 'admin_hr_employees', name: 'Admin: Employees', path: '/admin/hr/employees', group: 'Admin HR', description: 'Manage employee profiles and user mappings.' },
  { id: 'admin_hr_attendance', name: 'Admin: Attendance', path: '/admin/hr/attendance', group: 'Admin HR', description: 'View and manage employee attendance.' },
  { id: 'admin_hr_salary', name: 'Admin: Salary Management', path: '/admin/hr/salary', group: 'Admin HR', description: 'Calculate and manage employee salaries and bonuses.' },
  { id: 'admin_hr_salary_history', name: 'Admin: Salary History', path: '/admin/hr/salary-history', group: 'Admin HR', description: 'View past salary payments.' },
  
  // Admin Operations
  { id: 'admin_inventory', name: 'Admin: Inventory', path: '/admin/inventory', group: 'Admin Operations', description: 'Manage stock items and levels.' },
  { id: 'admin_expenses', name: 'Admin: Expenses', path: '/admin/expenses', group: 'Admin Operations', description: 'Track and manage business expenses.' },
  { id: 'admin_stock_menu_mapping', name: 'Admin: Stock-Menu Mapping', path: '/admin/inventory/stock-menu-mapping', group: 'Admin Operations', description: 'Map stock items to menu items for cost analysis.' },
  
  // Admin Marketing
  { id: 'admin_marketing_overview', name: 'Admin: Marketing', path: '/admin/marketing', group: 'Admin Marketing', description: 'Marketing tools dashboard.' },
  { id: 'admin_marketing_discounts', name: 'Admin: Discount Codes', path: '/admin/marketing/discounts', group: 'Admin Marketing', description: 'Manage discount codes and coupons.' },
  { id: 'admin_marketing_offers', name: 'Admin: Offers & Promotions', path: '/admin/marketing/offers', group: 'Admin Marketing', description: 'Create and manage special offers and promotions.' },
  { id: 'admin_marketing_banners', name: 'Admin: Banners', path: '/admin/marketing/banners', group: 'Admin Marketing', description: 'Manage promotional banners for the website.' },
  { id: 'admin_marketing_image_management', name: 'Admin: Image Management', path: '/admin/marketing/image-management', group: 'Admin Marketing', description: 'Centrally manage and generate images for marketing materials.' },
   
  // Admin Tools
  { id: 'admin_tools_overview', name: 'Admin: Tools', path: '/admin/tools', group: 'Admin Tools', description: 'Extra utilities for administrators.' },
  { id: 'admin_tools_id_card_generator', name: 'Admin: ID Card Generator', path: '/admin/tools/id-card-generator', group: 'Admin Tools', description: 'Generate employee ID cards.' },
  
  // Admin Settings
  { id: 'admin_settings_overview', name: 'Admin: Settings Overview', path: '/admin/settings', group: 'Admin Settings', description: 'Overview of all admin settings sections.' },
  { id: 'admin_settings_general', name: 'Admin: Settings - General', path: '/admin/settings/general', group: 'Admin Settings', description: 'Restaurant name, address, currency, global invoice settings.' },
  { id: 'admin_settings_theme', name: 'Admin: Settings - Theme', path: '/admin/settings/theme', group: 'Admin Settings', description: 'Manage application themes and color palettes.' },
  { id: 'admin_settings_currency_rates', name: 'Admin: Settings - Currency Rates', path: '/admin/settings/currency-rates', group: 'Admin Settings', description: 'Manage currency conversion rates.' },
  { id: 'admin_settings_invoice', name: 'Admin: Settings - Invoice & Receipt', path: '/admin/settings/invoice', group: 'Admin Settings', description: 'Configure thermal printers and invoice delivery methods.' },
  { id: 'admin_settings_notifications', name: 'Admin: Settings - Notifications', path: '/admin/settings/notifications', group: 'Admin Settings', description: 'Manage email notifications for admins and users.' },
  { id: 'admin_settings_feedback_categories', name: 'Admin: Settings - Feedback Categories', path: '/admin/settings/feedback-categories', group: 'Admin Settings', description: 'Manage the categories used for feedback submissions.' },
  { id: 'admin_settings_auth', name: 'Admin: Settings - Authentication', path: '/admin/settings/auth', group: 'Admin Settings', description: 'Configure OTP methods (placeholder).' },
  { id: 'admin_settings_loyalty', name: 'Admin: Settings - Loyalty', path: '/admin/settings/loyalty', group: 'Admin Settings', description: 'Configure the customer loyalty program.' },
  { id: 'admin_settings_data_management', name: 'Admin: Settings - Data Management (CSV)', path: '/admin/settings/data-management', group: 'Admin Settings', description: 'Download or upload application data via CSV.' },
  { id: 'admin_settings_encryption', name: 'Admin: Settings - Encryption', path: '/admin/settings/encryption', group: 'Admin Settings', description: 'Manage CSV data encryption settings.' },
  { id: 'admin_settings_access_control', name: 'Admin: Settings - Access Control', path: '/admin/settings/access-control', group: 'Admin Settings', description: 'Define roles and manage permissions (Superadmin only).' },
  { id: 'admin_settings_rate_limiting', name: 'Admin: Settings - Rate Limiting', path: '/admin/settings/rate-limiting', group: 'Admin Settings', description: 'Configure server rate limits (counters are in-memory).' },
  { id: 'admin_settings_homepage_layout', name: 'Admin: Settings - Homepage Layout', path: '/admin/settings/homepage-layout', group: 'Admin Settings', description: 'Configure public homepage section visibility and order (Superadmin only).' },
  { id: 'admin_settings_menu_category_visuals', name: 'Admin: Settings - Menu Category Visuals', path: '/admin/settings/menu-category-visuals', group: 'Admin Settings', description: 'Customize background visuals for menu categories.' },
  { id: 'admin_settings_server_logs', name: 'Admin: Settings - Server Logs', path: '/admin/settings/server-logs', group: 'Admin Settings', description: 'View server-side application logs (Superadmin only).' },
  { id: 'admin_settings_client_logs', name: 'Admin: Settings - Client Logs', path: '/admin/settings/client-logs', group: 'Admin Settings', description: 'View client-originated logs sent to the server (Superadmin only).' },
  { id: 'admin_settings_developer_guide', name: 'Admin: Settings - Developer Guide', path: '/admin/settings/developer-guide', group: 'Admin Settings', description: 'Technical guide for developers on app architecture (Superadmin only).' },
];

export interface RolePermission {
  roleName: string; // e.g., 'admin', 'user', 'custom_role'
  allowedRouteIds: string[]; // Array of AppRoute 'id's
}
