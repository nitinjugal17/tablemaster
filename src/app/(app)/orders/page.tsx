
"use client";
import OrderCard from '@/components/orders/OrderCard';
import type { Order } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react'; 
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Loader2, RefreshCw, Timer } from 'lucide-react'; // Added RefreshCw, Timer
import { parseISO, isValid } from 'date-fns';
import { getOrders } from '@/app/actions/data-management-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Button } from '@/components/ui/button'; // Import Button
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all fetched orders
  const [myOrders, setMyOrders] = useState<Order[]>([]); // Store user-specific orders
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isLoadingAuth } = useAuth(); // Get current user

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(60);

  const fetchUserOrdersData = useCallback(async () => {
    if (isLoadingAuth || !user) {
      if (!isLoadingAuth && !user) setIsLoading(false); // Stop loading if no user and auth check done
      return;
    }
    setIsLoading(true);
    try {
      const fetchedOrders = await getOrders(); 
      setAllOrders(fetchedOrders);
      // Filter orders by matching userId with the logged-in user's ID
      const userSpecificOrders = fetchedOrders.filter(order => order.userId === user.id);
      setMyOrders(userSpecificOrders);
    } catch (error) {
      console.error("Failed to fetch user orders:", error);
       toast({
        title: "Error Loading My Orders",
        description: "Could not load your orders from data source.",
        variant: "destructive",
      });
      setMyOrders([]);
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, isLoadingAuth]);

  useEffect(() => {
    fetchUserOrdersData();
  }, [fetchUserOrdersData]);

  // Auto-refresh logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled && user) {
      intervalId = setInterval(() => {
        toast({ title: "Refreshing Your Orders...", duration: 1500 });
        fetchUserOrdersData();
      }, refreshIntervalSeconds * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshIntervalSeconds, fetchUserOrdersData, user, toast]);

  // Client-side filtering of myOrders based on tab selection
  const filteredMyOrders = myOrders.filter(order => {
    if (filter === 'active') return order.status !== 'Completed' && order.status !== 'Cancelled';
    if (filter === 'completed') return order.status === 'Completed' || order.status === 'Cancelled';
    return true; // 'all'
  }).sort((a, b) => {
    try {
        const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : a.createdAt;
        const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : b.createdAt;
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
    } catch(e) {
      console.error("Error sorting orders by date:", e);
      return 0;
    }
  });

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Please Log In</h2>
        <p className="text-muted-foreground">Log in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">My Orders</h1>
            <p className="text-muted-foreground">Track your current and past orders.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
            <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/50 w-full sm:w-auto">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="autoRefreshOrders" className="text-sm font-medium whitespace-nowrap">Auto-Refresh:</Label>
                <Switch
                    id="autoRefreshOrders"
                    checked={autoRefreshEnabled}
                    onCheckedChange={setAutoRefreshEnabled}
                    aria-label="Toggle auto refresh orders"
                />
                {autoRefreshEnabled && (
                    <Select
                    value={String(refreshIntervalSeconds)}
                    onValueChange={(value) => setRefreshIntervalSeconds(Number(value))}
                    >
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30">30s</SelectItem>
                        <SelectItem value="60">60s</SelectItem>
                        <SelectItem value="120">2m</SelectItem>
                        <SelectItem value="300">5m</SelectItem>
                    </SelectContent>
                    </Select>
                )}
            </div>
            <Button onClick={fetchUserOrdersData} variant="outline" size="sm" disabled={isLoading} className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} />
                Refresh Now
            </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed/Cancelled</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && myOrders.length === 0 ? ( // Show loading if isLoading is true AND no orders loaded yet
        <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading your orders...</p>
        </div>
      ) : filteredMyOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMyOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ClipboardList className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Orders Found</h2>
          <p className="text-muted-foreground">
            {filter === 'active' ? "You have no active orders." : 
             filter === 'completed' ? "You have no completed or cancelled orders." :
             "You haven't placed any orders yet."}
          </p>
        </div>
      )}
    </div>
  );
}
