
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, AlertTriangle, Database, Lock, Bot, Palette, Network, Layers, Loader2, KeyRound, HardDrive, ShieldCheck, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Sub-component for rendering a schema table
const SchemaTable: React.FC<{ title: string; filename: string; headers: string[], data: string[][], isJson?: boolean }> = ({ title, filename, headers, data, isJson = false }) => (
    <div>
        <h4 className="font-semibold">{title} (<code className='text-sm bg-muted px-1 py-0.5 rounded'>{filename}</code>){isJson && <Badge variant="outline" className="ml-2">JSON</Badge>}</h4>
        <div className="overflow-x-auto">
            <Table className="mt-2 text-xs w-full min-w-[600px]">
                <TableHeader>
                    <TableRow>
                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex} className={cellIndex === 0 ? 'font-mono' : ''}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

// Main component definition
export default function DeveloperGuidePage() {
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
                <p className="text-lg">You do not have permission to view the Developer Guide.</p>
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
                    <BookOpen className="mr-3 h-7 w-7" /> Developer & Technical Guide
                </h1>
                <p className="text-muted-foreground">A technical overview of the TableMaster application for developers.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Documentation</CardTitle>
                    <CardDescription>A comprehensive guide for end-users on setting up and using the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <a href="/user-guide.html" download="TableMaster_User_Guide.html">
                            <Download className="mr-2 h-4 w-4" /> Download User Guide (HTML)
                        </a>
                    </Button>
                </CardContent>
            </Card>
            
            <ScrollArea className="h-[calc(100vh-25rem)]">
                <div className="space-y-6 pr-4">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center text-primary"><Database className="mr-2"/>Data Management & Schema Guide</CardTitle>
                            <CardDescription>A reference for data structures, backend configuration, and initial setup.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <section>
                                <h3 className="font-headline text-xl font-semibold mb-3">Data Source Configuration</h3>
                                <Alert variant="default" className="bg-sky-50 border-sky-300">
                                    <HardDrive className="h-5 w-5 text-sky-600" />
                                    <AlertTitle className="font-semibold text-sky-700">Switching Data Sources</AlertTitle>
                                    <AlertDescription className="text-sky-600">
                                        The data source is controlled by the <code>DATA_SOURCE</code> variable in your <code>.env</code> file at the project root.
                                        <ul className="list-disc list-inside mt-2">
                                            <li><strong>CSV (Default):</strong> Set <code>DATA_SOURCE=csv</code> or leave it unset. Data is stored in <code>/src/data/*.csv</code>.</li>
                                            <li><strong>MongoDB:</strong> Set <code>DATA_SOURCE=mongodb</code> and provide <code>MONGODB_URI</code> and <code>MONGODB_DB_NAME</code>.</li>
                                            <li><strong>Redis:</strong> Set <code>DATA_SOURCE=redis</code> and configure connection details. See the <Link href="/admin/settings/redis-guide" className="font-semibold underline hover:text-primary">Redis Setup Guide</Link> for more info.</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            </section>
                            <section>
                                <h3 className="font-headline text-xl font-semibold mb-3">Initial MongoDB Setup</h3>
                                <Alert variant="default">
                                    <KeyRound className="h-5 w-5" />
                                    <AlertTitle className="font-semibold">Creating the First Superadmin User</AlertTitle>
                                    <AlertDescription>
                                        When starting with an empty MongoDB database, you must create the first superadmin user manually to log in.
                                        <ol className="list-decimal list-inside mt-2 space-y-1">
                                            <li>Connect to your MongoDB instance using a tool like MongoDB Compass or <code>mongosh</code>.</li>
                                            <li>Select your database (e.g., <code>use your_db_name</code>).</li>
                                            <li>Run the following command to insert the user. <strong>Remember to use a secure password.</strong></li>
                                        </ol>
                                        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                                            <code>
                                                {`db.getCollection("users").insertOne({\n  "email": "super@example.com",\n  "password": "your_secure_password_here",\n  "name": "Super Admin",\n  "role": "superadmin",\n  "accountStatus": "active"\n});`}
                                            </code>
                                        </pre>
                                        <p className="mt-2 text-xs">Note: The application's CSV mode currently uses plaintext passwords for simplicity, which is highly insecure. For a real application, you would hash the password before inserting it.</p>
                                    </AlertDescription>
                                </Alert>
                            </section>
                            <section>
                                <h3 className="font-headline text-xl font-semibold mb-3">Data Serialization (CSV vs. MongoDB)</h3>
                                <Alert variant="default">
                                    <Layers className="h-5 w-5" />
                                    <AlertTitle className="font-semibold">JSON Strings in CSV vs. BSON in MongoDB</AlertTitle>
                                    <AlertDescription>
                                        A key difference between storage methods is how complex data (like a list of order items) is handled.
                                        <ul className="list-disc list-inside mt-2">
                                            <li><strong>In CSV files:</strong> Nested objects and arrays are stored as a single <strong>JSON string</strong> in their respective columns (e.g., the `items` column in `orders.csv`).</li>
                                            <li><strong>In MongoDB:</strong> This data is stored natively as BSON arrays and objects, allowing for powerful queries on nested data.</li>
                                        </ul>
                                        The application handles this serialization/deserialization automatically. When managing data, be aware that you must provide valid JSON strings for these fields in CSV files.
                                    </AlertDescription>
                                </Alert>
                            </section>
                             <section>
                                <h3 className="font-headline text-xl font-semibold mb-3">Data-at-Rest Encryption</h3>
                                <Alert variant="default" className="bg-blue-50 border-blue-300">
                                    <Lock className="h-5 w-5 text-blue-600" />
                                    <AlertTitle className="font-semibold text-blue-700">Enabling Encryption with an Environment Variable</AlertTitle>
                                    <AlertDescription className="text-blue-600 space-y-3">
                                        <p>
                                            TableMaster includes a conceptual implementation for data-at-rest encryption. When enabled, the application attempts to encrypt data before saving it and decrypt it upon reading. This is controlled by a single environment variable in your <code>.env</code> file:
                                        </p>
                                        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto text-foreground">
                                            <code>
                                                ENCRYPTION_KEY="your_very_strong_and_secret_passphrase_here"
                                            </code>
                                        </pre>
                                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                            <li><strong>If <code>ENCRYPTION_KEY</code> is set:</strong> The application will use this key with AES encryption.</li>
                                            <li><strong>If <code>ENCRYPTION_KEY</code> is NOT set (or is empty):</strong> The application gracefully falls back to storing and reading data as <strong>plaintext</strong>.</li>
                                            <li><strong>Console Logs:</strong> The server logs will indicate whether encryption is active or if it's falling back to plaintext when reading/writing files.</li>
                                            <li><strong>Security Warning:</strong> This key must be kept absolutely secret. Losing it means losing access to your encrypted data. Never commit your <code>.env</code> file to version control.</li>
                                        </ul>
                                        <Separator className="my-3 bg-blue-300"/>
                                        <h4 className="font-semibold text-blue-700">Implementation Details:</h4>
                                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                            <li>
                                                <strong>For CSV Data Source:</strong> When enabled, the <strong>entire content</strong> of each <code>.csv</code> or <code>.json</code> file is encrypted before being written to disk. This provides a layer of protection if the data files themselves are exposed.
                                            </li>
                                            <li>
                                                <strong>For MongoDB Data Source:</strong> Application-level field encryption for MongoDB is <strong>not currently implemented</strong> in this prototype. For production security with MongoDB, you should rely on MongoDB's native security features like Transparent Data Encryption (TDE).
                                            </li>
                                        </ul>
                                        <Separator className="my-3 bg-blue-300"/>
                                         <div className="flex items-start gap-2 text-amber-800">
                                            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                                            <div>
                                                <h4 className="font-semibold">Important Distinction: Encryption vs. Password Hashing</h4>
                                                <p className="text-xs">
                                                  Data encryption is reversible (if you have the key) and is used here for data at rest. This is <strong>different from password storage</strong>. Passwords should <strong>always</strong> be one-way hashed using algorithms like Argon2 or bcrypt, never encrypted. This prototype currently uses insecure plaintext passwords for demonstration purposes only.
                                                </p>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            </section>

                            <section>
                                <h3 className="font-headline text-xl font-semibold mb-3">Extensive Data Schema Reference</h3>
                                <p className="text-sm text-muted-foreground mb-4">This guide outlines the structure of the main data collections/files. These fields are consistent across both CSV and MongoDB data sources.</p>
                                <div className="space-y-8">
                                    <SchemaTable title="Users" filename="users.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the user."],
                                        ["email", "string", "User's email address, used for login."],
                                        ["password", "string", "User's password. (Stored as plaintext in this prototype - INSECURE)."],
                                        ["role", "string", "User role (superadmin, admin, user, or custom)."],
                                        ["name", "string", "User's full name."],
                                        ["phone", "string", "User's phone number (optional)."],
                                        ["accountStatus", "string", "Account status (active, inactive, suspended, pending_verification)."],
                                        ["loyaltyPoints", "number", "Customer loyalty points."],
                                    ]} />
                                    <SchemaTable title="Menu Items" filename="menu-items.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the menu item."],
                                        ["name", "string", "Name of the dish."],
                                        ["description", "string", "A brief description of the dish."],
                                        ["portionDetails", "JSON string", "Array of portions, e.g., `[{\"name\":\"Regular\",\"price\":10.99,\"isDefault\":true}]`."],
                                        ["category", "string", "Category like 'Appetizer', 'Main Course', etc."],
                                        ["imageUrl", "string", "URL of the dish image."],
                                        ["isAvailable", "boolean", "Whether the item is currently available for ordering."],
                                        ["employeeBonusAmount", "number", "Specific bonus amount awarded to staff for selling this item."],
                                        ["calculatedCost", "number", "Auto-calculated cost based on stock mappings (optional)."],
                                    ]} />
                                    <SchemaTable title="Orders" filename="orders.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the order."],
                                        ["userId", "string", "ID of the logged-in user who placed the order (optional)."],
                                        ["items", "JSON string", "Array of ordered items, including quantity and price at time of order."],
                                        ["total", "number", "Total price of the order in the base currency."],
                                        ["status", "string", "Current status of the order (e.g., 'Pending', 'Completed')."],
                                        ["orderType", "string", "'Dine-in' or 'Takeaway' or 'In-Room Dining'."],
                                        ["customerName", "string", "Name of the customer placing the order."],
                                        ["createdAt", "ISO Date string", "Timestamp of when the order was created."],
                                    ]} />
                                     <SchemaTable title="Bookings" filename="bookings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the booking."],
                                        ["bookingType", "string", "Type of booking: 'table' or 'room'."],
                                        ["date", "string", "Date of the booking in YYYY-MM-DD format."],
                                        ["status", "string", "Current status: 'pending', 'confirmed', 'cancelled'."],
                                    ]} />
                                    <SchemaTable title="General Settings" filename="general-settings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                      ["companyName", "string", "The official name of the restaurant."],
                                      ["currencyCode", "string", "The default display currency code (e.g., 'INR', 'USD')."],
                                      ["printElements", "JSON string", "A JSON object defining which elements to show on printed invoices."],
                                      ["homepageLayoutConfig", "JSON string", "JSON defining the order and visibility of homepage sections."],
                                      ["availableThemes", "JSON string", "A JSON array of all custom theme configurations for the application."],
                                    ]} />
                                    <SchemaTable title="Notification Settings" filename="notification-settings.json" isJson={true} headers={["Key Path", "Data Type", "Description"]} data={[
                                        ["admin.notifyOnNewOrder", "boolean", "Email admin on new order."],
                                        ["user.emailOnOrderConfirmation", "boolean", "Email user on order confirmation."],
                                    ]} />
                                </div>
                            </section>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
      
    
