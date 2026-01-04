
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, Search, Loader2 } from 'lucide-react';
import type { VideoClass } from '@/lib/types';
import Image from 'next/image';

function VideoPlayer({ video }: { video: VideoClass }) {
    return (
        <DialogContent className="max-w-4xl h-auto flex flex-col">
            <DialogHeader>
                <DialogTitle>{video.title}</DialogTitle>
                 <DialogDescription>{video.description}</DialogDescription>
            </DialogHeader>
            <div className="aspect-video w-full">
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </DialogContent>
    );
}

export default function VideoClassesPage() {
    const { videoClasses, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVideos = useMemo(() => {
        const videos = videoClasses || [];
        if (!searchTerm) {
            return videos;
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        return videos.filter(video =>
            video.title.toLowerCase().includes(lowercasedFilter) ||
            video.description.toLowerCase().includes(lowercasedFilter)
        );
    }, [videoClasses, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Video Classes</h1>
                <p className="text-muted-foreground">
                    Watch recorded classes to improve your understanding of key topics.
                </p>
            </div>

             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search videos by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full"
                />
            </div>

            {filteredVideos.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredVideos.map(video => (
                         <Dialog key={video.id}>
                            <DialogTrigger asChild>
                                <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                                    <CardHeader className="p-0">
                                        <div className="aspect-video relative">
                                            <Image 
                                                src={`https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`}
                                                alt={video.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                <PlayCircle className="h-12 w-12 text-white/80" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 flex-grow flex flex-col">
                                        <CardTitle className="text-lg leading-tight mb-2">{video.title}</CardTitle>
                                        <CardDescription className="text-sm line-clamp-2 flex-grow">{video.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            </DialogTrigger>
                             <VideoPlayer video={video} />
                        </Dialog>
                    ))}
                 </div>
            ) : (
                <Card>
                    <CardContent className="h-48 flex flex-col items-center justify-center text-center">
                        <CardTitle>No Videos Found</CardTitle>
                        <CardDescription className="mt-2">
                             {searchTerm 
                                ? "No videos match your search term." 
                                : "No video classes have been uploaded for your exam category yet."
                             }
                        </CardDescription>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
