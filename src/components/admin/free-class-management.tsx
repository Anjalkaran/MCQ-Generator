

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Search } from 'lucide-react';
import type { FreeClassRegistration } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate } from '@/lib/utils';
import { useDashboard } from '@/app/dashboard/layout';
import { Badge } from '@/components/ui/badge';

export function FreeClassManagement() {
    const { freeClassRegistrations } = useDashboard();
    const [registrations, setRegistrations] = useState<FreeClassRegistration[]>(freeClassRegistrations || []);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        setRegistrations(freeClassRegistrations || []);
    }, [freeClassRegistrations]);

    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => 
            reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.mobileNumber.includes(searchTerm) ||
            reg.employeeId.includes(searchTerm) ||
            reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.division.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [registrations, searchTerm]);

    const handleDownloadCSV = () => {
        const headers = ["Name", "Gender", "Mobile Number", "Email", "Employee ID", "Designation", "Division", "Courses", "Registered At"];
        const csvContent = [
            headers.join(','),
            ...filteredRegistrations.map(reg => {
                const registeredAtDate = normalizeDate(reg.registeredAt);
                const formattedDate = registeredAtDate ? format(registeredAtDate, 'dd/MM/yyyy p') : "N/A";
                return [
                    `"${reg.name}"`,
                    `"${reg.gender}"`,
                    `"${reg.mobileNumber}"`,
                    `"${reg.email}"`,
                    `"${reg.employeeId}"`,
                    `"${reg.designation}"`,
                    `"${reg.division}"`,
                    `"${reg.courses.join(', ')}"`,
                    `"${formattedDate}"`
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `free_class_registrations_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Free Class Registrations</CardTitle>
                <CardDescription>
                    A list of all users who have registered. Total Registrations: {registrations.length}
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search registrations..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full"
                        />
                    </div>
                    <Button onClick={handleDownloadCSV} disabled={filteredRegistrations.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
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
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Employee Details</TableHead>
                                    <TableHead>Courses</TableHead>
                                    <TableHead className="text-right">Registered At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length > 0 ? (
                                    filteredRegistrations.map((reg) => {
                                        const registeredAtDate = normalizeDate(reg.registeredAt);
                                        const formattedDate = registeredAtDate ? format(registeredAtDate, 'dd/MM/yyyy p') : 'N/A';
                                        return (
                                            <TableRow key={reg.id}>
                                                <TableCell className="font-medium">{reg.name} <span className="text-xs text-muted-foreground">({reg.gender})</span></TableCell>
                                                <TableCell>{reg.mobileNumber}<br/><span className="text-xs text-muted-foreground">{reg.email}</span></TableCell>
                                                <TableCell>{reg.employeeId} <br/><span className="text-xs text-muted-foreground">{reg.designation} - {reg.division}</span></TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {reg.courses.map(course => <Badge key={course} variant="secondary">{course}</Badge>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formattedDate}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
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
