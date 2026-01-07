
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

const materialSchema = z.object({
  topicName: z.string().min(3, 'Please enter a topic name.'),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, 'Please upload a file.')
    .refine((files) => files[0]?.size <= 5 * 1024 * 1024, `File size must be less than 5MB.`),
});

export function StudyMaterialManagement() {
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof materialSchema>>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            topicName: '',
        }
    });

    const { register } = form;

    const onSubmit = async (values: z.infer<typeof materialSchema>) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', values.file[0]);
        formData.append('topicName', values.topicName);

        try {
            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file.');
            }
            
            toast({ title: 'Success', description: 'Study material uploaded successfully.' });
            form.reset();

        } catch (error: any) {
            console.error("Material upload error:", error);
            toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Study Material</CardTitle>
                    <CardDescription>Upload PDF or DOCX files for any topic. If the topic doesn't exist, it will be automatically created.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                           <FormField
                                control={form.control}
                                name="topicName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Topic Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter the topic name manually" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormItem>
                                <FormLabel>Material File (.pdf, .docx)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept=".pdf,.docx,.doc" 
                                        {...register("file")}
                                    />
                                </FormControl>
                                <FormMessage>{form.formState.errors.file?.message}</FormMessage>
                            </FormItem>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Material
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
