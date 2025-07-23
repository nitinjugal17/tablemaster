
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, AlertTriangle, FileJson2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { runAllSystemHealthChecks } from '@/app/actions/system-health-actions';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestResult {
    module: string;
    test: string;
    status: 'success' | 'failure';
    duration: number;
    message: string;
    details?: any;
}

export default function SystemHealthPage() {
    const { user, isLoadingAuth } = useAuth();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleRunTests = async () => {
        setIsRunning(true);
        setResults([]);
        try {
            const testResults = await runAllSystemHealthChecks();
            setResults(testResults);
        } catch (error) {
            setResults([{
                module: 'System',
                test: 'Overall Execution',
                status: 'failure',
                duration: 0,
                message: 'A critical error occurred while running the test suite.',
                details: (error as Error).message
            }]);
        } finally {
            setIsRunning(false);
        }
    };
    
    if (isLoadingAuth) {
        return <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (user?.role !== 'superadmin') {
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
                <p className="text-lg">You do not have permission to view this page.</p>
                <p className="text-muted-foreground">This tool is for Super Administrators only.</p>
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
                <h1 className="text-3xl font-headline font-bold text-primary">System Health Check</h1>
                <p className="text-muted-foreground">Run automated end-to-end tests to verify core application functionality.</p>
            </div>
            <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="font-semibold">Warning: Experimental Tool</AlertTitle>
                <AlertDescription>
                   This tool is designed to be safe by taking snapshots and restoring data, but running it on a production system with live users is not recommended. Always back up your data first.
                </AlertDescription>
            </Alert>
            <Card>
                <CardHeader>
                    <CardTitle>Run All System Tests</CardTitle>
                    <CardDescription>Click the button below to start a comprehensive suite of CRUD tests for all major modules.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRunTests} disabled={isRunning}>
                        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        {isRunning ? 'Running Tests...' : 'Start Health Check'}
                    </Button>
                </CardContent>
            </Card>

            {results.length > 0 && (
                 <Card>
                    <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {results.map((result, index) => (
                                <AccordionItem value={`item-${index}`} key={index} className="border-b">
                                    <AccordionTrigger className="hover:no-underline text-left">
                                        <div className="grid grid-cols-[150px_120px_120px_1fr_100px] items-center w-full gap-4 text-sm">
                                            <span className="font-semibold truncate">{result.module}</span>
                                            <span className="truncate">{result.test}</span>
                                            <span className={`flex items-center ${result.status === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                                {result.status === 'success' ? <CheckCircle className="mr-1 h-4 w-4"/> : <XCircle className="mr-1 h-4 w-4"/>}
                                                {result.status === 'success' ? 'Success' : 'Failure'}
                                            </span>
                                            <span className="text-muted-foreground truncate">{result.message}</span>
                                            <span className="font-mono text-xs text-right">{result.duration}ms</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="bg-muted/50 p-4 rounded-md">
                                            <h4 className="font-semibold flex items-center mb-2"><FileJson2 className="mr-2 h-4 w-4 text-accent" /> Test Details</h4>
                                            {result.details ? (
                                                <ScrollArea className="max-h-48">
                                                    <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-2 rounded-sm border">
                                                        {typeof result.details === 'object' ? JSON.stringify(result.details, null, 2) : String(result.details)}
                                                    </pre>
                                                </ScrollArea>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No additional details provided for this test.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
