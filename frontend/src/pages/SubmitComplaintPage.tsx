import React from 'react';
import { ComplaintForm } from '../components/complaints/ComplaintForm.js';
import { Navbar } from '../components/common/Navbar.js';

export const SubmitComplaintPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ComplaintForm />
      </main>
    </div>
  );
};

