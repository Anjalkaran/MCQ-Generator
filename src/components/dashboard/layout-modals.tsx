
"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Video, Library, FileQuestion } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { normalizeDate } from '@/lib/utils';
import type { VideoClass, StudyMaterial, Topic } from '@/lib/types';

const profileUpdateSchema = z.object({
  employeeId: z.string().length(8, { message: 'Employee ID must be exactly 8 digits.' }).regex(/^\d{8}$/, 'Employee ID must be a number.'),
  mobileNumber: z.string().min(10, { message: 'Mobile number must be at least 10 digits.' }),
});

export function ProfileUpdateDialog({ open, onUpdateSubmit, defaultValues }: { open: boolean; onUpdateSubmit: (values: any) => Promise<void>; defaultValues: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({ resolver: zodResolver(profileUpdateSchema), defaultValues });
  
  const handleSubmit = async (values: any) => { 
    setIsSubmitting(true); 
    await onUpdateSubmit(values); 
    setIsSubmitting(false); 
  };

  return (
    <Dialog open={open}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader>
          <DialogTitle>Update Required</DialogTitle>
          <DialogDescription>Please provide your 8-digit Employee ID and 10-digit mobile number to continue.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField 
              control={form.control} 
              name="employeeId" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="8-digit ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField 
              control={form.control} 
              name="mobileNumber" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="10-digit number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function NewContentPopup({ newContent, onClose, topics }: { newContent: { videos: VideoClass[], materials: StudyMaterial[], mcqs: any[] }; onClose: () => void; topics: Topic[] }) {
  const getDisplayName = (item: any) => item.topicName || topics.find(t => t.id === item.topicId)?.title || 'Unknown Topic';
  
  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Content Added!</DialogTitle>
          <DialogDescription>Check out the latest materials we've uploaded for you.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {newContent.videos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> New Video Classes</h3>
                <div className="space-y-2">
                  {newContent.videos.map(video => {
                    const date = normalizeDate(video.uploadedAt);
                    if (!date) return null;
                    return (
                      <div key={video.id} className="text-sm p-3 border rounded-xl bg-slate-50/50">
                        <p className="font-bold text-slate-800">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">Added {formatDistanceToNow(date, { addSuffix: true })}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {newContent.materials.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> New Study Materials</h3>
                <div className="space-y-2">
                  {newContent.materials.map(material => {
                    const date = normalizeDate(material.uploadedAt);
                    return (
                      <div key={material.id} className="text-sm p-3 border rounded-xl bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-800">{getDisplayName(material)}</p>
                          {material.subTopic && (
                            <Badge variant="outline" className="h-4 px-1 text-[8px] font-black bg-white border-emerald-100 text-emerald-600 uppercase shrink-0">
                              {material.subTopic}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          File: {material.fileName}
                          {date && ` • Added ${formatDistanceToNow(date, { addSuffix: true })}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {newContent.mcqs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><FileQuestion className="h-5 w-5 text-primary" /> New Practice MCQs</h3>
                <div className="space-y-2">
                  {newContent.mcqs.map(mcq => {
                    const date = normalizeDate(mcq.uploadedAt);
                    return (
                      <div key={mcq.id} className="text-sm p-3 border rounded-xl bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-800">{getDisplayName(mcq)}</p>
                          {mcq.subTopic && (
                            <Badge variant="outline" className="h-4 px-1 text-[8px] font-black bg-white border-blue-100 text-blue-600 uppercase shrink-0">
                              {mcq.subTopic}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          File: {mcq.fileName}
                          {date && ` • Added ${formatDistanceToNow(date, { addSuffix: true })}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Got it, thanks!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
