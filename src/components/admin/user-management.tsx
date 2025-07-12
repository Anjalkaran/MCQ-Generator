
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserDocument, updateUserDocument, createUserDocument } from '@/lib/firestore';
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
import { useForm, useForm as useFormHook } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const userUpdateSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'ALL'>,
});

const userSyncSchema = z.object({
    uid: z.string().min(1, { message: 'User ID (UID) is required.' }),
    email: z.string().email({ message: 'A valid email is required.'}),
    name: z.string().min(1, { message: 'Username is required.' }),
    examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'ALL'>,
});


interface UserManagementProps {
    initialUsers: UserData[];
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
  });

  const syncForm = useFormHook<z.infer<typeof userSyncSchema>>({
    resolver: zodResolver(userSyncSchema),
    defaultValues: {
      uid: '',
      email: '',
      name: '',
      examCategory: 'PA',
    }
  });


  const handleOpenUpdateDialog = (user: UserData) => {
    setSelectedUser(user);
    form.reset({
      name: user.name,
      examCategory: user.examCategory,
    });
    setIsUpdateDialogOpen(true);
  };

  const onUpdateSubmit = async (values: z.infer<typeof userUpdateSchema>) => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await updateUserDocument(selectedUser.uid, values);
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, ...values } : u));
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


  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await deleteUserDocument(userId);
      // For a full implementation, you would also call a serverless function here
      // to delete the user from Firebase Authentication.
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

   const onSyncSubmit = async (values: z.infer<typeof userSyncSchema>) => {
    setIsLoading(true);
    try {
      const newUser: UserData = {
        id: values.uid,
        uid: values.uid,
        name: values.name,
        email: values.email,
        examCategory: values.examCategory,
      };
      await createUserDocument(newUser);
      setUsers(prev => [...prev, newUser]);
      toast({ title: 'Success', description: 'User document created successfully.' });
      syncForm.reset();
    } catch (error) {
      console.error("Error syncing user:", error);
      toast({ title: 'Error', description: 'Failed to create user document in Firestore.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>A list of all registered users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Exam Category</TableHead>
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
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenUpdateDialog(user)} disabled={user.email === 'admin@anjalkaran.com' || isLoading}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </Button>

                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={user.email === 'admin@anjalkaran.com' || isLoading}>
                                    <Trash2 className="h-4 w-4" />
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
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.uid)}>
                                        Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
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
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
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
                                        control={form.control}
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
                                                <SelectItem value="ALL">ALL (Common)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
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
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Sync User</CardTitle>
                    <CardDescription>Manually create a Firestore document for a user that exists in Firebase Authentication but not in the database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...syncForm}>
                        <form onSubmit={syncForm.handleSubmit(onSyncSubmit)} className="space-y-4">
                             <FormField
                                control={syncForm.control}
                                name="uid"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>User ID (UID)</FormLabel>
                                    <FormControl><Input placeholder="Firebase Auth User ID" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={syncForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="user@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={syncForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={syncForm.control}
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
                                        <SelectItem value="ALL">ALL (Common)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Create User Document
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
