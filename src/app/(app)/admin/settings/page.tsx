// src/app/(app)/admin/settings/data-management/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReceiptText, Mail, KeyRound, Settings as SettingsIcon, ChevronRight, DatabaseZap, SlidersHorizontal, Lock, DollarSign, UserCog, Gauge, Server, MonitorSmartphone, Palette, LayoutGrid, AlertTriangle, ImagePlus, BookOpen, Star, Handshake, HeartPulse, Database } from "lucide-react"; 
import { ALL_APPLICATION_ROUTES, AppRoute } from "@/lib/types"; 
import { useAuth } from "@/context/AuthContext"; 
import React, { useEffect, useState } from 'react'; 
import { getRolePermissions as getRolePermissionsAction } from '@/app/actions/data-management-actions'; 
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';

const getIconForRoute = (routeId: string): React.ElementType => {
    const route = ALL_APPLICATION_ROUTES.find(r => r.id === routeId);
    if (!route) return AlertTriangle; 
    
    const iconMap: Record<string, React.ElementType> = {
      'admin_settings_general': SlidersHorizontal, 'admin_settings_theme': Palette,
      'admin_settings_currency_rates': DollarSign, 'admin_settings_invoice': ReceiptText,
      'admin_settings_notifications': Mail, 'admin_settings_auth': KeyRound,
      'admin_settings_rate_limiting': Gauge, 'admin_settings_data_management': DatabaseZap,
      'admin_settings_encryption': Lock, 'admin_settings_access_control': UserCog,
      'admin_settings_homepage_layout': LayoutGrid,
      'admin_settings_menu_category_visuals': ImagePlus,
      'admin_settings_server_logs': Server, 
      'admin_settings_client_logs': MonitorSmartphone,
      'admin_settings_developer_guide': BookOpen,
      'admin_settings_loyalty': Star,
      'admin_settings_redis_guide': Database,
      'admin_settings_system_health': HeartPulse,
      'admin_settings_integrations': Handshake,
    };
    return iconMap[routeId] || SettingsIcon; 
  };

const SettingsCardSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-lg font-headline">
        <Skeleton className="h-6 w-36" />
      </CardTitle>
      <Skeleton className="h-6 w-6 rounded-sm" />
    </CardHeader>
    <CardContent className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </CardContent>
    <CardFooter>
      <Skeleton className="h-9 w-full rounded-md" />
    </CardFooter>
  </Card>
);

interface LinkCardProps {
  name: string;
  href: string;
  icon: React.ElementType; 
  description: string;
}

function LinkCard({ name, href, icon: Icon, description }: LinkCardProps) {
  const { t } = useTranslation('sidebar'); // Changed from 'dashboard' to 'sidebar'
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-headline text-primary">{name}</CardTitle>
        <Icon className="h-6 w-6 text-accent" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 h-10">
          {description}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={href}>
            {t('configure')} {name} <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { user, isLoadingAuth } = useAuth();
  const [accessibleSettingsLinks, setAccessibleSettingsLinks] = useState<AppRoute[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const { t, ready: isTranslationReady } = useTranslation(['sidebar']);

  useEffect(() => {
    async function fetchAndFilterSettingsLinks() {
      if (!isLoadingAuth && user) {
        setIsLoadingPermissions(true);
        try {
          const allPermissions = await getRolePermissionsAction();
          const currentUserPerm = allPermissions.find(p => p.roleName === user.role);
          const allowedRouteIds = new Set(currentUserPerm ? currentUserPerm.allowedRouteIds : []);
          
          if (user.role === 'superadmin') { 
            setAccessibleSettingsLinks(ALL_APPLICATION_ROUTES.filter(link => link.group === 'Admin Settings' && link.id !== 'admin_settings_overview'));
          } else {
            const filtered = ALL_APPLICATION_ROUTES.filter(link =>
              link.group === 'Admin Settings' &&
              link.id !== 'admin_settings_overview' &&
              allowedRouteIds.has(link.id)
            );
            setAccessibleSettingsLinks(filtered);
          }
        } catch (error) {
          console.error("Failed to fetch or filter settings links:", error);
          setAccessibleSettingsLinks([]);
        } finally {
          setIsLoadingPermissions(false);
        }
      } else if (!isLoadingAuth && !user) {
        setAccessibleSettingsLinks([]);
        setIsLoadingPermissions(false);
      }
    }
    fetchAndFilterSettingsLinks();
  }, [user, isLoadingAuth]);

  const isLoading = isLoadingAuth || isLoadingPermissions || !isTranslationReady;

  if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-headline font-bold text-primary">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view admin settings.</p>
            </div>
             <Card className="shadow-xl border-destructive">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-destructive flex items-center">
                    <AlertTriangle className="mr-2 h-6 w-6" /> Restricted Area
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This section is for administrators only.</p>
                    <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Admin Settings</h1>
        <p className="text-muted-foreground">Configure various aspects of your TableMaster application.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SettingsCardSkeleton key={i} />)
        ) : accessibleSettingsLinks.length > 0 ? (
          accessibleSettingsLinks.map((link) => (
              <LinkCard 
                key={link.id} 
                name={t(link.nameKey)} 
                href={link.path} 
                icon={getIconForRoute(link.id)}
                description={t(link.description || '')}
              />
          ))
        ) : (
            <Card className="md:col-span-3">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">You do not have access to any specific settings modules.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
