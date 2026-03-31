
import { GovernmentDisclaimer } from "@/components/government-disclaimer";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 font-sans text-gray-900 leading-relaxed">
      <header className="text-center mb-16">
        <h1 className="text-5xl font-extrabold mb-4 text-red-700 tracking-tight">Privacy Policy</h1>
        <p className="text-gray-500 font-medium">Official Privacy Policy for the Anjalkaran Platform</p>
        <p className="text-sm text-gray-400 mt-2 italic">Last updated: March 31, 2026</p>
      </header>
      
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-l-4 border-red-600 pl-4">1. Overview</h2>
        <p className="mb-4">
          Welcome to Anjalkaran ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
          This policy applies to all information collected through our website (anjalkaran.in) and our Android application available on the Google Play Store.
        </p>
      </section>

      <section className="mb-12 bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-l-4 border-red-600 pl-4">2. The Information We Collect</h2>
        <p className="mb-6">We collect personal information that you voluntarily provide to us when you register on our platform. The information we collect depends on the context of your interactions with us:</p>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-red-700 mb-2 underline decoration-red-200">Personal Identifiers</h3>
            <p className="text-sm">We collect your <strong>full name</strong> and <strong>email address</strong> when you sign in using Google Auth. This is used solely to identify your academic progress.</p>
          </div>
          <div>
            <h3 className="font-bold text-red-700 mb-2 underline decoration-red-200">Academic Progress</h3>
            <p className="text-sm">We store your <strong>MCQ test history</strong>, time spent on exams, and individual question performance to provide your personalized leaderboard and roadmap.</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-l-4 border-red-600 pl-4">3. Data Usage & Hosting</h2>
        <p className="mb-6">We use the information we collect for the following purposes:</p>
        <ul className="list-disc ml-8 space-y-3 mb-6">
          <li>To facilitate account creation and logon process via Google Auth.</li>
          <li>To display and track your <strong>MCQ test performance</strong>.</li>
          <li>To generate your <strong>weekly learning roadmap</strong> progress icons.</li>
          <li>To ensure the security and integrity of our leaderboard system.</li>
        </ul>
        <p className="text-sm bg-red-50 p-4 rounded-lg border border-red-100 text-red-800">
          <strong>Backend Infrastructure:</strong> All data is securely stored and processed using <strong>Google Firebase</strong> (Firebase Authentication, Firestore, and Storage). Your data is protected by Google's industry-leading security infrastructure.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-l-4 border-red-600 pl-4">4. Your Data Protection Rights</h2>
        <p className="mb-4">You have the following rights regarding your data:</p>
        <ul className="list-disc ml-8 space-y-2">
          <li>The right to <strong>access</strong> your personal data.</li>
          <li>The right to <strong>request deletion</strong> of your account and all associated test history.</li>
          <li>The right to request <strong>corrections</strong> to your identity data.</li>
        </ul>
      </section>

      <section className="mb-12 bg-red-700 p-8 rounded-3xl text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-4">5. Account & Data Deletion</h2>
        <p className="mb-4">
          You can request the permanent deletion of your account and all your stored test history at any time. 
          To do so, please send an email from your registered account to:
        </p>
        <div className="text-xl font-mono font-bold decoration-white underline cursor-pointer hover:text-red-100 transition-colors">
          anjalkaranss@gmail.com
        </div>
        <p className="mt-4 text-sm opacity-80 italic">Once we receive your request, your data will be permanently purged from our Firebase servers within 48 hours.</p>
      </section>

      <section className="mb-12 p-6 border-2 border-dashed border-gray-200 rounded-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-l-4 border-red-600 pl-4">6. Children's Privacy</h2>
        <p className="mb-4">
          Our services are intended for individuals appearing for government recruitment exams. 
          We do not knowingly collect personal information from individuals under the age of 13.
        </p>
      </section>

      <GovernmentDisclaimer />

      <footer className="mt-20 pt-10 border-t border-gray-100 text-center">
        <p className="text-gray-400 text-sm">&copy; 2026 Anjalkaran Learning Platform. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
          <a href="/" className="hover:text-red-700">Home</a>
          <a href="/dashboard" className="hover:text-red-700">Dashboard</a>
          <a href="mailto:anjalkaranss@gmail.com" className="hover:text-red-700">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}


