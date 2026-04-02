
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, Eye, PlusCircle, Gem, Search, Calendar as CalendarIcon, RefreshCcw, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserDocument, updateUserDocument, createUserDocument, resetAllUsersToFree } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { UserData } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

const userUpdateSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  phone: z.string().min(10).optional().or(z.literal('')),
  employeeId: z.string().length(8).optional().or(z.literal('')),
  city: z.string().min(2).optional().or(z.literal('')),
  division: z.string().min(2).optional().or(z.literal('')),
  examCategory: z.enum(['MTS', 'POSTMAN', 'PA', 'IP']),
  isPro: z.boolean().default(false).optional(),
  proValidUntil: z.date().optional().nullable(),
});

const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().refine(e => e.toLowerCase().endsWith('@gmail.com')),
  city: z.string().min(2),
  division: z.string().min(2),
  password: z.string().min(6),
  examCategory: z.enum(['MTS', 'POSTMAN', 'PA', 'IP']),
  isPro: z.boolean().default(false).optional(),
});

interface UserManagementProps { initialUsers: UserData[]; }

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const grandTotals = useMemo(() => {
    const baseUsers = categoryFilter === 'all' 
        ? users 
        : users.filter(u => u.examCategory === categoryFilter);
        
    return {
        all: users.length,
        pro: baseUsers.filter(u => u.isPro).length,
        free: baseUsers.filter(u => !u.isPro).length,
        filtered: baseUsers.length,
    };
  }, [users, categoryFilter]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
          const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = categoryFilter === 'all' || u.examCategory === categoryFilter;
          const matchesStatus = statusFilter === 'all' || (statusFilter === 'pro' ? u.isPro : !u.isPro);
          return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
          // Sort by registration date in descending order (most recent first)
          const dateA = normalizeDate(a.createdAt)?.getTime() || 0;
          const dateB = normalizeDate(b.createdAt)?.getTime() || 0;
          return dateB - dateA;
      });
  }, [users, searchTerm, categoryFilter, statusFilter]);

  const updateUserForm = useForm<z.infer<typeof userUpdateSchema>>({ 
    resolver: zodResolver(userUpdateSchema) 
  });
  
  const createUserForm = useForm<z.infer<typeof userCreateSchema>>({ 
    resolver: zodResolver(userCreateSchema), 
    defaultValues: { examCategory: 'MTS', isPro: false } 
  });

  const onUpdateSubmit = async (values: z.infer<typeof userUpdateSchema>) => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await updateUserDocument(selectedUser.uid, values);
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...selectedUser, ...values } : u));
      toast({ title: 'Success', description: 'User updated.' });
      setIsUpdateDialogOpen(false);
    } catch (error) { 
        toast({ title: 'Error', variant: 'destructive', description: 'Failed to update user.' }); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const onCreateSubmit = async (values: z.infer<typeof userCreateSchema>) => {
    setIsLoading(true);
    try {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Auth not initialized");
        
        // This is a simplified creation for admin use
        // In a real app, you might use a cloud function to create users without logging in
        toast({ title: 'Notice', description: 'Manual user creation requires administrative credentials.' });
        // For now we just close the dialog as this is a complex operation without a dedicated backend API
        setIsCreateDialogOpen(false);
    } catch (error) {
        toast({ title: 'Error', variant: 'destructive', description: 'Failed to create user.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenUpdateDialog = (user: UserData) => {
    setSelectedUser(user);
    updateUserForm.reset({ 
        name: user.name || '',
        phone: user.phone || '',
        employeeId: user.employeeId || '',
        city: user.city || '',
        division: user.division || '',
        examCategory: user.examCategory || 'MTS',
        isPro: user.isPro || false,
        proValidUntil: normalizeDate(user.proValidUntil)
    });
    setIsUpdateDialogOpen(true);
  };

  return (
    <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Audit students and courses.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
                </div>
            </div>
            <div className={cn("grid gap-4 mt-6", categoryFilter === 'all' ? "grid-cols-3" : "grid-cols-4")}>
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{categoryFilter === 'all' ? "Global Pool" : "Total Users"}</p>
                    <p className="text-2xl font-bold text-primary">{grandTotals.all}</p>
                </div>
                {categoryFilter !== 'all' && (
                  <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 text-center animate-in fade-in zoom-in duration-300">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{categoryFilter} Selected</p>
                      <p className="text-2xl font-bold text-blue-600">{grandTotals.filtered}</p>
                  </div>
                )}
                <div className="bg-green-500/5 p-3 rounded-lg border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{categoryFilter === 'all' ? "Pro Users" : `${categoryFilter} Pro`}</p>
                    <p className="text-2xl font-bold text-green-600">{grandTotals.pro}</p>
                </div>
                <div className="bg-orange-500/5 p-3 rounded-lg border border-orange-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{categoryFilter === 'all' ? "Free Users" : `${categoryFilter} Free`}</p>
                    <p className="text-2xl font-bold text-orange-600">{grandTotals.free}</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search name or email..." 
                        className="pl-8" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        <SelectItem value="MTS">MTS</SelectItem>
                        <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        <SelectItem value="IP">IP</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pro">Pro Only</SelectItem>
                        <SelectItem value="free">Free Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <TableRow key={u.uid}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{u.name}</span>
                                            <span className="text-xs text-muted-foreground">{u.email}</span>
                                            <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                <CalendarIcon className="h-2.5 w-2.5" />
                                                Joined: {normalizeDate(u.createdAt) ? format(normalizeDate(u.createdAt)!, 'dd MMM yyyy') : 'Pre-audit'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{u.examCategory}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {u.isPro ? (
                                            <Badge className="bg-green-600 hover:bg-green-700">Pro</Badge>
                                        ) : (
                                            <Badge variant="secondary">Free</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/dashboard/admin/history/${u.uid}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenUpdateDialog(u)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No users found matching your filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>

        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit User Profile</DialogTitle>
                    <DialogDescription>Update account details and subscription status.</DialogDescription>
                </DialogHeader>
                <Form {...updateUserForm}>
                    <form onSubmit={updateUserForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                        <FormField 
                            control={updateUserForm.control} 
                            name="name" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField 
                                control={updateUserForm.control} 
                                name="examCategory" 
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MTS">MTS</SelectItem>
                                                <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                                                <SelectItem value="PA">PA</SelectItem>
                                                <SelectItem value="IP">IP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                            <FormField 
                                control={updateUserForm.control} 
                                name="isPro" 
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-center">
                                        <FormLabel className="mb-2">Subscription</FormLabel>
                                        <div className="flex items-center space-x-2 h-10">
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is-pro-checkbox" />
                                            <label htmlFor="is-pro-checkbox" className="text-sm font-medium leading-none cursor-pointer">
                                                Active Pro
                                            </label>
                                        </div>
                                    </FormItem>
                                )} 
                            />
                        </div>
                        
                        {updateUserForm.watch('isPro') && (
                            <FormField
                                control={updateUserForm.control}
                                name="proValidUntil"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Pro Validity (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={updateUserForm.control} name="city" render={({ field }) => (
                                <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={updateUserForm.control} name="division" render={({ field }) => (
                                <FormItem><FormLabel>Division</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>Create a new account manually.</DialogDescription>
                </DialogHeader>
                <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                        <FormField control={createUserForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={createUserForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Gmail Only)</FormLabel><FormControl><Input {...field} placeholder="user@gmail.com" /></FormControl></FormItem>)} />
                        <FormField control={createUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={createUserForm.control} name="examCategory" render={({ field }) => (
                                <FormItem><FormLabel>Course</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="MTS">MTS</SelectItem><SelectItem value="POSTMAN">POSTMAN</SelectItem><SelectItem value="PA">PA</SelectItem><SelectItem value="IP">IP</SelectItem></SelectContent></Select></FormItem>
                            )} />
                            <FormField control={createUserForm.control} name="isPro" render={({ field }) => (<FormItem className="flex items-center space-x-2 pt-8"><Checkbox checked={field.value} onCheckedChange={field.onChange} /><FormLabel>Pro Access</FormLabel></FormItem>)} />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">Create Account</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
