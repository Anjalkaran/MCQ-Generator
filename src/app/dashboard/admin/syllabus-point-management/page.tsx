
import { getSyllabusMCQs, getSyllabusMaterials } from '@/lib/firestore';
import { SyllabusPointManagement } from '@/components/admin/syllabus-point-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SyllabusPointManagementPage() {
  const [mcqs, materials] = await Promise.all([
    getSyllabusMCQs(),
    getSyllabusMaterials()
  ]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-1000">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl mb-4 border border-red-100 shadow-sm">
           <Layers className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Syllabus Point Management</h1>
        <p className="text-slate-500 mt-2 font-medium max-w-lg mx-auto">Manage MCQs and Study Materials indexed by syllabus topics. These are separate from legacy topic-wise data.</p>
        
        <div className="mt-6 flex items-center justify-center gap-4">
           <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
             Collection: syllabusMCQs
           </div>
           <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
             Collection: syllabusMaterials
           </div>
        </div>
      </div>

      <SyllabusPointManagement initialMCQs={mcqs} initialMaterials={materials} />
    </div>
  );
}
