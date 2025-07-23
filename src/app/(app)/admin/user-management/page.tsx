
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, AccountStatus, UserRole as AppUserRoleType } from '@/lib/types';
import { ALL_ACCOUNT_STATUSES, DEFAULT_USER_ROLES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, MoreVertical, UserCog, ShieldCheck, Loader2, UsersIcon, Save, MailCheck, PhoneCall, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogFooter as AlertDialogFooterComponent,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getUsers, saveUsers } from '@/app/actions/data-management-actions';
import { updateUserRole, updateUserDetails } from '@/app/actions/auth-actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from '@/context/AuthContext'; 
import Link from 'next/link'; 
import { Skeleton } from '@/components/ui/skeleton';

const userEditSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  role: z.string(), 
  accountStatus: z.enum(ALL_ACCOUNT_STATUSES),
});
type UserEditFormValues = z.infer<typeof userEditSchema>;


export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEditingUser, setIsEditingUser] = useState<User | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const { toast } = useToast();
  const { user: loggedInUser, isLoadingAuth } = useAuth(); 

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
  });

  const fetchUsersData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers.sort((a, b) => {
        const roleOrder: Record<string, number> = { superadmin: 0, admin: 1, user: 2 };
        const aRoleOrder = roleOrder[a.role] ?? 3;
        const bRoleOrder = roleOrder[b.role] ?? 3;

        if (aRoleOrder !== bRoleOrder) {
            return aRoleOrder - bRoleOrder;
        }
        return (a.name || '').localeCompare(b.name || '');
      }));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error Loading Users", description: "Could not load user data.", variant: "destructive" });
      setUsers([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
     if (!isLoadingAuth && loggedInUser && (loggedInUser.role === 'admin' || loggedInUser.role === 'superadmin')) {
        fetchUsersData();
    } else if (!isLoadingAuth) {
        setIsLoadingData(false); 
    }
  }, [fetchUsersData, loggedInUser, isLoadingAuth]);

  const handleOpenEditDialog = (user: User) => {
    setIsEditingUser(user);
    form.reset({
      id: user.id,
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      accountStatus: user.accountStatus || 'active',
    });
  };
  
  const isOnlySuperAdmin = useCallback((allCurrentUsers: User[]) => {
    return allCurrentUsers.filter(u => u.role === 'superadmin').length <= 1;
  }, []);


  const handleSaveUser = async (data: UserEditFormValues) => {
    if (!isEditingUser || !loggedInUser) return;
    setIsSavingUser(true);

    const updates: Partial<User> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
    };
    
    if (data.accountStatus !== isEditingUser.accountStatus && canChangeAccountStatus(loggedInUser, isEditingUser, data.accountStatus)) {
        updates.accountStatus = data.accountStatus;
    } else if (data.accountStatus !== isEditingUser.accountStatus) {
        toast({ title: "Permission Denied", description: "You cannot change this user's account status to the selected value.", variant: "destructive" });
        setIsSavingUser(false);
        return;
    }

    if (data.role !== isEditingUser.role) {
      if (canChangeRoleOf(loggedInUser, isEditingUser, data.role as AppUserRoleType)) {
        if (isEditingUser.role === 'superadmin' && data.role !== 'superadmin' && isOnlySuperAdmin(users)) {
            toast({ title: "Action Blocked", description: "Cannot demote the only superadmin.", variant: "destructive"});
            setIsSavingUser(false);
            return;
        }
        updates.role = data.role as AppUserRoleType;
      } else {
        toast({ title: "Permission Denied", description: "You cannot change this user's role to the selected value.", variant: "destructive" });
        setIsSavingUser(false);
        return;
      }
    }

    const result = await updateUserDetails(isEditingUser.id, updates);
    if (result.success) {
      toast({ title: "User Updated", description: `${data.name}'s details have been updated.` });
      await fetchUsersData(); 
      setIsEditingUser(null);
    } else {
      toast({ title: "Update Failed", description: result.message, variant: "destructive" });
    }
    setIsSavingUser(false);
  };

  const handleRoleChangeViaDropdown = async (userId: string, newRole: AppUserRoleType, userName?: string) => {
    if (!loggedInUser || userId === loggedInUser.id) {
        toast({title: "Action Not Allowed", description: "You cannot change your own role.", variant: "destructive"});
        return;
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (!canChangeRoleOf(loggedInUser, targetUser, newRole)) {
        toast({ title: "Permission Denied", description: "You cannot change this user's role to the selected value.", variant: "destructive" });
        return;
    }

    if (targetUser.role === 'superadmin' && newRole !== 'superadmin' && isOnlySuperAdmin(users)) {
        toast({ title: "Action Blocked", description: "Cannot demote the only superadmin. Assign another user as superadmin first.", variant: "destructive"});
        return;
    }

    setIsSavingUser(true);
    const result = await updateUserRole(userId, newRole); // Server action handles demoting other superadmins if needed
     if (result.success) {
      toast({ title: "User Role Updated", description: `${userName || 'User'}'s role changed to ${newRole}.` });
      await fetchUsersData(); 
    } else {
      toast({ title: "Role Update Failed", description: result.message, variant: "destructive" });
    }
    setIsSavingUser(false);
  };

  const handleDeleteUser = async (userId: string, userName?: string) => {
    if (!loggedInUser || userId === loggedInUser.id) {
        toast({title: "Action Not Allowed", description: "You cannot delete your own account.", variant: "destructive"});
        return;
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (loggedInUser.role === 'admin' && targetUser.role !== 'user') {
        toast({ title: "Permission Denied", description: "Admins can only delete 'user' accounts.", variant: "destructive" });
        return;
    }
     if (loggedInUser.role === 'superadmin' && targetUser.role === 'superadmin' && isOnlySuperAdmin(users)) {
        toast({ title: "Action Not Allowed", description: "Cannot delete the only superadmin account.", variant: "destructive" });
        return;
    }

    const updatedUsers = users.filter(user => user.id !== userId);
    setIsSavingUser(true); 
    const result = await saveUsers(updatedUsers); 
    setIsSavingUser(false);
    if (result.success) {
        toast({ title: "User Deleted", description: `User ${userName || userId} has been removed.` });
        setUsers(updatedUsers); 
    } else {
        toast({ title: "Deletion Failed", description: `Could not delete user: ${result.message}`, variant: "destructive" });
        fetchUsersData(); 
    }
  };

  const handleAddUser = () => {
    toast({ title: "Add User", description: "User creation via UI not implemented. Please use CSV upload in Data Management settings." });
  };

  const getRoleBadgeVariant = (role: AppUserRoleType) => {
    if (role === 'superadmin') return 'default'; 
    if (role === 'admin') return 'destructive'; 
    return 'secondary'; 
  };

  const getStatusBadgeVariant = (status: AccountStatus) => {
    if (status === 'active') return 'default';
    if (status === 'suspended') return 'destructive';
    if (status === 'inactive') return 'outline';
    if (status === 'pending_verification') return 'secondary';
    return 'secondary';
  };
  
  const getStatusBadgeIcon = (status: AccountStatus) => {
    if (status === 'active') return <CheckCircle className="mr-1 h-3 w-3" />;
    if (status === 'suspended') return <ShieldCheck className="mr-1 h-3 w-3" />; 
    if (status === 'inactive') return <Activity className="mr-1 h-3 w-3" />;
    if (status === 'pending_verification') return <MailCheck className="mr-1 h-3 w-3" />;
    return <Activity className="mr-1 h-3 w-3" />;
  };
  
  function canEditUserDetailsDialog(editorUser: User, targetUser: User): boolean {
    if (targetUser.id === editorUser.id) return false; 
    if (editorUser.role === 'superadmin') return true; // Superadmin can edit anyone (except themselves in this dialog)
    if (editorUser.role === 'admin' && targetUser.role === 'user') return true; // Admin can edit users
    return false;
  }

  function canChangeRoleOf(editorUser: User, targetUser: User, newRoleCandidate?: AppUserRoleType): boolean {
    if (targetUser.id === editorUser.id) return false; // Cannot change own role

    if (editorUser.role === 'superadmin') {
        // Superadmin can change anyone's role to anything,
        // EXCEPT demoting the last superadmin (which would be themselves, handled above, or if changing another, handled by server)
        // Or promoting someone else to superadmin (server handles demoting current if it's not the one being promoted)
        return true;
    }
    if (editorUser.role === 'admin') {
      // Admin can only "change" a 'user' to 'user' (effectively no change, but UI might allow it)
      // And cannot change anyone to 'admin' or 'superadmin'
      if (targetUser.role === 'user' && (!newRoleCandidate || newRoleCandidate === 'user')) return true;
      return false;
    }
    return false;
  }

  function canChangeAccountStatus(editorUser: User, targetUser: User, newStatus?: AccountStatus): boolean {
    if (targetUser.id === editorUser.id) return false; 
    if (editorUser.role === 'superadmin') {
        // Superadmin cannot suspend another superadmin if it's the only one (conceptual check, main check on role change/delete)
        if (targetUser.role === 'superadmin' && isOnlySuperAdmin(users) && newStatus !== 'active') return false;
        return true;
    }
    if (editorUser.role === 'admin' && targetUser.role === 'user') return true;
    return false;
  }
  
  if (isLoadingAuth) {
    return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!loggedInUser || (loggedInUser.role !== 'admin' && loggedInUser.role !== 'superadmin')) {
    return (
      <div className="space-y-8">
        <Card className="shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">You do not have permission to manage users.</p>
            <p className="text-muted-foreground">This section is for administrators only.</p>
            <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and statuses. Changes are saved to the server-side data source.</p>
        </div>
        {loggedInUser?.role === 'superadmin' && (
            <Button onClick={handleAddUser}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User (via CSV)
            </Button>
        )}
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">User List ({users.length})</CardTitle>
          <CardDescription>A list of all registered users. Logged in as: {loggedInUser?.role}</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email / Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></div></TableCell>
                      <TableCell><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => {
                    const isSelf = user.id === loggedInUser?.id;
                    const canEditThisUser = loggedInUser ? canEditUserDetailsDialog(loggedInUser, user) : false; 
                    const canModifyRoleOfThisUser = loggedInUser ? canChangeRoleOf(loggedInUser, user) : false;
                    const canModifyStatusOfThisUser = loggedInUser ? canChangeAccountStatus(loggedInUser, user) : false;

                    return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://placehold.co/100x100.png?text=${user.name?.[0] || 'U'}`} alt={user.name || 'User Avatar'} data-ai-hint="person avatar" />
                            <AvatarFallback>{user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">ID: {user.id ? String(user.id).substring(0,6) : 'N/A'}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                          <div>{user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.phone || 'No phone'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role as AppUserRoleType)} className={user.role === 'superadmin' ? 'border-primary' : ''}>
                          {user.role === 'superadmin' && <ShieldCheck className="mr-1 h-3 w-3" />}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.accountStatus)} className="capitalize">
                          {getStatusBadgeIcon(user.accountStatus)} {user.accountStatus.replace('_', ' ')}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isSavingUser}>
                              {isSavingUser ? <Loader2 className="h-5 w-5 animate-spin"/> :<MoreVertical className="h-5 w-5" />}
                              <span className="sr-only">User Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions for {user.name}</DropdownMenuLabel>
                            {canEditThisUser && (
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                              </DropdownMenuItem>
                            )}
                            
                            {loggedInUser?.role === 'superadmin' && !isSelf && user.role !== 'superadmin' && (
                              <DropdownMenuItem onClick={() => handleRoleChangeViaDropdown(user.id, 'superadmin', user.name)}>
                                  <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Make Superadmin
                              </DropdownMenuItem>
                            )}
                            {loggedInUser && canChangeRoleOf(loggedInUser, user, 'admin') && user.role !== 'admin' && ( 
                              <DropdownMenuItem onClick={() => handleRoleChangeViaDropdown(user.id, 'admin', user.name)}>
                                  <UserCog className="mr-2 h-4 w-4 text-destructive" /> Make Admin
                              </DropdownMenuItem>
                            )}
                            {loggedInUser && canChangeRoleOf(loggedInUser, user, 'user') && user.role !== 'user' && !(isOnlySuperAdmin(users) && user.role === 'superadmin') && ( 
                              <DropdownMenuItem onClick={() => handleRoleChangeViaDropdown(user.id, 'user', user.name)}>
                                  <UserCog className="mr-2 h-4 w-4 text-muted-foreground" /> Make User
                              </DropdownMenuItem>
                            )}
                            
                            {!isSelf && loggedInUser && (
                              (loggedInUser.role === 'superadmin' && !(user.role === 'superadmin' && isOnlySuperAdmin(users))) || 
                              (loggedInUser.role === 'admin' && user.role === 'user')
                            ) && (
                              <>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive-foreground"
                                          onSelect={(e) => e.preventDefault()}
                                      >
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeaderComponent>
                                      <AlertDialogTitleComponent>Delete User "{user.name}"?</AlertDialogTitleComponent>
                                      <AlertDialogDescription>
                                          This action will permanently delete the user. This cannot be undone.
                                      </AlertDialogDescription>
                                      </AlertDialogHeaderComponent>
                                      <AlertDialogFooterComponent>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.name)}>Confirm Delete</AlertDialogAction>
                                      </AlertDialogFooterComponent>
                                  </AlertDialogContent>
                              </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );})
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <UsersIcon className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                      <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Users Found</h2>
                      <p className="text-muted-foreground">No users found in the data source. Add users via CSV upload in Data Management settings.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {isEditingUser && loggedInUser && (
        <Dialog open={!!isEditingUser} onOpenChange={(isOpen) => { if (!isOpen) setIsEditingUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">Edit User: {isEditingUser.name}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveUser)} className="space-y-4 pt-2">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <Label>Full Name</Label>
                        <FormControl><Input {...field} disabled={!canEditUserDetailsDialog(loggedInUser, isEditingUser)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <Label>Email</Label>
                        <FormControl><Input type="email" {...field} disabled={!canEditUserDetailsDialog(loggedInUser, isEditingUser)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <Label>Phone Number</Label>
                        <FormControl><Input type="tel" {...field} placeholder="Optional" disabled={!canEditUserDetailsDialog(loggedInUser, isEditingUser)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Role</Label>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value} 
                        disabled={!canChangeRoleOf(loggedInUser, isEditingUser, field.value as AppUserRoleType)}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DEFAULT_USER_ROLES.map(roleName => (
                             <SelectItem 
                                key={roleName} 
                                value={roleName}
                                disabled={!canChangeRoleOf(loggedInUser, isEditingUser!, roleName as AppUserRoleType) || (isOnlySuperAdmin(users) && isEditingUser.role === 'superadmin' && roleName !== 'superadmin')}
                              >
                                {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                              </SelectItem>
                          ))}
                          {!([...DEFAULT_USER_ROLES] as string[]).includes(isEditingUser.role) && (
                             <SelectItem key={isEditingUser.role} value={isEditingUser.role} disabled={!canChangeRoleOf(loggedInUser, isEditingUser, isEditingUser.role as AppUserRoleType)}>
                                {isEditingUser.role.charAt(0).toUpperCase() + isEditingUser.role.slice(1)} (Custom)
                             </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="accountStatus"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Account Status</Label>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!canChangeAccountStatus(loggedInUser, isEditingUser, field.value as AccountStatus)}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ALL_ACCOUNT_STATUSES.map(status => (
                            <SelectItem key={status} value={status} className="capitalize"
                              disabled={!canChangeAccountStatus(loggedInUser, isEditingUser!, status as AccountStatus) || (isOnlySuperAdmin(users) && isEditingUser.role === 'superadmin' && status !== 'active')}
                            >
                              {status.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSavingUser || (!canEditUserDetailsDialog(loggedInUser, isEditingUser) && !canChangeRoleOf(loggedInUser, isEditingUser) && !canChangeAccountStatus(loggedInUser, isEditingUser))}>
                    {isSavingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
