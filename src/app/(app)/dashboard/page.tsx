
"use client"; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarClock, ClipboardList, Users, Settings, BotMessageSquare, Loader2, DollarSign, Users2, Trophy, BarChart3, Star } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency"; 
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getOrders, getMenuItems, getBookings, getEmployees } from '@/app/actions/data-management-actions';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
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


export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { currencySymbol, convertPrice } = useCurrency(); 
  const { user, isLoadingAuth } = useAuth();
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const adminLinksPanel = [
    { nameKey: 'aiMenuToolsLink', href: '/admin/menu-management', icon: BotMessageSquare },
    { nameKey: 'manageAllOrdersLink', href: '/admin/orders', icon: ClipboardList },
    { nameKey: 'userManagementLink', href: '/admin/user-management', icon: Users },
    { nameKey: 'systemSettingsLink', href: '/admin/settings', icon: Settings }
  ];

  // This effect handles redirection if the user is not authenticated.
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push('/login');
    }
  }, [isLoadingAuth, user, router]);

  useEffect(() => {
    // We only fetch data if we know a user is logged in.
    if (isLoadingAuth || isLoadingSettings || !user) return;

    async function fetchDashboardData() {
      setIsLoadingStats(true);
      try {
        const [orders, menuItems, bookings, employees] = await Promise.all([
          getOrders(), getMenuItems(), getBookings(), getEmployees()
        ]);
        
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
        const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
        const menuItemsCount = menuItems.length;

        const todaysCompletedOrders = orders.filter(order => {
          try {
            return order.status === 'Completed' && isWithinInterval(parseISO(order.createdAt), { start: todayStart, end: todayEnd });
          } catch { return false; }
        });
        const revenueTodayBase = todaysCompletedOrders.reduce((sum, order) => sum + order.total, 0);

        const revenueThreshold = generalSettings.dailyRevenueThreshold || 0;
        const maxBonusPool = generalSettings.employeeBonusAmount || 0;
        const bonusPercentage = generalSettings.bonusPercentageAboveThreshold || 0;
        const employeeCount = employees.length > 0 ? employees.length : 1;
        
        const thresholdMet = revenueThreshold > 0 && revenueTodayBase >= revenueThreshold;
        let finalBonusPool = 0;
        let bonusPerEmployee = 0;

        if (thresholdMet) {
            const revenueAboveThreshold = revenueTodayBase - revenueThreshold;
            let calculatedBonusPool = revenueAboveThreshold * (bonusPercentage / 100);

            if (maxBonusPool > 0) {
              calculatedBonusPool = Math.min(calculatedBonusPool, maxBonusPool);
            }
            finalBonusPool = calculatedBonusPool;
            bonusPerEmployee = finalBonusPool / employeeCount;
        }

        setStats({
          activeBookings,
          pendingOrders,
          menuItems: menuItemsCount,
          revenueTodayBase,
          thresholdMet,
          bonusPool: finalBonusPool,
          bonusPerEmployee,
          employeeCount,
          revenueThreshold
        });

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchDashboardData();
  }, [isLoadingAuth, isLoadingSettings, user]); // Removed generalSettings from dependencies to fix infinite loop
  
  const displayRevenueToday = stats ? convertPrice(stats.revenueTodayBase) : 0;

  // This loading state now correctly covers the period before redirection happens.
  if (isLoadingAuth || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">{t('loadingDashboard')}</p>
      </div>
    );
  }

  const revenueProgress = stats && stats.revenueThreshold > 0 
    ? Math.min((stats.revenueTodayBase / stats.revenueThreshold) * 100, 100) 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">
          {user?.name ? t('pageTitleWithName', { name: user.name }) : t('pageTitle')}
        </h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Stats Cards - Visible to all authenticated users */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingStats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title={t('activeBookings')} value={stats?.activeBookings.toString() || '0'} description={t('activeBookingsDescription')} />
            <StatCard title={t('pendingOrders')} value={stats?.pendingOrders.toString() || '0'} description={t('pendingOrdersDescription')} />
            <StatCard title={t('menuItems')} value={stats?.menuItems.toString() || '0'} description={t('menuItemsDescription')} />
            <StatCard title={t('revenueToday')} value={`${currencySymbol}${displayRevenueToday.toFixed(2)}`} description={t('revenueTodayDescription')} />
          </>
        )}
      </div>

       {/* Daily Bonus Card - Visible to all authenticated users */}
      {!isLoadingSettings && (generalSettings.employeeBonusAmount ?? 0) > 0 && (generalSettings.dailyRevenueThreshold ?? 0) > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-primary">
              <Trophy className="mr-2 text-yellow-500" /> Daily Employee Bonus Tracker
            </CardTitle>
            <CardDescription>
              {isLoadingStats ? <Skeleton className="h-4 w-3/4" /> : `The bonus is calculated on revenue exceeding the target of ${currencySymbol}${convertPrice(stats?.revenueThreshold || 0).toFixed(2)}, capped at a maximum pool of ${currencySymbol}${convertPrice(generalSettings.employeeBonusAmount || 0).toFixed(2)}, shared among ${stats?.employeeCount} employees.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStats ? <Skeleton className="h-16 w-full"/> : (
              stats?.thresholdMet ? (
                <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">🎉 Goal Achieved! 🎉</h3>
                    <p className="text-green-600 dark:text-green-400">Bonus of <strong>{currencySymbol}{convertPrice(stats.bonusPerEmployee).toFixed(2)}</strong> unlocked per employee!</p>
                </div>
              ) : (
                <div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{currencySymbol}{displayRevenueToday.toFixed(2)} / {currencySymbol}{convertPrice(stats?.revenueThreshold || 0).toFixed(2)}</span>
                    </div>
                    <Progress value={revenueProgress} className="w-full h-3" />
                    <p className="text-xs text-center text-muted-foreground mt-1">{Math.round(revenueProgress)}% towards today's goal</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Panel Links (Conditional - Superadmin only) */}
      {user?.role === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-accent">{t('adminPanelTitle')}</CardTitle>
            <CardDescription>{t('adminPanelDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {adminLinksPanel.map((link) => (
              <LinkCard key={link.href} name={t(link.nameKey)} href={link.href} icon={link.icon} tFunction={t}/>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity (Placeholder) */}
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

interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

const StatCardSkeleton = () => (
    <Card>
        <CardHeader className="pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-10 w-3/4" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-3 w-full" />
        </CardContent>
    </Card>
)

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-4xl font-bold text-primary">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface LinkCardProps {
  name: string;
  href: string;
  icon: React.ElementType;
  tFunction: (key: string, options?: any) => string; // Pass t function for sub-component
}

function LinkCard({ name, href, icon: Icon, tFunction }: LinkCardProps) {
  return (
    <Button variant="outline" asChild className="h-auto p-0 shadow-sm hover:shadow-md transition-shadow">
      <Link href={href} className="flex flex-col items-center justify-center p-6 space-y-2 text-center h-full">
          <Icon className="h-10 w-10 text-accent mb-2" />
          <span className="font-semibold text-foreground">{name}</span>
          <span className="text-xs text-primary flex items-center">
            {tFunction('goToLink', { name: name.toLowerCase() })} <ArrowRight className="ml-1 h-3 w-3" />
          </span>
      </Link>
    </Button>
  );
}
