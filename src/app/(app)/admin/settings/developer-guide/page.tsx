
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, AlertTriangle, Database, Lock, Bot, Palette, Network, Layers, Loader2, KeyRound, HardDrive, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
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
    const { settings, isLoadingSettings } = useGeneralSettings();
    
    if (isLoadingAuth || isLoadingSettings) {
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
    
    const userGuideContent = settings.userGuideContent || "<p>User guide content not configured in General Settings.</p>";

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
            
            <ScrollArea className="h-[calc(100vh-15rem)]">
                <div className="space-y-6 pr-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-primary"><BookOpen className="mr-2"/>TableMaster Comprehensive User Guide</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: userGuideContent }} />
                        </CardContent>
                    </Card>

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
                                    <AlertTitle className="font-semibold text-sky-700">Switching Between CSV and MongoDB</AlertTitle>
                                    <AlertDescription className="text-sky-600">
                                        The data source is controlled by the <code>DATA_SOURCE</code> variable in your <code>.env</code> file at the project root.
                                        <ul className="list-disc list-inside mt-2">
                                            <li><strong>CSV (Default):</strong> Set <code>DATA_SOURCE=csv</code> or leave it unset. Data is stored in <code>/src/data/*.csv</code>.</li>
                                            <li><strong>MongoDB:</strong> Set <code>DATA_SOURCE=mongodb</code> and provide <code>MONGODB_URI</code> and <code>MONGODB_DB_NAME</code>.</li>
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
                                                <strong>For CSV Data Source:</strong> When enabled, the <strong>entire content</strong> of each <code>.csv</code> file is encrypted before being written to disk. This provides a layer of protection if the data files themselves are exposed.
                                            </li>
                                            <li>
                                                <strong>For MongoDB Data Source:</strong> Application-level field encryption for MongoDB is <strong>not currently implemented</strong> in this prototype due to its complexity (it requires encrypting individual fields within documents rather than the whole file). Data sent to MongoDB is currently sent as plaintext from the application's perspective. For production security with MongoDB, you should rely on MongoDB's native security features like Transparent Data Encryption (TDE), available in MongoDB Enterprise, or manage encryption at the infrastructure level.
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
                                    ]} />
                                    <SchemaTable title="Menu Items" filename="menu-items.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the menu item."],
                                        ["name", "string", "Name of the dish."],
                                        ["description", "string", "A brief description of the dish."],
                                        ["portionDetails", "JSON string", "Array of portions, e.g., `[{\"name\":\"Regular\",\"price\":10.99,\"isDefault\":true}]`."],
                                        ["category", "string", "Category like 'Appetizer', 'Main Course', etc."],
                                        ["imageUrl", "string", "URL of the dish image."],
                                        ["isAvailable", "boolean", "Whether the item is currently available for ordering."],
                                        ["isSignatureDish", "boolean", "Whether this is a signature dish."],
                                        ["isTodaysSpecial", "boolean", "Whether this is a special for today."],
                                        ["cuisine", "string", "Cuisine type (e.g., Italian) (optional)."],
                                        ["ingredients", "string", "Comma-separated list of ingredients (optional)."],
                                        ["calculatedCost", "number", "Auto-calculated cost based on stock mappings (optional)."],
                                        ["calories", "number", "Estimated calories (optional)."],
                                    ]} />
                                    <SchemaTable title="Orders" filename="orders.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the order."],
                                        ["userId", "string", "ID of the logged-in user who placed the order (optional)."],
                                        ["items", "JSON string", "Array of ordered items, including quantity and price at time of order."],
                                        ["total", "number", "Total price of the order in the base currency."],
                                        ["status", "string", "Current status of the order (e.g., 'Pending', 'Completed')."],
                                        ["orderType", "string", "'Dine-in' or 'Takeaway'."],
                                        ["customerName", "string", "Name of the customer placing the order."],
                                        ["createdAt", "ISO Date string", "Timestamp of when the order was created."],
                                        ["tableNumber", "string", "Table number for Dine-in orders (optional)."],
                                        ["paymentType", "string", "e.g., 'Cash', 'Card', 'Pending' (optional)."],
                                        ["paymentId", "string", "Transaction ID from payment gateway (optional)."],
                                    ]} />
                                     <SchemaTable title="Bookings" filename="bookings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the booking."],
                                        ["userId", "string", "ID of the user who made the booking (optional)."],
                                        ["bookingType", "string", "Type of booking: 'table' or 'room'."],
                                        ["date", "string", "Date of the booking in YYYY-MM-DD format."],
                                        ["time", "string", "Time of the booking in HH:MM format."],
                                        ["partySize", "number", "Number of guests in the booking party."],
                                        ["customerName", "string", "Name of the person who made the booking."],
                                        ["status", "string", "Current status: 'pending', 'confirmed', 'cancelled'."],
                                        ["requestedResourceId", "string", "ID of table/room specifically requested by customer (optional)."],
                                        ["assignedResourceId", "string", "ID of table/room assigned by admin (optional)."],
                                        ["items", "JSON string", "Pre-ordered items for the booking (optional)."],
                                    ]} />
                                    <SchemaTable title="Restaurant Tables" filename="restaurant-tables.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the table."],
                                        ["name", "string", "Descriptive name or number (e.g., T5, 'Patio-3')."],
                                        ["capacity", "number", "Number of people the table can seat."],
                                        ["status", "string", "Current status: 'Available', 'Occupied', 'Reserved', 'Maintenance'."],
                                        ["notes", "string", "Notes about the table's location or features (optional)."],
                                    ]} />
                                    <SchemaTable title="Rooms" filename="rooms.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the room."],
                                        ["name", "string", "Name of the room (e.g., 'King Suite')."],
                                        ["description", "string", "A detailed description of the room."],
                                        ["capacity", "number", "Number of people the room can accommodate."],
                                        ["pricePerNight", "number", "Cost per night in the base currency."],
                                        ["amenities", "string", "Comma-separated list of amenities (e.g., 'Wi-Fi, TV, AC')."],
                                        ["imageUrls", "string", "Comma-separated list of public image URLs for the room."],
                                    ]} />
                                    <SchemaTable title="Employees" filename="employees.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the employee record."],
                                        ["employeeId", "string", "Official, user-facing employee ID (e.g., 'EMP-007')."],
                                        ["name", "string", "Employee's full name."],
                                        ["designation", "string", "Employee's job title or role."],
                                        ["mappedUserId", "string", "The ID of the User from users.csv, if linked for login (optional)."],
                                        ["baseSalary", "number", "Employee's base salary in the base currency (optional)."],
                                        ["salaryCalculationType", "string", "'daily' or 'monthly' (optional)."],
                                    ]} />
                                     <SchemaTable title="Attendance" filename="attendance.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID for the attendance record."],
                                        ["employeeId", "string", "Links to the Employee ID."],
                                        ["date", "string", "Date of the record in YYYY-MM-DD format."],
                                        ["checkInTime", "ISO Date string", "Timestamp of check-in."],
                                        ["checkOutTime", "ISO Date string", "Timestamp of check-out."],
                                        ["status", "string", "Present, Absent, Late, On Leave."],
                                        ["notes", "string", "Optional notes, e.g., 'Manual entry'."],
                                    ]} />
                                     <SchemaTable title="Salary Payments" filename="salary-payments.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID for the payment record."],
                                        ["paymentDate", "ISO Date string", "Date the payment was made/recorded."],
                                        ["periodFrom", "ISO Date string", "Start date of the salary period."],
                                        ["periodTo", "ISO Date string", "End date of the salary period."],
                                        ["employeeId", "string", "Links to the Employee ID."],
                                        ["baseSalaryForPeriod", "number", "Calculated base salary for the period."],
                                        ["bonusForPeriod", "number", "Calculated bonus for the period."],
                                        ["deductions", "number", "Any deductions or additions."],
                                        ["netPay", "number", "The final net pay for the period."],
                                    ]} />
                                    <SchemaTable title="Stock Items" filename="stock-items.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique identifier for the stock item."],
                                        ["name", "string", "Name of the stock item (e.g., 'Basmati Rice')."],
                                        ["category", "string", "Category (e.g., 'Grains', 'Vegetables')."],
                                        ["unit", "string", "Base unit of measurement (kg, g, liter, ml, pcs, etc.)."],
                                        ["currentStock", "number", "Current quantity in stock in the base 'unit'."],
                                        ["reorderLevel", "number", "The stock level at which a reorder is triggered."],
                                        ["purchasePrice", "number", "Cost per base 'unit' in the application's base currency."],
                                    ]} />
                                     <SchemaTable title="Expenses" filename="expenses.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID for the expense record."],
                                        ["date", "ISO Date string", "Date the expense was incurred."],
                                        ["description", "string", "Description of the expense."],
                                        ["category", "string", "Category like 'Ingredients', 'Rent' etc."],
                                        ["amount", "number", "Expense amount in base currency."],
                                        ["isRecurring", "boolean", "Whether this is a recurring expense."],
                                    ]} />
                                     <SchemaTable title="Stock-Menu Mappings" filename="stock-menu-mappings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID for the mapping."],
                                        ["stockItemId", "string", "ID of the stock item."],
                                        ["menuItemId", "string", "ID of the menu item."],
                                        ["quantityUsedPerServing", "number", "How much stock is used per serving."],
                                        ["unitUsed", "string", "Unit of the quantity used (e.g., 'g', 'ml')."],
                                    ]} />
                                    <SchemaTable title="Role Permissions" filename="role-permissions.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["roleName", "string", "The name of the role (e.g., 'admin', 'user', 'manager')."],
                                        ["allowedRouteIds", "string", "A comma-separated string of AppRoute IDs that this role is allowed to access."],
                                    ]} />
                                    <SchemaTable title="Discount Codes" filename="discounts.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID."],
                                        ["code", "string", "The code customers enter."],
                                        ["type", "string", "'percentage' or 'fixed_amount'."],
                                        ["value", "number", "Numeric value of the discount."],
                                        ["isActive", "boolean", "Whether the discount is currently active."],
                                    ]} />
                                    <SchemaTable title="Offers" filename="offers.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID."],
                                        ["title", "string", "Title of the offer."],
                                        ["type", "string", "Type of offer, e.g., 'combo_deal'."],
                                        ["details", "JSON string", "JSON object with offer-specific details."],
                                        ["isActive", "boolean", "Whether the offer is currently active."],
                                    ]} />
                                     <SchemaTable title="Banners" filename="banners.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["id", "string", "Unique ID."],
                                        ["title", "string", "Internal title for the banner."],
                                        ["imageUrl", "string", "URL of the banner image."],
                                        ["displayOrder", "number", "Order for displaying multiple banners."],
                                        ["isActive", "boolean", "Whether the banner is active."],
                                    ]} />
                                    <SchemaTable title="Managed Images" filename="managed-images.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                      ["id", "string", "Unique ID."],
                                      ["context", "string", "The area where the image is used (e.g., 'menu_item', 'offer')."],
                                      ["entityId", "string", "The ID of the related item (e.g., a MenuItem ID) (optional)."],
                                      ["imageUrl", "string", "Publicly accessible URL of the image."],
                                      ["uploadedAt", "ISO Date string", "Timestamp of when the image record was created."],
                                    ]} />
                                    <SchemaTable title="Rate Limiting Config" filename="rate-limit-config.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                        ["otpRequestsPerHour", "number", "Max OTP requests per identifier (email/IP) per hour."],
                                        ["otpRequestsPerDay", "number", "Max OTP requests per identifier per day."],
                                    ]} />
                                     <SchemaTable title="General Settings" filename="general-settings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                      ["companyName", "string", "The official name of the restaurant."],
                                      ["currencyCode", "string", "The default display currency code (e.g., 'INR', 'USD')."],
                                      ["printElements", "JSON string", "A JSON object defining which elements to show on printed invoices."],
                                      ["homepageLayoutConfig", "JSON string", "JSON defining the order and visibility of homepage sections."],
                                      ["availableThemes", "JSON string", "A JSON array of all custom theme configurations for the application."]
                                    ]} />
                                    <SchemaTable title="Printer Settings" filename="printer-settings.csv" headers={["Field Name", "Data Type", "Description"]} data={[
                                      ["id", "string", "Unique ID for the printer profile."],
                                      ["name", "string", "A user-friendly name for the printer (e.g., 'Kitchen Printer')."],
                                      ["connectionType", "string", "The connection method: 'network', 'usb', 'bluetooth', or 'system'."],
                                      ["ipAddress", "string", "The IP address for network printers."],
                                      ["paperWidth", "string", "The width of the thermal paper (e.g., '80mm', '58mm')."],
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
      
    