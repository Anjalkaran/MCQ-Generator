
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, Search } from 'lucide-react';
import type { FreeClassRegistration } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

export function FreeClassManagement() {
    const [registrations, setRegistrations] = useState<FreeClassRegistration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchRegistrations = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/free-class-registrations');
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();
                setRegistrations(data.registrations);
            } catch (error) {
                console.error("Error fetching registrations:", error);
                toast({ title: "Error", description: "Could not load registration data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchRegistrations();
    }, [toast]);
    
    const filteredRegistrations = useMemo(() => {
        if (!searchTerm) {
          return registrations;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return registrations.filter(reg =>
            reg.name.toLowerCase().includes(lowercasedFilter) ||
            reg.email.toLowerCase().includes(lowercasedFilter) ||
            reg.mobileNumber.includes(lowercasedFilter) ||
            reg.division.toLowerCase().includes(lowercasedFilter) ||
            reg.employeeId.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, registrations]);

    const handleDownload = () => {
        setIsDownloading(true);
        try {
            const headers = ["Name", "Email", "Mobile", "Gender", "Division", "Employee ID", "Designation", "Courses", "Registered At"];
            const csvContent = [
                headers.join(','),
                ...filteredRegistrations.map(reg => 
                    [
                        `"${reg.name}"`,
                        `"${reg.email}"`,
                        `"${reg.mobileNumber}"`,
                        `"${reg.gender}"`,
                        `"${reg.division}"`,
                        `"${reg.employeeId}"`,
                        `"${reg.designation}"`,
                        `"${reg.courses.join(', ')}"`,
                        `"${format(reg.registeredAt, 'dd/MM/yyyy p')}"`
                    ].join(',')
                )
            ].join('\n');
            
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `free_class_registrations_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(error) {
            console.error("Failed to generate report", error);
            toast({title: "Error", description: "Could not generate CSV report.", variant: "destructive"})
        } finally {
            setIsDownloading(false);
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Free Class Registrations</CardTitle>
                <CardDescription>
                    Showing {filteredRegistrations.length} of {registrations.length} total registrations.
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                     <div className="relative flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search registrations..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                     <Button onClick={handleDownload} disabled={isDownloading || filteredRegistrations.length === 0}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Courses</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length > 0 ? (
                                    filteredRegistrations.map((reg) => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium">
                                                {reg.name}
                                                <br/>
                                                <span className="text-xs text-muted-foreground">{reg.gender}</span>
                                            </TableCell>
                                            <TableCell>
                                                {reg.email}
                                                <br/>
                                                <span className="text-xs text-muted-foreground">{reg.mobileNumber}</span>
                                            </TableCell>
                                             <TableCell>
                                                {reg.division} / {reg.designation}
                                                <br/>
                                                <span className="text-xs text-muted-foreground">Emp ID: {reg.employeeId}</span>
                                            </TableCell>
                                            <TableCell>
                                               <div className="flex flex-wrap gap-1">
                                                 {reg.courses.map(course => <Badge key={course} variant="secondary">{course}</Badge>)}
                                               </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No registrations found.
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
