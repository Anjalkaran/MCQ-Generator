
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const questionBankSchema = z.object({
  examCategory: z.enum(examCategories, {
    required_error: 'You must select an exam category.',
  }),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Please upload a file.')
    .refine((file) => file.size <= 4 * 1024 * 1024, `File size must be less than 4MB.`),
});

export function QuestionBankManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof questionBankSchema>>({
    resolver: zodResolver(questionBankSchema),
  });
  
  const fileRef = form.register("file");

  const onSubmit = async (values: z.infer<typeof questionBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', values.file);
    formData.append('examCategory', values.examCategory);

    try {
      const response = await fetch('/api/question-bank/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      toast({ title: 'Success', description: 'Question bank updated successfully.' });
      form.reset();

    } catch (error: any) {
      console.error("Question bank upload error:", error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not process the file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Question Bank</CardTitle>
        <CardDescription>Upload PDF or DOCX files containing previous years' questions. These will be used as a reference to generate new MCQs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="examCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an exam category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {examCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Questions File</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept=".pdf,.docx"
                      onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Questions
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
