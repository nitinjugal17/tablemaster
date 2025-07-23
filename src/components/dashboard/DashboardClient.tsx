
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarClock, ClipboardList, Users, Settings, BotMessageSquare, Loader2, DollarSign, Users2, Trophy, BarChart3, Star, Activity, TrendingUp, Building, MessageSquare, HeartPulse, Database, BedDouble, Handshake } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency"; 
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, Booking, MenuItem as MenuItemType, Employee } from '@/lib/types';
import { isWithinInterval, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

export interface DashboardStats {
  activeBookings: number;
  pendingOrders: number;
  menuItems: number;
  revenueTodayBase: number;
  thresholdMet: boolean;
  bonusPool: number;
  bonusPerEmployee: number;
  employeeCount: number;
  revenueThreshold: number;
}

const StatCard = ({ title, value, description, icon: Icon }: { title: string, value: string, description: string, icon: React.ElementType }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-4xl font-bold text-primary">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
);

export const StatCardSkeleton = () => (
    <Card>
        <CardHeader className="pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-10 w-3/4" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-3 w-full" />
        </CardContent>
    </Card>
);

function LinkCard({ name, href, icon: Icon }: { name: string, href: string, icon: React.ElementType }) {
  const { t } = useTranslation('dashboard');
  return (
    <Button variant="outline" asChild className="h-auto p-0 shadow-sm hover:shadow-md transition-shadow">
      <Link href={href} className="flex flex-col items-center justify-center p-6 space-y-2 text-center h-full">
          <Icon className="h-10 w-10 text-accent mb-2" />
          <span className="font-semibold text-foreground">{name}</span>
          <span className="text-xs text-primary flex items-center">
            {t('goToLink', { name: name.toLowerCase() })} <ArrowRight className="ml-1 h-3 w-3" />
          </span>
      </Link>
    </Button>
  );
}

interface DashboardClientProps {
    initialOrders: Order[];
    initialBookings: Booking[];
    initialMenuItems: MenuItemType[];
    initialEmployees: Employee[];
}

export function DashboardClient({ initialOrders, initialBookings, initialMenuItems, initialEmployees }: DashboardClientProps) {
  const { t } = useTranslation('dashboard');
  const { currencySymbol, convertPrice } = useCurrency();
  const { user, isLoadingAuth } = useAuth();
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const router = useRouter();

  const isLoading = isLoadingAuth || isLoadingSettings;

  const stats: DashboardStats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const activeBookings = initialBookings.filter(b => b.status === 'confirmed').length;
    const pendingOrders = initialOrders.filter(o => ['Pending', 'Preparing'].includes(o.status)).length;
    const menuItemsCount = initialMenuItems.length;

    const todaysCompletedOrders = initialOrders.filter(order => {
        try {
            if (order.status !== 'Completed' || !order.createdAt) return false;
            const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt;
            return isValid(orderDate) && isWithinInterval(orderDate, { start: todayStart, end: todayEnd });
        } catch { return false; }
    });
    const revenueTodayBase = todaysCompletedOrders.reduce((sum, order) => sum + order.total, 0);
    const revenueThreshold = generalSettings?.dailyRevenueThreshold || 0;
    const maxBonusPool = generalSettings?.employeeBonusAmount || 0;
    const bonusPercentage = generalSettings?.bonusPercentageAboveThreshold || 0;
    const employeeCount = initialEmployees.length > 0 ? initialEmployees.length : 1;
    
    const thresholdMet = revenueThreshold > 0 && revenueTodayBase >= revenueThreshold;
    let finalBonusPool = 0;
    let bonusPerEmployee = 0;

    if (thresholdMet && bonusPercentage > 0) {
        const revenueAboveThreshold = revenueTodayBase - revenueThreshold;
        let calculatedBonusPool = revenueAboveThreshold * (bonusPercentage / 100);

        if (maxBonusPool > 0) {
          calculatedBonusPool = Math.min(calculatedBonusPool, maxBonusPool);
        }
        finalBonusPool = calculatedBonusPool;
        bonusPerEmployee = finalBonusPool / employeeCount;
    }

    return {
      activeBookings,
      pendingOrders,
      menuItems: menuItemsCount,
      revenueTodayBase,
      thresholdMet,
      bonusPool: finalBonusPool,
      bonusPerEmployee,
      employeeCount,
      revenueThreshold
    };
  }, [initialBookings, initialOrders, initialMenuItems, generalSettings, initialEmployees]);

  const adminLinksPanel = [
    { nameKey: 'aiMenuToolsLink', href: '/admin/menu-management', icon: BotMessageSquare },
    { nameKey: 'manageAllOrdersLink', href: '/admin/orders', icon: ClipboardList },
    { nameKey: 'userManagementLink', href: '/admin/user-management', icon: Users },
    { nameKey: 'systemSettingsLink', href: '/admin/settings', icon: Settings }
  ];

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push('/login');
    }
  }, [isLoadingAuth, user, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">{t('loadingDashboard')}</p>
      </div>
    );
  }
  
  if (!user) return null;

  const displayRevenueToday = convertPrice(stats.revenueTodayBase);
  const revenueThresholdInDisplay = convertPrice(stats.revenueThreshold);
  const revenueProgress = revenueThresholdInDisplay > 0 
    ? Math.min((displayRevenueToday / revenueThresholdInDisplay) * 100, 100) 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
          {user?.name ? t('pageTitleWithName', { name: user.name }) : t('pageTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('pageDescription')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('activeBookings')} value={stats.activeBookings.toString()} description={t('activeBookingsDescription')} icon={CalendarClock}/>
        <StatCard title={t('pendingOrders')} value={stats.pendingOrders.toString()} description={t('pendingOrdersDescription')} icon={ClipboardList}/>
        <StatCard title={t('menuItems')} value={stats.menuItems.toString()} description={t('menuItemsDescription')} icon={BookOpenText}/>
        <StatCard title={t('revenueToday')} value={`${currencySymbol}${displayRevenueToday.toFixed(2)}`} description={t('revenueTodayDescription')} icon={DollarSign}/>
      </div>

      {!isLoadingSettings && (generalSettings.employeeBonusAmount ?? 0) > 0 && (generalSettings.dailyRevenueThreshold ?? 0) > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-primary">
              <Trophy className="mr-2 text-yellow-500" /> Daily Employee Bonus Tracker
            </CardTitle>
            <CardDescription>
              {`The bonus is calculated on revenue exceeding the target of ${currencySymbol}${convertPrice(stats?.revenueThreshold || 0).toFixed(2)}, capped at a maximum pool of ${currencySymbol}${convertPrice(generalSettings.employeeBonusAmount || 0).toFixed(2)}, shared among ${stats?.employeeCount} employees.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.thresholdMet ? (
              <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 rounded-lg text-center">
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">🎉 Goal Achieved! 🎉</h3>
                  <p className="text-green-600 dark:text-green-400">Bonus of <strong>{currencySymbol}{convertPrice(stats.bonusPerEmployee).toFixed(2)}</strong> unlocked per employee!</p>
              </div>
            ) : (
              <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{currencySymbol}{displayRevenueToday.toFixed(2)} / {currencySymbol}{revenueThresholdInDisplay.toFixed(2)}</span>
                  </div>
                  <Progress value={revenueProgress} className="w-full h-3" />
                  <p className="text-xs text-center text-muted-foreground mt-1">{Math.round(revenueProgress)}% towards today's goal</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user?.role === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-accent">{t('adminPanelTitle')}</CardTitle>
            <CardDescription>{t('adminPanelDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {adminLinksPanel.map((link) => (
              <LinkCard key={link.href} name={t(link.nameKey)} href={link.href} icon={link.icon} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('recentActivityTitle')}</CardTitle>
          <CardDescription>{t('recentActivityDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('noRecentActivity')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
