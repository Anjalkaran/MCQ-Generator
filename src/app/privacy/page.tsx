import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-red-600 px-6 py-10 text-white text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-red-100 italic">Last Updated: March 29, 2026</p>
        </div>

        <div className="p-8 space-y-8 text-slate-600 leading-relaxed">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Data Security</h2>
            </div>
            <p>
              Anjalkaran is committed to ensuring your privacy is protected. We use Firebase services to securely manage 
              authentication and data storage. Your personal information is encrypted and accessible only to you.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Information We Collect</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>Profile data (Email, Name) provided via Google Sign-In or Email.</li>
              <li>Quiz performance and progress for tracking your exam preparation.</li>
              <li>Device info to maintain a secure and stable experience.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Your Rights</h2>
            </div>
            <p>
              You have the right to access your data, update your profile, and request account deletion at any time 
              via the dashboard settings. We do not sell your data to any third-party services.
            </p>
          </section>

          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-sm">
              Questions? Contact us at <span className="text-red-600 font-medium cursor-help">support@anjalkaran.in</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
