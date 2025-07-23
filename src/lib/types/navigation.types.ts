
// src/lib/types/navigation.types.ts

export interface AppRoute {
  id: string; // Unique identifier for the route, e.g., 'admin_menu_management'
  nameKey: string; // i18n key for the route name, e.g., 'dashboard'
  path: string; // Actual URL path, e.g., "/dashboard"
  group: 'General' | 'Admin Core' | 'Admin HR' | 'Admin Settings' | 'Admin Marketing' | 'Admin Operations' | 'Admin Tools' | 'Admin Menu' | 'Admin Reports'; // For sidebar organization
  description?: string; // Optional description for settings pages etc.
}

export const ALL_APPLICATION_ROUTES: AppRoute[] = [
  { id: 'dashboard', nameKey: 'dashboard', path: '/dashboard', group: 'General', description: 'Main dashboard view for all logged-in users.' },
  { id: 'menu_public', nameKey: 'publicMenu', path: '/menu', group: 'General', description: 'Customer-facing menu page.' },
  { id: 'bookings_public', nameKey: 'publicBooking', path: '/bookings', group: 'General', description: 'Customer-facing booking page.' },
  { id: 'rooms_public', nameKey: 'viewRooms', path: '/rooms', group: 'General', description: 'Customer-facing page to view bookable rooms.' },
  { id: 'orders_public', nameKey: 'myOrders', path: '/orders', group: 'General', description: 'Customer view of their own orders.' },
  { id: 'chef_view', nameKey: 'chefView', path: '/chef-view', group: 'General', description: 'View for kitchen staff to manage order preparation.' },
  { id: 'attendance_user', nameKey: 'markAttendance', path: '/attendance', group: 'General', description: 'User-facing page for employees to mark their attendance.' },
  { id: 'contact_public', nameKey: 'contactUs', path: '/contact', group: 'General', description: 'Public contact form.' },
  { id: 'feedback_public', nameKey: 'giveFeedback', path: '/feedback', group: 'General', description: 'Public-facing page for customers to submit feedback.' },
  { id: 'user_guide_public', nameKey: 'userGuide', path: '/user-guide', group: 'General', description: 'Guide for customers on how to use the website.' },
  { id: 'faq_public', nameKey: 'faq', path: '/faq', group: 'General', description: 'Frequently Asked Questions.' },
  { id: 'disclaimer_public', nameKey: 'disclaimer', path: '/disclaimer', group: 'General', description: 'Legal disclaimer page.' },
  { id: 'terms_public', nameKey: 'terms', path: '/terms-and-conditions', group: 'General', description: 'Terms and Conditions page.' },

  // Admin Core
  { id: 'admin_pos', nameKey: 'admin.pos', path: '/admin/pos', group: 'Admin Core', description: 'Point of Sale terminal for creating and managing orders.' },
  { id: 'admin_outlets_management', nameKey: 'admin.outlets', path: '/admin/outlets', group: 'Admin Core', description: 'Manage all F&B outlets (restaurants, bars, etc.).' },
  { id: 'admin_bookings_management', nameKey: 'admin.bookings', path: '/admin/bookings-management', group: 'Admin Core', description: 'Oversee and manage all customer table bookings.' },
  { id: 'admin_tables_management', nameKey: 'admin.tables', path: '/admin/tables', group: 'Admin Core', description: 'Configure restaurant tables and statuses.' },
  { id: 'admin_rooms_management', nameKey: 'admin.rooms', path: '/admin/rooms', group: 'Admin Core', description: 'Configure and manage bookable rooms.' },
  { id: 'admin_orders_management', nameKey: 'admin.orders', path: '/admin/orders', group: 'Admin Core', description: 'Manage all customer orders (dine-in, takeaway).' },
  { id: 'admin_user_management', nameKey: 'admin.userManagement', path: '/admin/user-management', group: 'Admin Core', description: 'Manage user accounts and roles.' },
  
  // Admin Reports
  { id: 'admin_reports_overview', nameKey: 'admin.reports.overview', path: '/admin/reports', group: 'Admin Reports', description: 'Reporting and analytics dashboard.' },
  { id: 'admin_reports_sales', nameKey: 'admin.reports.sales', path: '/admin/reports/sales', group: 'Admin Reports', description: 'Analyze sales data and view key performance metrics.' },
  { id: 'admin_reports_operational', nameKey: 'admin.reports.operational', path: '/admin/reports/operational', group: 'Admin Reports', description: 'Detailed reports on menu, bookings, stock, and staff.' },
  { id: 'admin_reports_financial', nameKey: 'admin.reports.financial', path: '/admin/reports/financial', group: 'Admin Reports', description: 'View a P&L statement and financial health metrics.' },
  { id: 'admin_reports_feedback', nameKey: 'admin.reports.feedback', path: '/admin/reports/feedback', group: 'Admin Reports', description: 'View and analyze customer feedback submissions.' },

  // Admin Menu
  { id: 'admin_menu_overview', nameKey: 'admin.menu.overview', path: '/admin/menu-management', group: 'Admin Menu', description: 'Menu management dashboard.' },
  { id: 'admin_menu_items', nameKey: 'admin.menu.items', path: '/admin/menu-management/items', group: 'Admin Menu', description: 'Manage individual menu items, recipes, and details.' },
  { id: 'admin_menu_menus', nameKey: 'admin.menu.menus', path: '/admin/menu-management/menus', group: 'Admin Menu', description: 'Create and organize different menus (e.g., Lunch, Dinner).' },
  { id: 'admin_menu_addons', nameKey: 'admin.menu.addons', path: '/admin/menu-management/addons', group: 'Admin Menu', description: 'Manage item add-ons and variations.' },

  // Admin HR
  { id: 'admin_hr_overview', nameKey: 'admin.hr.overview', path: '/admin/hr', group: 'Admin HR', description: 'Human Resources management dashboard.' },
  { id: 'admin_hr_employees', nameKey: 'admin.hr.employees', path: '/admin/hr/employees', group: 'Admin HR', description: 'Manage employee profiles and user mappings.' },
  { id: 'admin_hr_attendance', nameKey: 'admin.hr.attendance', path: '/admin/hr/attendance', group: 'Admin HR', description: 'View and manage employee attendance.' },
  { id: 'admin_hr_salary', nameKey: 'admin.hr.salary', path: '/admin/hr/salary', group: 'Admin HR', description: 'Calculate and manage employee salaries and bonuses.' },
  { id: 'admin_hr_salary_history', nameKey: 'admin.hr.salaryHistory', path: '/admin/hr/salary-history', group: 'Admin HR', description: 'View past salary payments.' },
  
  // Admin Operations
  { id: 'admin_inventory', nameKey: 'admin.inventory', path: '/admin/inventory', group: 'Admin Operations', description: 'Manage stock items and levels.' },
  { id: 'admin_expenses', nameKey: 'admin.expenses', path: '/admin/expenses', group: 'Admin Operations', description: 'Track and manage business expenses.' },
  
  // Admin Marketing
  { id: 'admin_marketing_overview', nameKey: 'admin.marketing.overview', path: '/admin/marketing', group: 'Admin Marketing', description: 'Marketing tools dashboard.' },
  { id: 'admin_marketing_discounts', nameKey: 'admin.marketing.discounts', path: '/admin/marketing/discounts', group: 'Admin Marketing', description: 'Manage discount codes and coupons.' },
  { id: 'admin_marketing_offers', nameKey: 'admin.marketing.offers', path: '/admin/marketing/offers', group: 'Admin Marketing', description: 'Create and manage special offers and promotions.' },
  { id: 'admin_marketing_banners', nameKey: 'admin.marketing.banners', path: '/admin/marketing/banners', group: 'Admin Marketing', description: 'Manage promotional banners for the website.' },
  { id: 'admin_marketing_image_management', nameKey: 'admin.marketing.imageManagement', path: '/admin/marketing/image-management', group: 'Admin Marketing', description: 'Centrally manage and generate images for marketing materials.' },
   
  // Admin Tools
  { id: 'admin_tools_overview', nameKey: 'admin.tools.overview', path: '/admin/tools', group: 'Admin Tools', description: 'Extra utilities for administrators.' },
  { id: 'admin_tools_id_card_generator', nameKey: 'admin.tools.idCardGenerator', path: '/admin/tools/id-card-generator', group: 'Admin Tools', description: 'Generate employee ID cards.' },
  
  // Admin Settings
  { id: 'admin_settings_overview', nameKey: 'admin.settings.overview', path: '/admin/settings', group: 'Admin Settings', description: 'Overview of all admin settings sections.' },
  { id: 'admin_settings_general', nameKey: 'admin.settings.general', path: '/admin/settings/general', group: 'Admin Settings', description: 'Restaurant name, address, currency, global invoice settings.' },
  { id: 'admin_settings_theme', nameKey: 'admin.settings.theme', path: '/admin/settings/theme', group: 'Admin Settings', description: 'Manage application themes and color palettes.' },
  { id: 'admin_settings_currency_rates', nameKey: 'admin.settings.currencyRates', path: '/admin/settings/currency-rates', group: 'Admin Settings', description: 'Manage currency conversion rates.' },
  { id: 'admin_settings_invoice', nameKey: 'admin.settings.invoice', path: '/admin/settings/invoice', group: 'Admin Settings', description: 'Configure thermal printers and invoice delivery methods.' },
  { id: 'admin_settings_notifications', nameKey: 'admin.settings.notifications', path: '/admin/settings/notifications', group: 'Admin Settings', description: 'Manage email notifications for admins and users.' },
  { id: 'admin_settings_email_tester', nameKey: 'admin.settings.emailTester', path: '/admin/settings/email-tester', group: 'Admin Settings', description: 'Test and debug the server\'s SMTP configuration.' },
  { id: 'admin_settings_auth', nameKey: 'admin.settings.auth', path: '/admin/settings/auth', group: 'Admin Settings', description: 'Configure OTP methods (placeholder).' },
  { id: 'admin_settings_loyalty', nameKey: 'admin.settings.loyalty', path: '/admin/settings/loyalty', group: 'Admin Settings', description: 'Configure the customer loyalty program.' },
  { id: 'admin_settings_data_management', nameKey: 'admin.settings.dataManagement', path: '/admin/settings/data-management', group: 'Admin Settings', description: 'Download or upload application data via CSV.' },
  { id: 'admin_settings_encryption', nameKey: 'admin.settings.encryption', path: '/admin/settings/encryption', group: 'Admin Settings', description: 'Manage CSV data encryption settings.' },
  { id: 'admin_settings_access_control', nameKey: 'admin.settings.accessControl', path: '/admin/settings/access-control', group: 'Admin Settings', description: 'Define roles and manage permissions (Superadmin only).' },
  { id: 'admin_settings_rate_limiting', nameKey: 'admin.settings.rateLimiting', path: '/admin/settings/rate-limiting', group: 'Admin Settings', description: 'Configure server rate limits (counters are in-memory).' },
  { id: 'admin_settings_homepage_layout', nameKey: 'admin.settings.homepageLayout', path: '/admin/settings/homepage-layout', group: 'Admin Settings', description: 'Configure public homepage section visibility and order (Superadmin only).' },
  { id: 'admin_settings_menu_category_visuals', nameKey: 'admin.settings.menuCategoryVisuals', path: '/admin/settings/menu-category-visuals', group: 'Admin Settings', description: 'Customize background visuals for menu categories.' },
  { id: 'admin_settings_server_logs', nameKey: 'admin.settings.serverLogs', path: '/admin/settings/server-logs', group: 'Admin Settings', description: 'View server-side application logs (Superadmin only).' },
  { id: 'admin_settings_client_logs', nameKey: 'admin.settings.clientLogs', path: '/admin/settings/client-logs', group: 'Admin Settings', description: 'View client-originated logs sent to the server (Superadmin only).' },
  { id: 'admin_settings_developer_guide', nameKey: 'admin.settings.developerGuide', path: '/admin/settings/developer-guide', group: 'Admin Settings', description: 'Technical guide for developers on app architecture (Superadmin only).' },
  { id: 'admin_settings_redis_guide', nameKey: 'admin.settings.redisGuide', path: '/admin/settings/redis-guide', group: 'Admin Settings', description: 'Technical guide for setting up Redis (Superadmin only).' },
  { id: 'admin_settings_system_health', nameKey: 'admin.settings.systemHealth', path: '/admin/settings/system-health', group: 'Admin Settings', description: 'Run automated end-to-end tests to verify core functionality.' },
  { id: 'admin_settings_integrations', nameKey: 'admin.settings.integrations', path: '/admin/settings/integrations', group: 'Admin Settings', description: 'Manage integrations with third-party services like Zomato/Swiggy.' },
];

export interface RolePermission {
  roleName: string; // e.g., 'admin', 'user', 'custom_role'
  allowedRouteIds: string[] | string; // Array of AppRoute 'id's or JSON string
}
