// src/app/(app)/admin/settings/redis-guide/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, AlertTriangle, KeyRound, Server } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RedisGuidePage() {
    const { user, isLoadingAuth } = useAuth();
    
    if (isLoadingAuth) {
        return (
             <div className="space-y-8 p-4">
                <Skeleton className="h-9 w-40 mb-4" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-6 w-3/4 mb-4" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (user?.role !== 'superadmin') {
        return (
          <div className="space-y-8 p-4">
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
            </Button>
            <Card className="shadow-xl border-destructive">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Access Denied</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">You do not have permission to view the Redis Guide.</p>
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
                    <Database className="mr-3 h-7 w-7" /> Redis Setup & Usage Guide
                </h1>
                <p className="text-muted-foreground">A technical guide for setting up and using Redis as a data source.</p>
            </div>

             <ScrollArea className="h-[calc(100vh-18rem)]">
                <div className="space-y-6 pr-4">
                     <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                            <CardDescription>
                                Redis can be used as a high-speed, in-memory data source for TableMaster. It's an excellent choice for production environments requiring fast read/write operations. The current implementation uses Redis primarily as a key-value store for JSON data.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle className="font-semibold">Implementation Status: Conceptual</AlertTitle>
                        <AlertDescription>
                           The Redis data provider (`/src/lib/redis.ts`) and dispatcher logic are in place, but data actions for most modules are not yet implemented. You will need to build out the `get` and `save` logic for each data type (e.g., `getUsersFromRedis`, `saveUsersToRedis`) to make it fully functional.
                        </AlertDescription>
                    </Alert>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><KeyRound className="mr-2"/>Configuration</CardTitle>
                            <CardDescription>To enable Redis, you must configure the following variables in your <code>.env</code> file at the project root.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                                <code>
                                    {`# --- REDIS DATA SOURCE ---\nDATA_SOURCE=redis\n\n# --- REDIS CONNECTION DETAILS ---\nREDIS_HOST=127.0.0.1\nREDIS_PORT=6379\nREDIS_PASSWORD=your_redis_password_here # Leave empty if no password`}
                                </code>
                            </pre>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong><code>DATA_SOURCE=redis</code></strong>: This is the most critical setting. It tells the application to use the Redis data provider.</li>
                                <li><strong><code>REDIS_HOST</code></strong>: The hostname or IP address of your Redis server. Defaults to <code>127.0.0.1</code>.</li>
                                <li><strong><code>REDIS_PORT</code></strong>: The port your Redis server is running on. Defaults to <code>6379</code>.</li>
                                <li><strong><code>REDIS_PASSWORD</code></strong>: The password for your Redis server. If your server does not require a password, you can leave this variable empty or omit it entirely.</li>
                            </ul>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Server className="mr-2"/>Data Storage Strategy</CardTitle>
                            <CardDescription>Understanding how data is stored in Redis is key to extending the functionality.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm">The current implementation is designed to store most data types as JSON strings under specific keys.</p>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                <li><strong>Settings Files:</strong> Single JSON objects (like General Settings) are stored under a unique key, for example: <code>settings:general</code>.</li>
                                <li><strong>Array-based Data:</strong> Collections of items (like Users or Menu Items) would conceptually be stored either as a single key holding a JSON array (e.g., <code>data:users</code>) or individually using a pattern (e.g., <code>user:[id]</code>) for more granular access.</li>
                            </ul>
                            <Alert variant="default" className="bg-sky-50 border-sky-300">
                                <AlertTriangle className="h-5 w-5 text-sky-600" />
                                <AlertTitle className="font-semibold text-sky-700">Action Required for Full Implementation</AlertTitle>
                                <AlertDescription className="text-sky-600">
                                   To make Redis fully operational, you must implement the data access logic for each data type in <code>/src/app/actions/data-management-actions.ts</code> within the <code>// TODO: Add Redis implementation</code> blocks. You would use the connected Redis client to perform `get`, `set`, and other commands.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
