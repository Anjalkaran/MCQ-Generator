
import React from 'react';

export function GovernmentDisclaimer() {
  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Government Information & Disclaimer</h4>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          <strong>Disclaimer:</strong> Anjalkaran is an independent educational platform built for aspirants of Postal Department exams. 
          Anjalkaran is <strong>NOT affiliated with, authorized by, or endorsed by the Department of Posts, Government of India,</strong> or any other government entity. 
          This app does not represent any government department or organization.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed mb-2">
          All MCQ questions and study materials provided are gathered from historical question papers and publicly available information for educational purposes only. Users are encouraged to verify information and check for the latest official notifications directly from the official Department of Posts websites:
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a 
            href="https://www.indiapost.gov.in" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-red-600 hover:underline font-medium"
          >
            India Post Official Website (.gov.in)
          </a>
          <a 
            href="https://www.indiapost.gov.in/VAS/Pages/Recruitment.aspx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-red-600 hover:underline font-medium"
          >
            Latest Recruitment Notifications
          </a>
        </div>
      </div>
    </div>
  );
}
