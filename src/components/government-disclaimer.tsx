
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ExternalLink, Info } from 'lucide-react';

export function GovernmentDisclaimer() {
  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm">
        <div className="flex items-start sm:items-center gap-2">
          <div className="bg-slate-200 p-1 rounded-full shrink-0">
            <Info className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Anjalkaran is an independent educational platform and is <strong className="text-slate-900 font-semibold">NOT affiliated with or endorsed by the Department of Posts, Government of India.</strong>
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-[11px] text-red-600 hover:text-red-700 font-bold underline shrink-0 whitespace-nowrap pl-5 sm:pl-0">
              View Full Disclaimer
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Info className="h-5 w-5 text-red-600" />
                Disclaimer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 text-sm text-slate-600 leading-relaxed overflow-y-auto max-h-[70vh] pr-2">
              <p>
                <strong>Anjalkaran</strong> is an independent educational platform built specifically for aspirants of various Postal Department examinations (MTS, Postman, Mail Guard, PA, SA, and IP).
              </p>
              
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-red-900 font-semibold">
                  PLEASE NOTE: Anjalkaran is NOT affiliated with, authorized by, or endorsed by the Department of Posts, Government of India, or any other government entity.
                </p>
              </div>

              <p>
                This application does not represent any government department or official organization. It is an educational tool designed to help students prepare for competitive exams.
              </p>

              <p>
                All MCQ questions, topics, and study materials provided within this app are compiled from historical question papers, research, and publicly available information for educational purposes only. While we strive for accuracy, users are encouraged to verify all information and check for the latest official notifications directly from official sources.
              </p>

              <div className="pt-2 border-t border-slate-100">
                <p className="font-semibold text-slate-900 mb-3">Official Government Sources:</p>
                <div className="grid gap-3">
                  <a 
                    href="https://www.indiapost.gov.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-medium text-slate-900">India Post Official Website</span>
                    <div className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase tracking-wider">
                      .gov.in
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                  <a 
                    href="https://www.indiapost.gov.in/VAS/Pages/Recruitment.aspx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-medium text-slate-900">Latest Recruitment Notifications</span>
                    <div className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase tracking-wider">
                      Official
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                </div>
              </div>
              
              <p className="text-xs italic pt-4">
                Last updated: April 1, 2026. This disclaimer is displayed to comply with Google Play Policy regarding non-government affiliated apps.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
