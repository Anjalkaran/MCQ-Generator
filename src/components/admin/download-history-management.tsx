
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Download, FileText } from 'lucide-react';
import type { MaterialDownload } from '@/lib/types';
import { getMaterialDownloads } from '@/lib/firestore';
import { format } from 'date-fns';
import { normalizeDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function DownloadHistoryManagement() {
    const [downloads, setDownloads] = useState<MaterialDownload[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchDownloads = async () => {
            setIsLoading(true);
            try {
                const data = await getMaterialDownloads();
                setDownloads(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not load download history.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchDownloads();
    }, [toast]);

    const filteredDownloads = useMemo(() => {
        return downloads.filter(d => 
            d.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.materialTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [downloads, searchTerm]);

    const handleExportCsv = () => {
        if (filteredDownloads.length === 0) return;
        
        const headers = ["User Name", "Email", "Material Title", "Downloaded At"];
        const csvContent = [
            headers.join(','),
            ...filteredDownloads.map(d => [
                `"${d.userName}"`,
                `"${d.userEmail}"`,
                `"${d.materialTitle}"`,
                `"${format(normalizeDate(d.downloadedAt) || new Date(), 'dd/MM/yyyy p')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `material_download_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Material Download History</CardTitle>
                        <CardDescription>Track which users are accessing your study materials.</CardDescription>
                    </div>
                    <button 
                        onClick={handleExportCsv} 
                        disabled={filteredDownloads.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
                <div className="pt-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by user name, email, or material..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead className="text-right">Date & Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDownloads.length > 0 ? (
                                    filteredDownloads.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>
                                                <div className="font-medium">{d.userName}</div>
                                                <div className="text-xs text-muted-foreground">{d.userEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    {d.materialTitle}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {format(normalizeDate(d.downloadedAt) || new Date(), 'dd/MM/yyyy p')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No download history found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
