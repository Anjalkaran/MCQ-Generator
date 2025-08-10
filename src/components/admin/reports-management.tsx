
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gem, Download, Loader2, RefreshCw, Trophy, Languages, Users, UserCog } from 'lucide-react';
import type { UserData, MCQHistory } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { normalizeDate } from '@/lib/utils';
import { getAllExamHistory, getUserLanguagePreferences as fetchUserLanguagePreferences } from '@/lib/firestore';

type ExamCategory = 'all' | 'MTS' | 'POSTMAN' | 'PA';
type ProStatus = 'all' | 'pro' | 'free';
type UserLanguagePreference = { userId: string; name: string; email: string; preferredLanguage: string; };


interface ReportsManagementProps {
    allUsers: UserData[];
}

function DataReconciliationCard() {
    const [isLoading, setIsLoading] = useState(false);
    const [reconciliationType, setReconciliationType] = useState<'counts' | 'leaderboard' | null>(null);
    const { toast } = useToast();

    const handleReconcile = async (type: 'counts' | 'leaderboard') => {
        setIsLoading(true);
        setReconciliationType(type);
        
        const endpoint = type === 'counts' ? '/api/admin/reconcile-counts' : '/api/admin/reconcile-leaderboard';
        const successTitle = type === 'counts' ? 'Reconciliation Complete' : 'Leaderboard Cleaned';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to reconcile data.');
            }
            
            const description = type === 'counts' 
                ? `${result.updatedCount} user exam counts have been successfully updated.`
                : `${result.deletedCount} duplicate leaderboard entries have been removed.`;

            toast({
                title: successTitle,
                description: description,
            });

        } catch (error: any) {
            console.error('Reconciliation error:', error);
            toast({
                title: 'Operation Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setReconciliationType(null);
        }
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Data Reconciliation</CardTitle>
                <CardDescription>
                    Fix inconsistencies in user and exam data. This is useful for correcting data after a bug fix or import.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-semibold">Reconcile Exam Counts</h3>
                        <p className="text-sm text-muted-foreground">
                            Corrects the unified `totalExamsTaken` count for all users based on their entire saved exam history.
                        </p>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isLoading}>
                                {isLoading && reconciliationType === 'counts' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Reconcile Counts
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will scan all users and their entire exam history. It will update any users whose exam counts are incorrect. This action can take a few moments and cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleReconcile('counts')} disabled={isLoading}>
                                    {isLoading && reconciliationType === 'counts' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Reconcile Counts
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-semibold">Reconcile Live Test Leaderboard</h3>
                        <p className="text-sm text-muted-foreground">
                            Removes duplicate entries for any user in a live test, keeping only their best attempt (highest score, then fastest time).
                        </p>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isLoading}>
                                {isLoading && reconciliationType === 'leaderboard' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                                Reconcile Leaderboard
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   This will scan all live test history and permanently delete any duplicate entries for users. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleReconcile('leaderboard')} disabled={isLoading}>
                                    {isLoading && reconciliationType === 'leaderboard' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Reconcile Leaderboard
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    )
}

function LanguageUsageCard() {
    const [languageData, setLanguageData] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLanguageData = async () => {
            setIsLoading(true);
            try {
                const history = await getAllExamHistory();
                const counts: Record<string, number> = {};
                history.forEach(item => {
                    const lang = item.language || 'English'; // Default to English if not set
                    counts[lang] = (counts[lang] || 0) + 1;
                });
                setLanguageData(counts);
            } catch (error) {
                console.error("Failed to fetch language data:", error);
                toast({ title: "Error", description: "Could not load language report.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchLanguageData();
    }, [toast]);

    const sortedLanguages = useMemo(() => {
        return Object.entries(languageData).sort(([, a], [, b]) => b - a);
    }, [languageData]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Language Usage Report</CardTitle>
                <CardDescription>
                    Breakdown of languages used by users to take exams.
                </CardDescription>
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
                                    <TableHead>Language</TableHead>
                                    <TableHead className="text-right">Exams Taken</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedLanguages.length > 0 ? (
                                    sortedLanguages.map(([language, count]) => (
                                        <TableRow key={language}>
                                            <TableCell className="font-medium">{language}</TableCell>
                                            <TableCell className="text-right">{count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            No exam history found.
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

function UserLanguagePreferenceCard() {
    const [preferenceData, setPreferenceData] = useState<UserLanguagePreference[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchPreferenceData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchUserLanguagePreferences();
                setPreferenceData(data);
            } catch (error) {
                console.error("Failed to fetch user language preferences:", error);
                toast({ title: "Error", description: "Could not load user language preferences.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPreferenceData();
    }, [toast]);

    const filteredData = useMemo(() => {
        return preferenceData.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.preferredLanguage.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [preferenceData, searchTerm]);

    const handleDownload = () => {
        setIsDownloading(true);
        try {
            const headers = ["Name", "Email", "Preferred Language"];
            const csvContent = [
                headers.join(','),
                ...filteredData.map(user => 
                    [
                        `"${user.name}"`,
                        `"${user.email}"`,
                        `"${user.preferredLanguage}"`
                    ].join(',')
                )
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `user_language_preferences_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Language Preferences</CardTitle>
                <CardDescription>Each user's most frequently used language, based on their exam history.</CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Input 
                        placeholder="Search by name, email, or language..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                     <Button onClick={handleDownload} disabled={isDownloading || filteredData.length === 0}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
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
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Preferred Language</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? (
                                    filteredData.map((user) => (
                                        <TableRow key={user.userId}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline">{user.preferredLanguage}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No users match your search.
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


export function ReportsManagement({ allUsers }: ReportsManagementProps) {
    const [examCategoryFilter, setExamCategoryFilter] = useState<ExamCategory>('all');
    const [proStatusFilter, setProStatusFilter] = useState<ProStatus>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('user-reports');

    const uniqueCities = useMemo(() => {
        const cityMap = new Map<string, string>();
        allUsers.forEach(user => {
            if (user.city) {
                const normalizedCity = user.city.trim().toLowerCase();
                if (!cityMap.has(normalizedCity)) {
                    cityMap.set(normalizedCity, user.city.trim());
                }
            }
        });
        return ['all', ...Array.from(cityMap.values()).sort()];
    }, [allUsers]);

    const filteredUsers = useMemo(() => {
        const sortedUsers = [...allUsers].sort((a, b) => {
            const dateA = normalizeDate(a.createdAt);
            const dateB = normalizeDate(b.createdAt);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - dateA.getTime();
        });

        return sortedUsers
            .filter(user => examCategoryFilter === 'all' || user.examCategory === examCategoryFilter)
            .filter(user => {
                if (proStatusFilter === 'all') return true;
                return proStatusFilter === 'pro' ? user.isPro : !user.isPro;
            })
            .filter(user => cityFilter === 'all' || user.city?.trim().toLowerCase() === cityFilter.toLowerCase())
            .filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allUsers, examCategoryFilter, proStatusFilter, cityFilter, searchTerm]);
    
    const handleDownload = () => {
        setIsLoading(true);
        try {
            const headers = ["Name", "Email", "City", "Exam Category", "Status", "Exams Taken", "Registered On"];
            const csvContent = [
                headers.join(','),
                ...filteredUsers.map(user => {
                    const createdAtDate = normalizeDate(user.createdAt);
                    const formattedDate = createdAtDate ? format(createdAtDate, 'dd/MM/yyyy') : "N/A";
                    return [
                        `"${user.name}"`,
                        `"${user.email}"`,
                        `"${user.city || 'N/A'}"`,
                        `"${user.examCategory}"`,
                        user.isPro ? "Pro" : "Free",
                        user.totalExamsTaken || 0,
                        `"${formattedDate}"`
                    ].join(',')
                })
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `user_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reports & Data</CardTitle>
                    <CardDescription>Generate user reports, view analytics, and manage data integrity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                         <Button variant={activeTab === 'user-reports' ? 'default' : 'outline'} onClick={() => setActiveTab('user-reports')}>
                            <Users className="mr-2 h-4 w-4" />
                            User Reports
                        </Button>
                         <Button variant={activeTab === 'language-usage' ? 'default' : 'outline'} onClick={() => setActiveTab('language-usage')}>
                            <Languages className="mr-2 h-4 w-4" />
                            Language Usage
                        </Button>
                         <Button variant={activeTab === 'user-preferences' ? 'default' : 'outline'} onClick={() => setActiveTab('user-preferences')}>
                            <UserCog className="mr-2 h-4 w-4" />
                            User Preferences
                        </Button>
                        <Button variant={activeTab === 'data-tools' ? 'default' : 'outline'} onClick={() => setActiveTab('data-tools')}>
                             <RefreshCw className="mr-2 h-4 w-4" />
                            Data Tools
                        </Button>
                    </div>

                    {activeTab === 'user-reports' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="search">Search Name/Email</Label>
                                    <Input id="search" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="exam-category">Exam Category</Label>
                                    <Select value={examCategoryFilter} onValueChange={(v) => setExamCategoryFilter(v as ExamCategory)}>
                                        <SelectTrigger id="exam-category"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="MTS">MTS</SelectItem>
                                            <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                                            <SelectItem value="PA">PA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="pro-status">Subscription Status</Label>
                                    <Select value={proStatusFilter} onValueChange={(v) => setProStatusFilter(v as ProStatus)}>
                                        <SelectTrigger id="pro-status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pro">Pro Users</SelectItem>
                                            <SelectItem value="free">Free Users</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="city">City</Label>
                                    <Select value={cityFilter} onValueChange={setCityFilter}>
                                        <SelectTrigger id="city"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {uniqueCities.map(city => (
                                                <SelectItem key={city} value={city}>
                                                    {city === 'all' ? 'All Cities' : city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">Showing {filteredUsers.length} of {allUsers.length} total users.</p>
                                <Button onClick={handleDownload} disabled={isLoading || filteredUsers.length === 0}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Download CSV
                                </Button>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>City</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => (
                                                <TableRow key={user.uid}>
                                                    <TableCell className="font-medium">{user.name}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>{user.city || 'N/A'}</TableCell>
                                                    <TableCell>{user.examCategory}</TableCell>
                                                    <TableCell>
                                                        {user.isPro ? (
                                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                                <Gem className="mr-1 h-3 w-3" /> Pro
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Free</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    No users match the current filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'language-usage' && (
                        <LanguageUsageCard />
                    )}
                     {activeTab === 'user-preferences' && (
                        <UserLanguagePreferenceCard />
                    )}
                     {activeTab === 'data-tools' && (
                        <DataReconciliationCard />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
