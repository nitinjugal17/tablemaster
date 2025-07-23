
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
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
  useSidebar, // Import useSidebar hook
} from '@/components/ui/sidebar';
import Logo from './Logo';
import {
  LayoutDashboard, BookOpenText, CalendarClock, ClipboardList, Users, Settings, ChefHat, BotMessageSquare, LogOut,
  ReceiptText, Mail, KeyRound, DatabaseZap, SlidersHorizontal, Lock, DollarSign, ClipboardCheck, Columns3,
  CalendarCheck, UserCog, GalleryHorizontal, Gift, Image as ImageIconLucide, Tag, Archive, CreditCard as ExpenseIcon,
  Link2, Gauge, Terminal, Contact2, Palette, Server, MonitorSmartphone, AlertTriangle, ImagePlus, LayoutGrid, UserPlus, FileArchive, FileText, BarChart3, Star, Activity, TrendingUp, Building, MessageSquare, HeartPulse, Database, BedDouble, Handshake
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { RolePermission, AppRoute } from '@/lib/types';
import { ALL_APPLICATION_ROUTES } from '@/lib/types';
import { getRolePermissions as getRolePermissionsAction } from '@/app/actions/data-management-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

const AppSidebar = () => {
  const pathname = usePathname();
  const { user, isLoadingAuth, logout } = useAuth();
  const { setOpenMobile } = useSidebar(); // Get the function to close the mobile sidebar
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const { t, i18n, ready: isTranslationReady } = useTranslation(['sidebar']);

  useEffect(() => {
    async function fetchPermissions() {
      if (!isLoadingAuth && user) {
        setIsLoadingPermissions(true);
        try {
          const allPermissions = await getRolePermissionsAction();
          const currentUserPerm = allPermissions.find(p => p.roleName === user.role);
          
          let allowedRoutes: string[] = [];
          if (currentUserPerm?.allowedRouteIds) {
              if (Array.isArray(currentUserPerm.allowedRouteIds)) {
                  allowedRoutes = currentUserPerm.allowedRouteIds;
              } else if (typeof currentUserPerm.allowedRouteIds === 'string') {
                  if (currentUserPerm.allowedRouteIds.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(currentUserPerm.allowedRouteIds);
                        if (Array.isArray(parsed)) allowedRoutes = parsed;
                    } catch (e) {
                        console.error("Failed to parse allowedRouteIds JSON string:", e);
                    }
                  } else {
                    allowedRoutes = currentUserPerm.allowedRouteIds.split(',').map(s => s.trim()).filter(Boolean);
                  }
              }
          }
          setUserPermissions(allowedRoutes);

        } catch (error) {
          console.error("Failed to fetch role permissions:", error);
          setUserPermissions([]);
        } finally {
          setIsLoadingPermissions(false);
        }
      } else if (!isLoadingAuth && !user) {
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
    if (isLoadingPermissions) return false;
    if (user?.role === 'superadmin') return true;
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
  const adminReportsRoutes = ALL_APPLICATION_ROUTES.filter(route => route.group === 'Admin Reports' && hasAccess(route.id) && route.id !== 'admin_reports_overview');

  const getIconForRoute = (routeId: string): React.ElementType => {
    const route = ALL_APPLICATION_ROUTES.find(r => r.id === routeId);
    if (!route) return AlertTriangle; 
    
    const iconMap: Record<string, React.ElementType> = {
      'dashboard': LayoutDashboard, 'menu_public': BookOpenText, 'bookings_public': CalendarClock,
      'rooms_public': BedDouble,
      'orders_public': ClipboardList, 'chef_view': ClipboardCheck,
      'attendance_user': CalendarCheck, 'contact_public': Mail, 'user_guide_public': BookOpenText, 
      'faq_public': BookOpenText, 'disclaimer_public': AlertTriangle, 'terms_public': FileText,
      'admin_pos': Terminal, 'admin_menu_management': BotMessageSquare, 'admin_bookings_management': CalendarCheck,
      'admin_tables_management': Columns3, 'admin_rooms_management': BedDouble, 'admin_orders_management': ClipboardList, 'admin_user_management': Users,
      'admin_outlets_management': Building,
      'admin_reports_overview': BarChart3,
      'admin_reports_sales': TrendingUp,
      'admin_reports_operational': Activity,
      'admin_reports_financial': DollarSign,
      'admin_reports_feedback': MessageSquare,
      'admin_settings_overview': Settings, 'admin_settings_general': SlidersHorizontal, 'admin_settings_theme': Palette,
      'admin_settings_currency_rates': DollarSign, 'admin_settings_invoice': ReceiptText,
      'admin_settings_notifications': Mail, 'admin_settings_auth': KeyRound,
      'admin_settings_loyalty': Star,
      'admin_settings_data_management': DatabaseZap, 'admin_settings_encryption': Lock, 'admin_settings_access_control': UserCog,
      'admin_settings_rate_limiting': Gauge, 'admin_settings_homepage_layout': LayoutGrid,
      'admin_settings_menu_category_visuals': ImagePlus, 
      'admin_settings_server_logs': Server, 
      'admin_settings_client_logs': MonitorSmartphone, 'admin_settings_developer_guide': BookOpenText,
      'admin_settings_redis_guide': Database,
      'admin_settings_system_health': HeartPulse,
      'admin_settings_integrations': Handshake,
      'admin_inventory': Archive, 
      'admin_expenses': ExpenseIcon,
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

  const isLoading = isLoadingAuth || isLoadingPermissions || !isTranslationReady;

  if (isLoading) {
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
  
  if (!user) {
    return null;
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
                <SidebarMenuButton asChild isActive={isActive('/dashboard', true)} tooltip={t(t('dashboard'))} onClick={() => setOpenMobile(false)}>
                <Link href="/dashboard"><LayoutDashboard /><span>{t('dashboard')}</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {generalRoutes.length > 1 && (
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t('restaurantGroup')}</SidebarGroupLabel>
                {generalRoutes.filter(r => r.id !== 'dashboard').map(route => (
                    <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={t(route.nameKey)} onClick={() => setOpenMobile(false)}>
                            <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{t(route.nameKey)}</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarGroup>
          )}

          {(adminCoreRoutes.length > 0 || adminMenuRoutes.length > 0 || adminHrRoutes.length > 0 || adminSettingsRoutes.length > 0 || adminMarketingRoutes.length > 0 || adminOperationsRoutes.length > 0 || adminToolsRoutes.length > 0) && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t('adminPanelGroup')}</SidebarGroupLabel>
                {adminCoreRoutes.map(route => (
                    <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={t(route.nameKey)} onClick={() => setOpenMobile(false)}>
                            <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{t(route.nameKey)}</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
              </SidebarGroup>

              {adminReportsRoutes.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/reports')} tooltip={t('admin.reports.overview')} onClick={() => setOpenMobile(false)}>
                        <Link href="/admin/reports"><BarChart3 /><span>{t('admin.reports.overview')}</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/reports') && (
                        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminReportsRoutes.map(subRoute => (
                            <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{t(subRoute.nameKey)}</span></Link>
                            </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
              )}

              {adminMenuRoutes.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/menu-management')} tooltip={t('admin.menu.overview')} onClick={() => setOpenMobile(false)}>
                        <Link href="/admin/menu-management"><BotMessageSquare /><span>{t('admin.menu.overview')}</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/menu-management') && (
                        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminMenuRoutes.map(subRoute => (
                            <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{t(subRoute.nameKey)}</span></Link>
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
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/hr')} tooltip={t('admin.hr.overview')} onClick={() => setOpenMobile(false)}>
                      <Link href="/admin/hr"><UserCog /><span>{t('admin.hr.overview')}</span></Link>
                  </SidebarMenuButton>
                  {isActive('/admin/hr') && (
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {adminHrRoutes.map(subRoute => (
                        <SidebarMenuSubItem key={subRoute.id}>
                          <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                            <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), { className: "mr-2" })}<span>{t(subRoute.nameKey)}</span></Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
              
              {adminOperationsRoutes.length > 0 && <SidebarSeparator />}
              {adminOperationsRoutes.map(route => (
                <SidebarMenuItem key={route.id}>
                    <SidebarMenuButton asChild isActive={isActive(route.path)} tooltip={t(route.nameKey)} onClick={() => setOpenMobile(false)}>
                        <Link href={route.path}>{React.createElement(getIconForRoute(route.id))}<span>{t(route.nameKey)}</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {adminMarketingRoutes.length > 0 && <SidebarSeparator />}
              {adminMarketingRoutes.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/marketing')} tooltip={t('admin.marketing.overview')} onClick={() => setOpenMobile(false)}>
                        <Link href="/admin/marketing"><GalleryHorizontal /><span>{t('admin.marketing.overview')}</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/marketing') && (
                      <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminMarketingRoutes.map(subRoute => (
                          <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{t(subRoute.nameKey)}</span></Link>
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
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/tools')} tooltip={t('admin.tools.overview')} onClick={() => setOpenMobile(false)}>
                      <Link href="/admin/tools"><Contact2 /><span>{t('admin.tools.overview')}</span></Link>
                  </SidebarMenuButton>
                  {isActive('/admin/tools') && (
                      <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                        {adminToolsRoutes.map(subRoute => (
                          <SidebarMenuSubItem key={subRoute.id}>
                            <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                                <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className: "mr-2"})}<span>{t(subRoute.nameKey)}</span></Link>
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
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/settings')} tooltip={t('admin.settings.overview')} onClick={() => setOpenMobile(false)}>
                        <Link href="/admin/settings"><Settings /><span>{t('admin.settings.overview')}</span></Link>
                    </SidebarMenuButton>
                    {isActive('/admin/settings') && (
                        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                            {adminSettingsRoutes.map(subRoute => (
                                <SidebarMenuSubItem key={subRoute.id}>
                                    <SidebarMenuSubButton asChild isActive={isActive(subRoute.path, true)} onClick={() => setOpenMobile(false)}>
                                        <Link href={subRoute.path}>{React.createElement(getIconForRoute(subRoute.id), {className:"mr-2"})}<span>{t(subRoute.nameKey)}</span></Link>
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
                onClick={() => {
                    logout();
                    setOpenMobile(false);
                }}
                className="w-full"
                tooltip={t('logout')}
              >
              <LogOut />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
