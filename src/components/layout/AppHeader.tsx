
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, UserCircle, LayoutDashboard, Loader2, Wifi, WifiOff } from 'lucide-react'; 
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/context/OfflineSyncProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const AppHeader = () => {
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const { isMobile, open: desktopSidebarOpen } = useSidebar();
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();
  const { isOnline } = useOfflineSync();

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U');
  const showLogoInHeader = (isMobile || !desktopSidebarOpen);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          {showLogoInHeader && (
            isLoadingSettings ? (
              <Skeleton className="h-8 w-32" /> 
            ) : (
              <Logo imageUrl={generalSettings.websiteHeaderLogoUrl} size="sm" />
            )
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOnline ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
                  <span className="sr-only">Network Status</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isOnline ? "You are online" : "You are offline"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isLoadingAuth ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${initials}`} alt={user.name || "User Avatar"} data-ai-hint="person avatar" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">Role: {user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
                <Link href="/login">Login / Sign Up</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
