"use client";

import { useDashboard } from '@/context/dashboard-context';
import { useParams, useRouter } from 'next/navigation';
import { MaterialContent } from '@/components/dashboard/material-viewer';
import { Loader2, AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { ADMIN_EMAILS } from '@/lib/constants';
import type { StudyMaterial } from '@/lib/types';

export default function ReadMaterialPage() {
    const { id } = useParams();
    const router = useRouter();
    const { studyMaterials, topics, isLoading, userData } = useDashboard();
    
    const isAdmin = userData?.email && ADMIN_EMAILS.includes(userData.email);

    const material = useMemo(() => {
        if (isLoading || !id) return null;

        const materialId = id as string;

        // Check for virtual material from topic (v_topicId)
        if (materialId.startsWith('v_')) {
            const topicId = materialId.slice(2);
            const topic = topics.find(t => t.id === topicId);
            if (topic && topic.material) {
                return {
                    id: materialId,
                    topicId: topic.id,
                    fileName: topic.title,
                    fileType: 'docx',
                    content: topic.material,
                    examCategories: topic.examCategories,
                    uploadedAt: new Date()
                } as any as StudyMaterial;
            }
        }

        // Check for standard study material
        return studyMaterials.find(m => m.id === materialId) || null;
    }, [id, studyMaterials, topics, isLoading]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center flex-col gap-4 bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Securing Connection...
                </p>
            </div>
        );
    }

    if (!material) {
        return (
            <div className="flex h-screen w-full items-center justify-center flex-col gap-6 bg-slate-50 p-6 text-center">
                <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-2">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900">Material Not Found</h1>
                    <p className="text-slate-500 max-w-xs mx-auto">
                        This content may have been moved or you might not have the required permissions to view it.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => router.back()} className="rounded-xl font-bold">
                        Go Back
                    </Button>
                    <Button onClick={() => router.push('/dashboard')} className="rounded-xl font-bold">
                        <Home className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <main className="h-screen w-full bg-white overflow-hidden">
            <MaterialContent material={material} isAdmin={!!isAdmin} isFullPage={true} />
        </main>
    );
}
