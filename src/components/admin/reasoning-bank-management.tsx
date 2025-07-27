
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
import { Loader2, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from 'next/image';

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileSchema = z.instanceof(File).refine(file => file.size > 0, 'File is required.').refine(
    (file) => file.size <= 2 * 1024 * 1024,
    `Max image size is 2MB.`
).refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
);

const optionalFileSchema = z.instanceof(File).optional().refine(
    (file) => !file || file.size <= 2 * 1024 * 1024,
    `Max image size is 2MB.`
).refine(
    (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
);

const reasoningBankSchema = z.object({
  questionImage: fileSchema,
  optionImage1: fileSchema,
  optionImage2: fileSchema,
  optionImage3: fileSchema,
  optionImage4: fileSchema,
  solutionImage: optionalFileSchema,
  correctAnswerIndex: z.string({ required_error: "Please select the correct answer."}),
});

function ImagePreview({ file }: { file?: File }) {
    if (!file) return null;
    const src = URL.createObjectURL(file);
    return (
        <div className="mt-2 relative w-32 h-32 border rounded-md overflow-hidden">
            <Image src={src} alt="Preview" layout="fill" objectFit="cover" onLoad={() => URL.revokeObjectURL(src)} />
        </div>
    );
}

export function ReasoningBankManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reasoningBankSchema>>({
    resolver: zodResolver(reasoningBankSchema),
  });
  
  const watchedFiles = form.watch(["questionImage", "optionImage1", "optionImage2", "optionImage3", "optionImage4", "solutionImage"]);

  const onSubmit = async (values: z.infer<typeof reasoningBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('questionImage', values.questionImage);
    formData.append('optionImage1', values.optionImage1);
    formData.append('optionImage2', values.optionImage2);
    formData.append('optionImage3', values.optionImage3);
    formData.append('optionImage4', values.optionImage4);
    if (values.solutionImage) {
        formData.append('solutionImage', values.solutionImage);
    }
    formData.append('correctAnswerIndex', values.correctAnswerIndex);

    try {
        const response = await fetch('/api/reasoning-bank/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload.');
        }
        toast({ title: 'Success', description: 'Reasoning question uploaded successfully.' });
        form.reset();

    } catch (error: any) {
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Upload Reasoning Question</CardTitle>
                <CardDescription>Upload image-based questions and options for the reasoning test.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="questionImage"
                            render={({ field: { onChange, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Question Image</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <ImagePreview file={watchedFiles[0]} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="correctAnswerIndex"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Options (Upload 4 images and select the correct answer)</FormLabel>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    {[1, 2, 3, 4].map((i) => (
                                        <FormItem key={i} className="flex flex-col space-y-2 p-4 border rounded-md">
                                             <div className="flex items-center space-x-3">
                                                <FormControl>
                                                    <RadioGroupItem value={`${i - 1}`} />
                                                </FormControl>
                                                <FormLabel className="font-normal">Option {i} (Correct Answer)</FormLabel>
                                             </div>
                                            <FormField
                                                control={form.control}
                                                name={`optionImage${i}` as any}
                                                render={({ field: { onChange, ...rest } }) => (
                                                     <FormItem>
                                                        <FormControl>
                                                            <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                                        </FormControl>
                                                        <ImagePreview file={watchedFiles[i]} />
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="solutionImage"
                            render={({ field: { onChange, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Solution Image (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <ImagePreview file={watchedFiles[5]} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <Button type="submit" disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload Question
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
