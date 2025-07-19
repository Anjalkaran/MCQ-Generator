
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, Eye, PlusCircle, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserDocument, updateUserDocument } from '@/lib/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

const userUpdateSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA'>,
  isPro: z.boolean().default(false).optional(),
});

const userCreateSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA'>,
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
  const { toast } = useToast();

  const updateUserForm = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
  });
  
  const createUserForm = useForm<z.infer<typeof userCreateSchema>>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
        name: '',
        email: '',
        password: '',
        examCategory: 'MTS',
        isPro: false,
    }
  });

  const handleOpenUpdateDialog = (user: UserData) => {
    setSelectedUser(user);
    updateUserForm.reset({
      name: user.name,
      examCategory: user.examCategory,
      isPro: user.isPro || false,
    });
    setIsUpdateDialogOpen(true);
  };

  const onUpdateSubmit = async (values: z.infer<typeof userUpdateSchema>) => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      const dataToUpdate: Partial<UserData> = {
        name: values.name,
        examCategory: values.examCategory,
        isPro: values.isPro,
      };

      await updateUserDocument(selectedUser.uid, dataToUpdate);
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, ...dataToUpdate } : u));
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
    try {
      const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user.');
      }

      const { newUser } = await response.json();
      
      setUsers(prev => [...prev, newUser]);
      toast({ title: 'Success', description: 'User created successfully.' });
      setIsCreateDialogOpen(false);
      createUserForm.reset();

    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    <CardHeader className="flex flex-row items-center justify-between">
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
    </CardHeader>
    <CardContent>
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.length > 0 ? (
                users.map((user) => (
                    <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
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
                        <Button asChild variant="ghost" size="icon" disabled={user.email === 'admin@anjalkaran.com'}>
                          <Link href={`/dashboard/admin/history/${user.uid}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View History</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenUpdateDialog(user)} disabled={user.email === 'admin@anjalkaran.com' || isLoading}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>

                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={user.email === 'admin@anjalkaran.com' || isLoading}>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
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
