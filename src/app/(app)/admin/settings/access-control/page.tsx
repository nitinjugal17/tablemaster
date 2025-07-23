
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, UserCog, ListChecks, Edit, Save, PlusCircle, Lock, Loader2, AlertTriangle } from "lucide-react"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo } from "react";
import type { RolePermission, AppRoute, User } from "@/lib/types";
import { ALL_APPLICATION_ROUTES, DEFAULT_USER_ROLES } from "@/lib/types";
import { getRolePermissions, saveRolePermissions, getUsers } from "@/app/actions/data-management-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent, 
  DialogFooter,
  DialogHeader,
  DialogTitle as DialogTitleComponent, 
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';
import { Skeleton } from "@/components/ui/skeleton";


export default function AccessControlPage() {
  const { toast } = useToast();
  const { user: currentUser, isLoadingAuth } = useAuth();
  const { t, i18n, ready: isTranslationReady } = useTranslation(['sidebar']);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleError, setNewRoleError] = useState<string | null>(null);


  useEffect(() => {
    async function fetchData() {
      if (currentUser?.role !== 'superadmin') {
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      try {
        const [permissions, users] = await Promise.all([
          getRolePermissions(),
          getUsers()
        ]);
        setRolePermissions(permissions);
        setAllUsers(users);
      } catch (error) {
        console.error("Failed to fetch access control data:", error);
        toast({ title: "Error", description: "Could not load access control data.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    if (!isLoadingAuth) {
      fetchData();
    }
  }, [toast, currentUser, isLoadingAuth]);

  const managedRoles = useMemo(() => {
    const rolesFromPermissions = rolePermissions.map(rp => rp.roleName);
    const rolesFromUsers = allUsers.map(u => u.role);
    const allRoleNames = Array.from(new Set([...DEFAULT_USER_ROLES, ...rolesFromPermissions, ...rolesFromUsers])).sort();

    return allRoleNames.map(name => {
      let description = "";
      const isCustom = !DEFAULT_USER_ROLES.includes(name as any);
      if (name === 'superadmin') description = 'Full system access, can manage roles and permissions.';
      else if (name === 'admin') description = 'Manages restaurant operations, users, and settings.';
      else if (name === 'user') description = 'Access to customer-facing features like menu, booking.';
      else description = isCustom ? 'Custom defined role.' : 'Standard role.';
      
      return { name, description, isCustom };
    });
  }, [rolePermissions, allUsers]);


  const handlePermissionChange = (roleName: string, routeId: string, checked: boolean) => {
    setRolePermissions(prevPermissions => {
      let permissionExists = false;
      const updatedPermissions = prevPermissions.map(rp => {
        if (rp.roleName === roleName) {
          permissionExists = true;
          // Ensure allowedRouteIds is an array before using array methods
          const currentAllowedRoutes = Array.isArray(rp.allowedRouteIds) ? rp.allowedRouteIds : [];
          
          const newAllowedRoutes = checked
            ? [...currentAllowedRoutes, routeId]
            : currentAllowedRoutes.filter(id => id !== routeId);
            
          return { ...rp, allowedRouteIds: Array.from(new Set(newAllowedRoutes)) };
        }
        return rp;
      });

      if (!permissionExists) {
        updatedPermissions.push({
          roleName: roleName,
          allowedRouteIds: checked ? [routeId] : [],
        });
      }
      
      return updatedPermissions;
    });
  };

  const handleOpenCreateRoleDialog = () => {
    setNewRoleName("");
    setNewRoleError(null);
    setIsCreateRoleDialogOpen(true);
  };

  const handleCreateRole = () => {
    setNewRoleError(null);
    const trimmedRoleName = newRoleName.trim().toLowerCase().replace(/\s+/g, '_'); 

    if (!trimmedRoleName) {
      setNewRoleError("Role name cannot be empty.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedRoleName)) {
        setNewRoleError("Role name can only contain lowercase letters, numbers, and underscores.");
        return;
    }
    if (managedRoles.some(r => r.name === trimmedRoleName) || DEFAULT_USER_ROLES.includes(trimmedRoleName as any)) {
      setNewRoleError(`Role "${trimmedRoleName}" already exists or is a default role.`);
      return;
    }

    if (!rolePermissions.find(rp => rp.roleName === trimmedRoleName)) {
        setRolePermissions(prev => [...prev, { roleName: trimmedRoleName, allowedRouteIds: [] }]);
    }
    
    toast({ title: "Role Added Locally", description: `Role "${trimmedRoleName}" added. Assign permissions and save.` });
    setIsCreateRoleDialogOpen(false);
    setNewRoleName("");
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      const finalPermissions = rolePermissions.map(rp => {
        if (rp.roleName === 'superadmin') {
          return { ...rp, allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id) };
        }
        return rp;
      });
      if (!finalPermissions.find(rp => rp.roleName === 'superadmin')) {
        finalPermissions.push({ roleName: 'superadmin', allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id)});
      }

      const result = await saveRolePermissions(finalPermissions);
      if (result.success) {
        toast({ title: "Permissions Saved", description: "Role permissions have been updated." });
        const updatedPermissions = await getRolePermissions();
        setRolePermissions(updatedPermissions);
      } else {
        toast({ title: "Error Saving Permissions", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({ title: "Error", description: "Could not save permissions.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingAuth || isLoadingData || !isTranslationReady;

  if (isLoading) {
    return (
         <div className="space-y-8">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
            </Button>
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading access control data...</p>
            </div>
            <Card><CardHeader><Skeleton className="h-6 w-1/3"/></CardHeader><CardContent><Skeleton className="h-24 w-full"/></CardContent></Card>
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
            <p className="text-lg">You do not have permission to view or manage Access Control settings.</p>
            <p className="text-muted-foreground">This section is reserved for Super Administrators only.</p>
             <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitleComponent>Create New Role</DialogTitleComponent>
            <DialogDescriptionComponent>
              Enter a name for the new role. Use lowercase letters, numbers, and underscores only (e.g., "content_editor").
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newRoleNameInput" className="text-right">Role Name</Label>
              <Input
                id="newRoleNameInput"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., branch_manager"
              />
            </div>
            {newRoleError && <p className="col-span-4 text-center text-sm text-destructive">{newRoleError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleCreateRole}>Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <UserCog className="mr-3 h-7 w-7" /> Access Control Management 
        </h1>
        <p className="text-muted-foreground">Define roles and manage permissions for different parts of the application. Permissions are saved to `role-permissions.csv`.</p>
      </div>

      <Alert variant="default" className="bg-amber-50 border-amber-400">
        <ShieldAlert className="h-5 w-5 text-amber-600" />
        <AlertTitle className="font-semibold text-amber-700">System Note</AlertTitle>
        <AlertDescription className="text-amber-600">
          Full RBAC with a CSV backend has limitations. Role changes for users are done on the User Management page.
          The 'superadmin' role always has all permissions and cannot be restricted. Default roles ('admin', 'user') can have their permissions modified here.
        </AlertDescription>
      </Alert>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-headline">Defined Roles</CardTitle>
            <CardDescription>View existing roles. Create new custom roles to assign permissions.</CardDescription>
          </div>
          <Button onClick={handleOpenCreateRoleDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {managedRoles.map(role => (
            <div key={role.name} className="p-3 border rounded-md bg-muted/30">
              <h3 className="font-semibold text-primary capitalize">{role.name.replace(/_/g, ' ')}</h3>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Assign Permissions to Roles</CardTitle>
          <CardDescription>Select which application routes/features each role can access. Superadmin permissions are not editable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {managedRoles.map(role => {
            const currentRolePermissions = rolePermissions.find(rp => rp.roleName === role.name);
            const isSuperAdminRole = role.name === 'superadmin';
            const allowedRouteIds = currentRolePermissions && Array.isArray(currentRolePermissions.allowedRouteIds) ? currentRolePermissions.allowedRouteIds : [];

            return (
            <div key={role.name} className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="text-lg font-semibold text-primary capitalize">{role.name.replace(/_/g, ' ')} Permissions</h3>
              {isSuperAdminRole && <p className="text-sm text-muted-foreground italic">Superadmin always has full access to all routes.</p>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {Object.entries(
                  ALL_APPLICATION_ROUTES.reduce((acc: Record<string, AppRoute[]>, route) => {
                    if (!acc[route.group]) acc[route.group] = [];
                    acc[route.group].push(route);
                    return acc;
                  }, {})
                ).map(([groupName, routesInGroup]) => (
                    <div key={groupName} className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <h4 className="font-medium text-sm text-foreground/80 mb-1.5 mt-2 border-b pb-1">{groupName}</h4>
                        {routesInGroup.map(route => (
                        <div key={route.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                            id={`${role.name}-${route.id}`}
                            disabled={isSuperAdminRole || isSaving}
                            checked={isSuperAdminRole || allowedRouteIds.includes(route.id)}
                            onCheckedChange={(checked) => handlePermissionChange(role.name, route.id, !!checked)}
                            />
                            <Label htmlFor={`${role.name}-${route.id}`} className="text-sm font-normal leading-tight has-[input:disabled]:text-muted-foreground/70">
                            {t(route.nameKey)}
                            <span className="text-xs text-muted-foreground/80 block sm:inline sm:ml-1">({route.path})</span>
                            </Label>
                        </div>
                        ))}
                    </div>
                ))}
              </div>
            </div>
            );
          })}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSavePermissions} disabled={isSaving || isLoadingData}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
             Save Permission Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

