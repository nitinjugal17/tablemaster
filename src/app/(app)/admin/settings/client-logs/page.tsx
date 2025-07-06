
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MonitorSmartphone, RefreshCw, Loader2, AlertTriangle, ListFilter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getClientLogEntries } from "@/app/actions/logging-actions"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from "@/context/AuthContext"; // Import useAuth


export default function ClientLogsPage() {
  const { toast } = useToast();
  const { user: currentUser, isLoadingAuth } = useAuth(); // Use auth context
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // Renamed
  const [filterTerm, setFilterTerm] = useState("");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");

  const fetchClientLogs = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const fetchedLogs = await getClientLogEntries(500); 
      setLogs(fetchedLogs.reverse()); 
    } catch (error) {
      console.error("Failed to fetch client logs:", error);
      toast({
        title: "Error Fetching Client Logs",
        description: "Could not load client logs. Please check server console for details.",
        variant: "destructive",
      });
      setLogs(["[ERROR] Failed to fetch client logs from server."]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoadingAuth && currentUser?.role === 'superadmin') {
      fetchClientLogs();
    } else if (!isLoadingAuth && currentUser?.role !== 'superadmin') {
      setIsLoadingData(false);
    }
  }, [fetchClientLogs, currentUser, isLoadingAuth]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const lowerLog = log.toLowerCase();
      const lowerFilterTerm = filterTerm.toLowerCase();
      
      const matchesTerm = lowerFilterTerm === "" || lowerLog.includes(lowerFilterTerm);
      
      let matchesLevel = true;
      if (logLevelFilter !== "ALL") {
        matchesLevel = lowerLog.includes(`[${logLevelFilter.toLowerCase()}]`);
      }
      return matchesTerm && matchesLevel;
    });
  }, [logs, filterTerm, logLevelFilter]);

  if (isLoadingAuth || isLoadingData) {
    return (
         <div className="space-y-8">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
            </Button>
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading client logs...</p>
            </div>
        </div>
    );
  }

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <Card className="shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">You do not have permission to view Client Logs.</p>
            <p className="text-muted-foreground">This section is reserved for Super Administrators only.</p>
             <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <MonitorSmartphone className="mr-3 h-7 w-7" /> Client-Side Event Logs
        </h1>
        <p className="text-muted-foreground">View recent client-originated log entries sent to the server. Stored in `client-logs.txt`.</p>
      </div>
      
      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <AlertTriangle className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Client Log Implementation Note</AlertTitle>
        <AlertDescription className="text-sky-600">
          These logs are generated when client-side code explicitly calls a server action (<code>addClientLogEntry</code>) to record an event or error.
          This is not an automatic capture of all browser activity. The log file `client-logs.txt` is managed similarly to server logs.
        </AlertDescription>
      </Alert>

      <Card className="shadow-xl">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="font-headline">Client Log Viewer</CardTitle>
                    <CardDescription>Displaying up to 500 recent client log entries.</CardDescription>
                </div>
                <Button onClick={fetchClientLogs} disabled={isLoadingData} size="sm" variant="outline">
                    {isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh Logs
                </Button>
            </div>
             <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Input 
                    placeholder="Filter logs by text..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="h-9 flex-grow"
                />
                <Select value={logLevelFilter} onValueChange={setLogLevelFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          {isLoadingData && logs.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading client logs...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <ScrollArea className="h-[500px] border rounded-md bg-muted/30">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                {filteredLogs.join('\n')}
              </pre>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {filterTerm || logLevelFilter !== "ALL" ? "No client logs match your current filter." : "No client log entries found."}
            </p>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Client logs are sent from the browser and recorded by the server.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
