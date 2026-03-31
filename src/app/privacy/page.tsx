import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-sans text-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-red-700">Privacy Policy for Anjalkaran</h1>
      <p className="mb-6 text-sm text-gray-500">Last updated: March 31, 2026</p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">1. Introduction</h2>
        <p className="mb-4 text-lg">
          Welcome to Anjalkaran. We respect your privacy and are committed to protecting your personal data. 
          This privacy policy will inform you as to how we look after your personal data when you visit our 
          website or use our Android application.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">2. Data We Collect</h2>
        <p className="mb-4">
          When you use Anjalkaran, we may collect the following information:
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Identity Data:</strong> First name, last name, and username.</li>
          <li><strong>Contact Data:</strong> Email address (provided via Google Sign-In).</li>
          <li><strong>Academic Performance:</strong> Scores and history from mcq tests practiced on the platform.</li>
          <li><strong>Device Data:</strong> Basic information about your device used to access our app.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">3. How We Use Your Data</h2>
        <p className="mb-4">
          We use your data only to provide educational services, including:
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Storing and tracking your test performance and progress.</li>
          <li>Personalizing your learning experience.</li>
          <li>Sending academic updates and exam notifications.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">4. Data Sharing</h2>
        <p className="mb-4">
          We <strong>do not</strong> sell your data to third parties. We only share data with service providers 
          like Firebase (by Google) to host and secure our database.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">5. Your Rights</h2>
        <p className="mb-4">
          You have the right to request access to your data, or to request that we delete your account and 
          all associated academic history. To do so, please contact us at <strong>tsm.shan@gmail.com</strong>.
        </p>
      </section>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Anjalkaran Learning Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
