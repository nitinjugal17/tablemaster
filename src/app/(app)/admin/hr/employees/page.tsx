
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Employee, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getUsers, getEmployees } from '@/app/actions/data-management-actions';
import { createOrUpdateEmployee } from '@/app/actions/hr-actions';
import { format, parseISO, isValid } from 'date-fns';
import { UserPlus, PlusCircle, Edit3, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { BASE_CURRENCY_CODE } from '@/lib/types';

const employeeFormSchema = z.object({
  id: z.string().optional(),
  employeeId: z.string().min(1, "Employee ID is required."),
  name: z.string().min(2, "Name is required."),
  designation: z.string().min(2, "Designation is required."),
  department: z.string().optional(),
  dateOfJoining: z.date().optional(),
  mappedUserId: z.string().optional(),
  baseSalary: z.coerce.number().min(0, "Base salary cannot be negative.").optional(),
  salaryCalculationType: z.enum(['daily', 'monthly']).optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeEditorProps {
  employee?: Employee;
  allUsers: User[];
  onSave: (data: EmployeeFormValues) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

const EmployeeEditor: React.FC<EmployeeEditorProps> = ({ employee, allUsers, onSave, onClose, isSaving }) => {
  const getInitialDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date : undefined;
    } catch {
      return undefined;
    }
  };
  
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      id: employee?.id || "",
      employeeId: employee?.employeeId || "",
      name: employee?.name || "",
      designation: employee?.designation || "",
      department: employee?.department || "",
      dateOfJoining: getInitialDate(employee?.dateOfJoining),
      mappedUserId: employee?.mappedUserId || "",
      baseSalary: employee?.baseSalary || 0,
      salaryCalculationType: employee?.salaryCalculationType || 'monthly',
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
        <FormField name="employeeId" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Employee ID *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="designation" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Designation *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="baseSalary" render={({ field }) => (
            <FormItem><FormLabel>Base Salary ({BASE_CURRENCY_CODE})</FormLabel><FormControl><Input type="number" step="100" min="0" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="salaryCalculationType" render={({ field }) => (
            <FormItem><FormLabel>Salary Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField name="department" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="dateOfJoining" control={form.control} render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Date of Joining</FormLabel><Popover><PopoverTrigger asChild><FormControl>
            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
              {field.value ? format(field.value, "PPP") : <span>Pick date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage />
          </FormItem>
        )} />
        <FormField name="mappedUserId" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Mapped User Account</FormLabel><Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="None (or select user)" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="__NONE__">None</SelectItem>
              {allUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>)}
            </SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Employee
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function EmployeeManagementPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [emps, usrs] = await Promise.all([getEmployees(), getUsers()]);
      setEmployees(emps);
      setUsers(usrs);
    } catch (error) {
      toast({ title: "Error", description: "Could not load HR data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEditor = (employee?: Employee) => {
    setEditingEmployee(employee);
    setIsEditorOpen(true);
  };

  const handleSaveEmployee = async (data: EmployeeFormValues) => {
    setIsSaving(true);
    
    // Explicitly construct the payload with correct types for the server action
    const payload: Partial<Employee> = {
      id: data.id,
      employeeId: data.employeeId,
      name: data.name,
      designation: data.designation,
      department: data.department,
      dateOfJoining: data.dateOfJoining ? data.dateOfJoining.toISOString() : undefined,
      mappedUserId: data.mappedUserId === '__NONE__' ? undefined : data.mappedUserId,
      baseSalary: data.baseSalary,
      salaryCalculationType: data.salaryCalculationType,
    };

    if (!payload.id) {
        delete (payload as any).id;
    }
    
    const result = await createOrUpdateEmployee(payload);
    
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchData();
      setIsEditorOpen(false);
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };


  const getUserName = (userId?: string) => {
    if (!userId) return <Badge variant="outline">Not Linked</Badge>;
    const user = users.find(u => u.id === userId);
    return user ? <Badge variant="secondary">{user.name}</Badge> : <Badge variant="destructive">User Not Found</Badge>;
  }

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Create New Employee'}</DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <EmployeeEditor
              employee={editingEmployee}
              allUsers={users}
              onSave={handleSaveEmployee}
              onClose={() => setIsEditorOpen(false)}
              isSaving={isSaving}
            />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <UserPlus className="mr-3 h-7 w-7" /> Employee Management
          </h1>
          <p className="text-muted-foreground">Create, edit, and manage employee profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => handleOpenEditor()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>List of all employees. Mapped user accounts can log attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Joined On</TableHead>
                  <TableHead>Mapped User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeId}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>
                      {emp.baseSalary !== undefined ? `${BASE_CURRENCY_CODE} ${emp.baseSalary.toLocaleString()}` : 'N/A'}
                      {emp.salaryCalculationType && <span className="text-xs text-muted-foreground capitalize"> /{emp.salaryCalculationType.slice(0, 2)}</span>}
                    </TableCell>
                    <TableCell>{emp.dateOfJoining && isValid(parseISO(emp.dateOfJoining)) ? format(parseISO(emp.dateOfJoining), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{getUserName(emp.mappedUserId)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(emp)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 text-muted-foreground">No employees found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
