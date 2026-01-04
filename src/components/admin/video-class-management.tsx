
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { VideoClass } from '@/lib/types';
import { Loader2, Trash2, Edit, PlusCircle } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { addVideoClass, updateVideoClass, deleteVideoClass } from '@/lib/firestore';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

const videoSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  youtubeVideoId: z.string().min(11, 'Please enter a valid YouTube Video ID.').max(11),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
});

interface VideoClassManagementProps {
    initialVideos: VideoClass[];
}

export function VideoClassManagement({ initialVideos = [] }: VideoClassManagementProps) {
    const [videos, setVideos] = useState<VideoClass[]>(initialVideos);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<VideoClass | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof videoSchema>>({
        resolver: zodResolver(videoSchema),
    });

    useEffect(() => {
        if (editingVideo) {
            form.reset({
                title: editingVideo.title,
                description: editingVideo.description,
                youtubeVideoId: editingVideo.youtubeVideoId,
                examCategories: editingVideo.examCategories,
            });
        } else {
            form.reset({
                title: '',
                description: '',
                youtubeVideoId: '',
                examCategories: [],
            });
        }
    }, [editingVideo, form]);


    const onSubmit = async (values: z.infer<typeof videoSchema>) => {
        setIsLoading(true);
        try {
            if (editingVideo) {
                const updatedData = { ...values, uploadedAt: editingVideo.uploadedAt };
                await updateVideoClass(editingVideo.id, updatedData);
                setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, ...updatedData } : v));
                toast({ title: 'Success', description: 'Video class updated.' });
            } else {
                const newData = { ...values, uploadedAt: new Date() };
                const docRef = await addVideoClass(newData);
                setVideos(prev => [{ id: docRef.id, ...newData }, ...prev]);
                toast({ title: 'Success', description: 'New video class added.' });
            }
            form.reset();
            setIsDialogOpen(false);
            setEditingVideo(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save video class.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (videoId: string) => {
        try {
            await deleteVideoClass(videoId);
            setVideos(prev => prev.filter(v => v.id !== videoId));
            toast({ title: 'Success', description: 'Video class deleted.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete video class.', variant: 'destructive' });
        }
    };
    
    const handleOpenDialog = (video: VideoClass | null) => {
        setEditingVideo(video);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingVideo(null); }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Video Class
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>{editingVideo ? 'Edit Video Class' : 'Add New Video Class'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                             <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input placeholder="e.g., Introduction to PLI" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="youtubeVideoId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>YouTube Video ID</FormLabel>
                                    <FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea rows={4} placeholder="A brief description of the video content." {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="examCategories"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2"><FormLabel>Exam Categories</FormLabel></div>
                                        <div className="flex flex-wrap gap-4">
                                            {examCategories.map((item) => (
                                                <FormField
                                                    key={item}
                                                    control={form.control}
                                                    name="examCategories"
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item)}
                                                                    onCheckedChange={(checked) => (
                                                                        checked
                                                                            ? field.onChange([...(field.value || []), item])
                                                                            : field.onChange(field.value?.filter((value) => value !== item))
                                                                    )}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{item}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Video"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Video Classes</CardTitle>
                    <CardDescription>View, edit, or delete existing video classes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Thumbnail</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Categories</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {videos && videos.length > 0 ? (
                                    videos.map((video) => (
                                        <TableRow key={video.id}>
                                            <TableCell>
                                                <Image 
                                                    src={`https://img.youtube.com/vi/${video.youtubeVideoId}/default.jpg`}
                                                    alt={video.title}
                                                    width={120}
                                                    height={90}
                                                    className="rounded-md"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{video.title}</TableCell>
                                            <TableCell className="flex flex-wrap gap-1">
                                                {video.examCategories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(video)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete: {video.title}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(video.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No video classes added yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
