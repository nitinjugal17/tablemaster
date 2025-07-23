
"use client"; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import { Menu as MenuIcon, UserCircle, LayoutDashboard, BedDouble, Terminal, ChefHat } from 'lucide-react'; 
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { useAuth } from '@/context/AuthContext'; 

const NavLinks = ({ isMobile = false, isAuthenticated = false }: { isMobile?: boolean, isAuthenticated?: boolean }) => (
  <nav className={`flex ${isMobile ? 'flex-col space-y-4 p-4' : 'space-x-4 items-center'}`}>
    <Button variant="ghost" asChild className={isMobile ? 'w-full text-left justify-start' : ''}>
      <Link href="/menu">Menu</Link>
    </Button>
    <Button variant="ghost" asChild className={isMobile ? 'w-full text-left justify-start' : ''}>
      <Link href="/rooms">Rooms</Link>
    </Button>
    <Button variant="ghost" asChild className={isMobile ? 'w-full text-left justify-start' : ''}>
      <Link href="/bookings">Book a Table</Link>
    </Button>
    {isAuthenticated && (
      <>
        <Button variant="ghost" asChild className={isMobile ? 'w-full text-left justify-start' : ''}>
          <Link href="/admin/pos">POS Terminal</Link>
        </Button>
        <Button variant="ghost" asChild className={isMobile ? 'w-full text-left justify-start' : ''}>
          <Link href="/chef-view">Chef View</Link>
        </Button>
      </>
    )}
    {isAuthenticated ? (
        <Button variant="default" asChild className={isMobile ? 'w-full' : ''}>
            <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4 md:hidden lg:inline-flex"/> Dashboard</Link>
        </Button>
    ) : (
        <Button variant="default" asChild className={isMobile ? 'w-full' : ''}>
            <Link href="/login">Login / Sign Up</Link>
        </Button>
    )}
  </nav>
);

const Header = () => {
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const { isAuthenticated, isLoadingAuth } = useAuth(); 

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {isLoadingSettings ? (
          <div className="animate-pulse h-8 w-32 bg-muted rounded-md"></div> 
        ) : (
          <Logo imageUrl={generalSettings.websiteHeaderLogoUrl} size="sm" />
        )}
        <div className="hidden md:flex">
          <NavLinks isAuthenticated={isAuthenticated} />
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="sr-only">
                <SheetTitle>Mobile Navigation Menu</SheetTitle>
                <SheetDescription>
                  A list of primary navigation links for the website, including menu, bookings, and account access.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                 {isLoadingSettings ? (
                    <div className="animate-pulse h-7 w-28 bg-muted rounded-md"></div>
                  ) : (
                    <Logo imageUrl={generalSettings.websiteHeaderLogoUrl} size="sm" />
                  )}
                </div>
                <NavLinks isMobile isAuthenticated={isAuthenticated}/>
                <div className="mt-auto p-4 border-t">
                   {isAuthenticated ? (
                     <Button variant="outline" asChild className="w-full">
                        <Link href="/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            My Account / Dashboard
                        </Link>
                    </Button>
                   ) : (
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/login">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Login / Sign Up
                        </Link>
                    </Button>
                   )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
