

"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, Eye, PlusCircle, Gem, Search, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserDocument, updateUserDocument, createUserDocument } from '@/lib/firestore';
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
  phone: z.string().min(10, { message: 'Mobile number must be at least 10 digits.' }).optional().or(z.literal('')),
  employeeId: z.string().length(8, { message: 'Employee ID must be exactly 8 digits.' }).regex(/^\d{8}$/, 'Employee ID must be a number.').optional().or(z.literal('')),
  city: z.string().min(2, { message: "City is required." }),
  division: z.string().min(2, { message: 'Division name is required.' }).refine(val => !val.includes('@'), {
    message: 'Division cannot be an email address.',
  }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'IP'>,
  isPro: z.boolean().default(false).optional(),
  proValidUntil: z.date().optional().nullable(),
});

const userCreateSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }).refine(
    (email) => email.toLowerCase().endsWith('@gmail.com'),
    {
      message: "Only @gmail.com addresses are allowed for registration.",
    }
  ),
  city: z.string().min(2, { message: "City is required." }),
  division: z.string().min(2, { message: 'Division name is required.' }).refine(val => !val.includes('@'), {
    message: 'Division cannot be an email address.',
  }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'IP'>,
  isPro: z.boolean().default(false).optional(),
});

interface UserManagementProps {
    initialUsers: UserData[];
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const sortedUsers = [...initialUsers].sort((a, b) => {
        const dateA = normalizeDate(a.createdAt);
        const dateB = normalizeDate(b.createdAt);
        // Treat null dates as older than any valid date
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
    });
    setUsers(sortedUsers);
  }, [initialUsers]);

  const uniqueCities = useMemo(() => {
    const cityMap = new Map<string, string>();
    users.forEach(user => {
        if (user.city) {
            const normalizedCity = user.city.trim().toLowerCase();
            if (!cityMap.has(normalizedCity)) {
                cityMap.set(normalizedCity, user.city.trim());
            }
        }
    });
    return ['all', ...Array.from(cityMap.values()).sort()];
  }, [users]);
  
  const baseFilteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (cityFilter === 'all') return true;
        return user.city?.trim().toLowerCase() === cityFilter.toLowerCase();
      })
      .filter(user => {
        if (categoryFilter === 'all') return true;
        return user.examCategory === categoryFilter;
      })
      .filter(user =>
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [users, searchTerm, cityFilter, categoryFilter]);

  const filteredUsers = useMemo(() => {
    return baseFilteredUsers.filter(user => {
        if (filter === 'pro') return user.isPro;
        if (filter === 'free') return !user.isPro;
        return true;
    });
  }, [baseFilteredUsers, filter]);

  const filteredCounts = useMemo(() => {
    const proCount = baseFilteredUsers.filter(u => u.isPro).length;
    const freeCount = baseFilteredUsers.filter(u => !u.isPro).length;
    return {
        all: baseFilteredUsers.length,
        pro: proCount,
        free: freeCount,
    }
  }, [baseFilteredUsers]);


  const updateUserForm = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
  });
  
  const createUserForm = useForm<z.infer<typeof userCreateSchema>>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
        name: '',
        email: '',
        city: '',
        division: '',
        password: '',
        examCategory: 'MTS',
        isPro: false,
    }
  });

  const isProWatcher = updateUserForm.watch('isPro');

  const handleOpenUpdateDialog = (user: UserData) => {
    setSelectedUser(user);
    updateUserForm.reset({
      name: user.name,
      city: user.city || '',
      division: user.division || '',
      phone: user.phone || '',
      employeeId: user.employeeId || '',
      examCategory: user.examCategory,
      isPro: user.isPro || false,
      proValidUntil: normalizeDate(user.proValidUntil),
    });
    setIsUpdateDialogOpen(true);
  };

  const onUpdateSubmit = async (values: z.infer<typeof userUpdateSchema>) => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      const dataToUpdate: Partial<UserData> = {
        name: values.name,
        city: values.city,
        division: values.division,
        phone: values.phone,
        employeeId: values.employeeId,
        examCategory: values.examCategory,
        isPro: values.isPro,
        proValidUntil: values.proValidUntil,
      };
      
      await updateUserDocument(selectedUser.uid, dataToUpdate);
      
      const updatedLocalUser = { ...selectedUser, ...dataToUpdate };
      
      setUsers(users.map(u => u.uid === selectedUser.uid ? updatedLocalUser : u));

      toast({ title: 'Success', description: 'User updated successfully.' });
      setIsUpdateDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onCreateSubmit = async (values: z.infer<typeof userCreateSchema>) => {
    setIsLoading(true);
    const auth = getFirebaseAuth();
    if (!auth) {
        toast({ title: "Error", description: "Firebase Auth is not initialized.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, { displayName: values.name });
        
        const newUser: UserData = {
            uid: userCredential.user.uid,
            name: values.name,
            email: values.email,
            city: values.city,
            division: values.division,
            examCategory: values.examCategory,
            isPro: values.isPro,
            totalExamsTaken: 0,
            createdAt: new Date(),
        };

        await createUserDocument(newUser);
        
        setUsers(prev => [newUser, ...prev]);
        toast({ title: 'Success', description: 'User created successfully.' });
        setIsCreateDialogOpen(false);
        createUserForm.reset();

    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({ title: 'Error', description: error.message || 'Failed to create user.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await deleteUserDocument(userId);
      toast({
        title: 'User Deleted',
        description: 'User data has been removed from Firestore.',
      });
      setUsers(prevUsers => prevUsers.filter(user => user.uid !== userId));
    } catch (error) {
        console.error("Error deleting user:", error)
      toast({
        title: 'Error Deleting User',
        description: 'Could not delete the user. This action is sensitive and may require server privileges.',
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card>
    <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>A list of all registered users in the system.</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new user. They will be created in both Authentication and Firestore.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createUserForm}>
                        <form onSubmit={createUserForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <FormField
                                control={createUserForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createUserForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="name@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={createUserForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl><Input placeholder="User's City" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createUserForm.control}
                                    name="division"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Division</FormLabel>
                                        <FormControl><Input placeholder="User's Division" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={createUserForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createUserForm.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Exam Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                            control={createUserForm.control}
                            name="isPro"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Pro User</FormLabel>
                                    <DialogDescription>
                                    Pro users have unlimited access to all features.
                                    </DialogDescription>
                                </div>
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create User"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <div className="relative w-full sm:w-auto flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name or email..."
                    className="pl-8 sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
                <TabsList>
                    <TabsTrigger value="all">All ({filteredCounts.all})</TabsTrigger>
                    <TabsTrigger value="pro">Pro ({filteredCounts.pro})</TabsTrigger>
                    <TabsTrigger value="free">Free ({filteredCounts.free})</TabsTrigger>
                </TabsList>
            </Tabs>
             <div className="w-full sm:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="MTS">MTS</SelectItem>
                        <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        <SelectItem value="IP">IP</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="w-full sm:w-auto">
                <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCities.map(city => (
                            <SelectItem key={city} value={city}>
                                {city === 'all' ? 'All Cities' : city}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    </CardHeader>
    <CardContent>
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone / Emp ID</TableHead>
                <TableHead>City / Division</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}<br/>{user.employeeId || ''}</TableCell>
                    <TableCell>{user.city || 'N/A'}<br/>{user.division || ''}</TableCell>
                    <TableCell>{user.examCategory}</TableCell>
                    <TableCell>
                      {user.isPro ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <Gem className="mr-1 h-3 w-3" />
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon" disabled={ADMIN_EMAILS.includes(user.email)}>
                          <Link href={`/dashboard/admin/history/${user.uid}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View History</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenUpdateDialog(user)} disabled={ADMIN_EMAILS.includes(user.email) || isLoading}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>

                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={ADMIN_EMAILS.includes(user.email) || isLoading}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user's data from Firestore.
                                To fully remove the user, you may need to delete them from the Firebase Authentication panel as well.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className={cn(buttonVariants({ variant: "destructive" }))}
                                onClick={() => handleDeleteUser(user.uid)}>
                                Delete User
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                    No users match your criteria.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Edit User: {selectedUser?.name}</DialogTitle>
                    <DialogDescription>
                        Update the user's details below. Email address cannot be changed.
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...updateUserForm}>
                        <form onSubmit={updateUserForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                            <FormField
                                control={updateUserForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={updateUserForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Mobile Number</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={updateUserForm.control}
                                    name="employeeId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Employee ID</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={updateUserForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={updateUserForm.control}
                                    name="division"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Division</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={updateUserForm.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Exam Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>Pro User</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                             {isProWatcher && (
                                <FormField
                                    control={updateUserForm.control}
                                    name="proValidUntil"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Pro Valid Until</FormLabel>
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
                                                        selected={field.value ?? undefined}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date()
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             )}
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
    </CardContent>
    </Card>
  );
}
