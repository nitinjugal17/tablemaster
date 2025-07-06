
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'; // Added React, useEffect, useState
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import Logo from './Logo';
import {
  LayoutDashboard, BookOpenText, CalendarClock, ClipboardList, Users, Settings, ChefHat, BotMessageSquare, LogOut,
  ReceiptText, Mail, KeyRound, DatabaseZap, SlidersHorizontal, Lock, DollarSign, ClipboardCheck, Columns3,
  CalendarCheck, UserCog, GalleryHorizontal, Gift, Image as ImageIconLucide, Tag, Archive, CreditCard as ExpenseIcon,
  Link2, Gauge, Terminal, Contact2, Palette, Server, MonitorSmartphone, AlertTriangle, ImagePlus, LayoutGrid, UserPlus, FileArchive, FileText, BarChart3, Star
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import type { RolePermission, AppRoute } from '@/lib/types'; // Import types
import { ALL_APPLICATION_ROUTES } from '@/lib/types'; // Import route definitions
import { getRolePermissions as getRolePermissionsAction } from '@/app/actions/data-management-actions'; // For fetching permissions

const AppSidebar = () => {
  const pathname = usePathname();
  const { user, isLoadingAuth, logout } = useAuth(); // Use AuthContext
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!isLoadingAuth && user) {
        setIsLoadingPermissions(true);
        try {
          const allPermissions = await getRolePermissionsAction();
          const currentUserPerm = allPermissions.find(p => p.roleName === user.role);
          setUserPermissions(currentUserPerm ? currentUserPerm.allowedRouteIds : []);
        } catch (error) {
          console.error("Failed to fetch role permissions:", error);
          setUserPermissions([]); // Default to no permissions on error
        } finally {
          setIsLoadingPermissions(false);
        }
      } else if (!isLoadingAuth && !user) {
        // No user, no permissions
        setUserPermissions([]);
        setIsLoadingPermissions(false);
      }
    }
    fetchPermissions();
  }, [user, isLoadingAuth]);

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname === path || (path !== '/dashboard' && path !== '/' && pathname.startsWith(path));
  }
  
  const hasAccess = (routeId: string) => {
    if (isLoadingPermissions) return false; // Or true to show skeleton, but false hides it until ready
    if (user?.role === 'superadmin') return true; // Superadmin always has access
    return userPermissions.includes(routeId);
  };

  const filterRoutesByGroup = (groupName: AppRoute['group']) => {
    return ALL_APPLICATION_ROUTES.filter(route => route.group === groupName && hasAccess(route.id) && !route.path.includes('/settings/'));
  };
  
  const generalRoutes = filterRoutesByGroup('General');
  const adminCoreRoutes = filterRoutesByGroup('Admin Core');
  const adminMenuRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin Menu' && hasAccess(route.id) && route.id !== 'admin_menu_overview');
  const adminHrRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin HR' && hasAccess(route.id) && route.id !== 'admin_hr_overview');
  const adminSettingsRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin Settings' && hasAccess(route.id) && route.id !== 'admin_settings_overview');
  const adminMarketingRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin Marketing' && hasAccess(route.id) && route.id !== 'admin_marketing_overview');
  const adminOperationsRoutes = filterRoutesByGroup('Admin Operations');
  const adminToolsRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin Tools' && hasAccess(route.id) && route.id !== 'admin_tools_overview');


  const getIconForRoute = (routeId: string): React.ElementType => {
    const route = ALL_APPLICATION_ROUTES.find(r => r.id === routeId);
    if (!route) return AlertTriangle; // Default fallback icon
    
    // This mapping should ideally come from the route definition itself
    const iconMap: Record<string, React.ElementType> = {
      'dashboard': LayoutDashboard, 'menu_public': BookOpenText, 'bookings_public': CalendarClock,
      'orders_public': ClipboardList, 'chef_view': ClipboardCheck,
      'attendance_user': CalendarCheck, 'contact_public': Mail, 'user_guide_public': BookOpenText, 
      'faq_public': BookOpenText, 'disclaimer_public': AlertTriangle, 'terms_public': FileText,
      'admin_pos': Terminal, 'admin_menu_management': BotMessageSquare, 'admin_bookings_management': CalendarCheck,
      'admin_tables_management': Columns3, 'admin_orders_management': ClipboardList, 'admin_user_management': Users,
      'admin_reports_overview': BarChart3,
      'admin_settings_overview': Settings, 'admin_settings_general': SlidersHorizontal, 'admin_settings_theme': Palette,
      'admin_settings_currency_rates': DollarSign, 'admin_settings_invoice': ReceiptText,
      'admin_settings_notifications': Mail, 'admin_settings_auth': KeyRound,
      'admin_settings_rate_limiting': Gauge, 'admin_settings_data_management': DatabaseZap,
      'admin_settings_encryption': Lock, 'admin_settings_access_control': UserCog,
      'admin_settings_loyalty': Star,
      'admin_settings_homepage_layout': LayoutGrid,
      'admin_settings_menu_category_visuals': ImagePlus, 
      'admin_settings_server_logs': Server, 
      'admin_settings_client_logs': MonitorSmartphone, 'admin_settings_developer_guide': BookOpenText,
      'admin_inventory': Archive, 'admin_stock_menu_mapping': Link2, 'admin_expenses': ExpenseIcon,
      'admin_marketing_discounts': Tag, 'admin_marketing_offers': Gift, 'admin_marketing_banners': GalleryHorizontal,
      'admin_marketing_image_management': ImageIconLucide,
      'admin_tools_id_card_generator': Contact2,
      'admin_hr_overview': UserCog, 'admin_hr_employees': UserPlus, 'admin_hr_attendance': CalendarClock, 'admin_hr_salary': DollarSign,
      'admin_hr_salary_history': FileArchive,
      'admin_menu_items': BotMessageSquare,
      'admin_menu_menus': BookOpenText,
      'admin_menu_addons': Gift,
    };
    return iconMap[routeId] || AlertTriangle;
  };


  // If still loading auth or initial permissions, show minimal sidebar or loading state
  if (isLoadingAuth || (isLoadingPermissions && user)) {
    return (
      <Sidebar collapsible="offcanvas" side="left" variant="sidebar" className="animate-pulse">
        <SidebarHeader className="items-center justify-center group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden"><Logo size="sm" /></div>
          <div className="hidden group-data-[collapsible=icon]:!flex"><ChefHat className="h-7 w-7 text-primary" /></div>
        </SidebarHeader>
        <SidebarContent className="p-2 space-y-2">
            <div className="h-8 bg-muted rounded-md"></div>
            <div className="h-8 bg-muted rounded-md"></div>
            <div className="h-8 bg-muted rounded-md"></div>
        </SidebarContent>
      </Sidebar>
    );
  }
  
  if (!user) { // No user logged in, don't render main sidebar content
    return null; // Or a very minimal public sidebar if applicable
  }


  return (
    <Sidebar collapsible="offcanvas" side="left" variant="sidebar">
      <SidebarHeader className="items-center justify-center group-data-[collapsible=icon]:justify-center">
        <div className="group-data-[collapsible=icon]:hidden"><Logo size="sm" /></div>
        <div className="hidden group-data-[collapsible=icon]:!flex"><ChefHat className="h-7 w-7 text-primary" /></div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {generalRoutes.find(r => r.id === 'dashboard') && (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard', true)} tooltip="Dashboard">
                <Link href="/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {generalRoutes.length > 1 && (
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Restaurant</SidebarGroupLabel>
                {generalRoutes.filter(r => r.id !== 'dashboard').map(route => (
                    <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={route.name}>
                            <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{route.name}</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarGroup>
          )}

          {(adminCoreRoutes.length > 0 || adminMenuRoutes.length > 0 || adminHrRoutes.length > 0 || adminSettingsRoutes.length > 0 || adminMarketingRoutes.length > 0 || adminOperationsRoutes.length > 0 || adminToolsRoutes.length > 0) && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Admin Panel</SidebarGroupLabel>
                {adminCoreRoutes.filter(r => r.id !== 'admin_reports_overview' && r.id !== 'admin_reports_sales').map(route => (
                    <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={route.name.replace('Admin: ', '')}>
                            <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{route.name.replace('Admin: ', '')}</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                
                {adminCoreRoutes.find(r => r.id === 'admin_reports_overview') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/reports')} tooltip="Reports">
                        <Link href="/admin/reports"><BarChart3 /><span>Reports</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarGroup>

              {adminMenuRoutes.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/menu-management')} tooltip="Menu Management">
                        <Link href="/admin/menu-management"><BotMessageSquare /><span>Menu Management</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/menu-management') && (
                        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminMenuRoutes.map(subRoute => (
                            <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{subRoute.name.replace('Admin: Menu ', '')}</span></Link>
                            </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
              )}

              {adminHrRoutes.length > 0 && <SidebarSeparator />}
              {adminHrRoutes.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/hr')} tooltip="Human Resources">
                      <Link href="/admin/hr"><UserCog /><span>Human Resources</span></Link>
                  </SidebarMenuButton>
                  {isActive('/admin/hr') && (
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {adminHrRoutes.map(subRoute => (
                        <SidebarMenuSubItem key={subRoute.id}>
                          <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)}>
                            <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), { className: "mr-2" })}<span>{subRoute.name.replace('Admin: HR ', '')}</span></Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
              
              {adminOperationsRoutes.length > 0 && <SidebarSeparator />}
              {adminOperationsRoutes.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Operations</SidebarGroupLabel>
                  {adminOperationsRoutes.map(route => (
                    <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={route.name.replace('Admin: ', '')}>
                            <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{route.name.replace('Admin: ', '')}</span></Link>
                        </SidebarMenuButton>
                        {route.id === 'admin_inventory' && isActive(route.path) && filterRoutesByGroup('Admin Operations').find(r => r.id === 'admin_stock_menu_mapping') && (
                            <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={isActive('/admin/inventory/stock-menu-mapping', true)}>
                                        <Link href="/admin/inventory/stock-menu-mapping"><Link2 className="mr-2"/>Stock-Menu Map</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                  ))}
                </SidebarGroup>
              )}

              {adminMarketingRoutes.length > 0 && <SidebarSeparator />}
              {adminMarketingRoutes.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/marketing')} tooltip="Marketing">
                        <Link href="/admin/marketing"><GalleryHorizontal /><span>Marketing</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/marketing') && (
                      <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminMarketingRoutes.map(subRoute => (
                          <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{subRoute.name.replace('Admin: Marketing ', '')}</span></Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
              )}

              {adminToolsRoutes.length > 0 && <SidebarSeparator />}
              {adminToolsRoutes.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/tools')} tooltip="Admin Tools">
                      <Link href="/admin/tools"><Contact2 /><span>Admin Tools</span></Link>
                  </SidebarMenuButton>
                  {isActive('/admin/tools') && (
                      <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminToolsRoutes.map(subRoute => (
                          <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{subRoute.name.replace('Admin: Tools ', '')}</span></Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
              )}

               {adminSettingsRoutes.length > 0 && <SidebarSeparator />}
               {adminSettingsRoutes.length > 0 && (
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/settings')} tooltip="Settings">
                        <Link href="/admin/settings"><Settings /><span>Settings</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/settings') && (
                        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                            {adminSettingsRoutes.map(subRoute => (
                                <SidebarMenuSubItem key={subRoute.id}>
                                    <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)}>
                                        <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className:"mr-2"})}<span>{subRoute.name.replace('Admin: Settings - ', '').replace('Admin: Settings ', '').replace('Admin: ', '')}</span></Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
               )}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton
                onClick={logout}
                className="w-full"
                tooltip="Log Out"
              >
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
