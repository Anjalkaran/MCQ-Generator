"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Users, History, Database, HelpCircle } from 'lucide-react';
import type { UserData, MCQHistory, FreeClassRegistration, QnAUsage } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getAllExamHistory, getFreeClassRegistrations, getQnAUsage } from '@/lib/firestore';
import { normalizeDate } from '@/lib/utils';

type ExamCategory = 'all' | 'MTS' | 'POSTMAN' | 'PA' | 'IP';
type ProStatus = 'all' | 'pro' | 'free';

interface ReportsManagementProps {
    allUsers: UserData[];
}

function EngagementLogCard() {
    const [doubts, setDoubts] = useState<QnAUsage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [doubtData] = await Promise.all([
                    getQnAUsage()
                ]);
                setDoubts(doubtData);
            } catch (error) {
                toast({ title: "Error", description: "Could not load engagement logs.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const filteredDoubts = useMemo(() => {
        return doubts.filter(d => 
            (d as any).userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (d as any).userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.topic.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [doubts, searchTerm]);

    const handleDownload = () => {
        if (filteredDoubts.length === 0) return;
        const headers = ["User Name", "Email", "Topic", "Date"];
        const csvContent = [
            headers.join(','),
            ...filteredDoubts.map(d => {
                const logDate = normalizeDate(d.timestamp);
                return [
                    `"${(d as any).userName}"`,
                    `"${(d as any).userEmail}"`,
                    `"${d.topic}"`,
                    `"${logDate ? format(logDate, 'dd/MM/yyyy p') : 'N/A'}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `doubt_engagement_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Engagement History</CardTitle>
                        <CardDescription>Track Doubts asked by users.</CardDescription>
                    </div>
                    <Button onClick={handleDownload} size="sm" variant="outline" disabled={filteredDoubts.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
                <div className="pt-4">
                    <Input placeholder="Search by user, email or topic..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> Recent Doubts (Ask Your Doubt)</h3>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Topic</TableHead>
                                            <TableHead className="text-right">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDoubts.length > 0 ? filteredDoubts.map(d => {
                                            const logDate = normalizeDate(d.timestamp);
                                            return (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{(d as any).userName}<br/><span className="text-xs text-muted-foreground">{(d as any).userEmail}</span></TableCell>
                                                    <TableCell>{d.topic}</TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground">
                                                        {logDate ? format(logDate, 'dd/MM/yy p') : 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow><TableCell colSpan={3} className="text-center py-4">No doubts logged.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GlobalExamLogCard() {
    const [history, setHistory] = useState<MCQHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const data = await getAllExamHistory();
                setHistory(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not load exam history.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [toast]);

    const filteredHistory = useMemo(() => {
        return history.filter(h => 
            (h.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (h.topicTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [history, searchTerm]);

    const handleDownload = () => {
        if (filteredHistory.length === 0) return;
        const headers = ["User", "Topic", "Score", "Total", "Date"];
        const csvContent = [
            headers.join(','),
            ...filteredHistory.map(h => {
                const takenAt = normalizeDate(h.takenAt);
                return [
                    `"${h.userName}"`,
                    `"${h.topicTitle}"`,
                    h.score,
                    h.totalQuestions,
                    `"${takenAt ? format(takenAt, 'dd/MM/yyyy p') : 'N/A'}"`
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `global_exam_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Global Exam Log</CardTitle>
                        <CardDescription>A chronological log of all exams attempted by all users.</CardDescription>
                    </div>
                    <Button onClick={handleDownload} size="sm" variant="outline" disabled={filteredHistory.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
                <div className="pt-4">
                    <Input placeholder="Search by user or topic..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Topic</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistory.map(h => {
                                    const takenAt = normalizeDate(h.takenAt);
                                    return (
                                        <TableRow key={h.id}>
                                            <TableCell className="font-medium">{h.userName}</TableCell>
                                            <TableCell>{h.topicTitle}</TableCell>
                                            <TableCell className="text-center">{h.score}/{h.totalQuestions}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {takenAt ? format(takenAt, 'dd/MM/yy p') : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function LegacyDataCard() {
    const [registrations, setRegistrations] = useState<FreeClassRegistration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await getFreeClassRegistrations();
            setRegistrations(data);
            setIsLoading(false);
        };
        fetchData();
    }, [toast]);

    const handleDownload = () => {
        if (registrations.length === 0) return;
        const headers = ["Name", "Email", "Registered On"];
        const csvContent = [
            headers.join(','),
            ...registrations.map(r => {
                const regDate = normalizeDate(r.createdAt);
                return [
                    `"${r.name}"`,
                    `"${r.email}"`,
                    `"${regDate ? format(regDate, 'dd/MM/yyyy') : 'N/A'}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `legacy_free_class_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Legacy Free Class Data</CardTitle>
                        <CardDescription>Previous registrations from the now-retired Free Class module.</CardDescription>
                    </div>
                    <Button onClick={handleDownload} size="sm" variant="outline" disabled={registrations.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Registered On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.length > 0 ? registrations.map(r => {
                                    const regDate = normalizeDate(r.createdAt);
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.name}</TableCell>
                                            <TableCell>{r.email}</TableCell>
                                            <TableCell className="text-right text-xs">
                                                {regDate ? format(regDate, 'dd/MM/yyyy') : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No legacy data found.</TableCell></TableRow>
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
    const [activeTab, setActiveTab] = useState('user-reports');
    const [examCategoryFilter, setExamCategoryFilter] = useState<ExamCategory>('all');
    const [proStatusFilter, setProStatusFilter] = useState<ProStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return allUsers
            .filter(user => examCategoryFilter === 'all' || user.examCategory === examCategoryFilter)
            .filter(user => proStatusFilter === 'all' ? true : (proStatusFilter === 'pro' ? user.isPro : !user.isPro))
            .filter(user => (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allUsers, examCategoryFilter, proStatusFilter, searchTerm]);

    const handleDownloadUsers = () => {
        if (filteredUsers.length === 0) return;
        const headers = ["Name", "Email", "Category", "Exams Taken", "Status", "Joined On"];
        const csvContent = [
            headers.join(','),
            ...filteredUsers.map(u => {
                const joinedDate = normalizeDate(u.createdAt);
                return [
                    `"${u.name}"`,
                    `"${u.email}"`,
                    `"${u.examCategory}"`,
                    u.totalExamsTaken,
                    u.isPro ? "Pro" : "Free",
                    `"${joinedDate ? format(joinedDate, 'dd/MM/yyyy') : 'N/A'}"`
                ].join(',');
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
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reports & History</CardTitle>
                    <CardDescription>Retrieve past activity, user engagement, and legacy data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                         <Button variant={activeTab === 'user-reports' ? 'default' : 'outline'} onClick={() => setActiveTab('user-reports')} size="sm">
                            <Users className="mr-2 h-4 w-4" /> Users
                        </Button>
                         <Button variant={activeTab === 'exam-log' ? 'default' : 'outline'} onClick={() => setActiveTab('exam-log')} size="sm">
                            <History className="mr-2 h-4 w-4" /> Exam Log
                        </Button>
                         <Button variant={activeTab === 'engagement' ? 'default' : 'outline'} onClick={() => setActiveTab('engagement')} size="sm">
                            <Database className="mr-2 h-4 w-4" /> Engagement
                        </Button>
                         <Button variant={activeTab === 'legacy-data' ? 'default' : 'outline'} onClick={() => setActiveTab('legacy-data')} size="sm">
                            <Database className="mr-2 h-4 w-4" /> Legacy
                        </Button>
                    </div>

                    {activeTab === 'user-reports' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg flex-1">
                                    <div><Label>Search</Label><Input placeholder="Name/Email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                                    <div><Label>Course</Label><Select value={examCategoryFilter} onValueChange={(v) => setExamCategoryFilter(v as ExamCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="MTS">MTS</SelectItem><SelectItem value="POSTMAN">POSTMAN</SelectItem><SelectItem value="PA">PA</SelectItem><SelectItem value="IP">IP</SelectItem></SelectContent></Select></div>
                                    <div><Label>Status</Label><Select value={proStatusFilter} onValueChange={(v) => setProStatusFilter(v as ProStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent></Select></div>
                                </div>
                                <Button onClick={handleDownloadUsers} variant="outline" disabled={filteredUsers.length === 0}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Category</TableHead><TableHead>Exams</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredUsers.map(u => (
                                            <TableRow key={u.uid}><TableCell className="font-medium">{u.name}<br/><span className="text-xs text-muted-foreground">{u.email}</span></TableCell><TableCell>{u.examCategory}</TableCell><TableCell className="text-center">{u.totalExamsTaken}</TableCell><TableCell className="text-right">{u.isPro ? <Badge className="bg-green-600">Pro</Badge> : <Badge variant="secondary">Free</Badge>}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'exam-log' && <GlobalExamLogCard />}
                    {activeTab === 'engagement' && <EngagementLogCard />}
                    {activeTab === 'legacy-data' && <LegacyDataCard />}
                </CardContent>
            </Card>
        </div>
    );
}
