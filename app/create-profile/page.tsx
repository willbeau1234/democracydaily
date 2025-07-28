import { Suspense } from 'react';
import CreateProfileClient from './CreateProfileClient';

export default function CreateProfilePage() {
  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header - Server rendered */}
        <div className="bg-white border-b-4 border-black mb-6 sm:mb-8 p-4 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <p className="text-gray-600 mt-2">Create Your Political Profile</p>
        </div>

        {/* Client-side profile creation form */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-8"></div>
                <div className="h-12 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-12 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        }>
          <CreateProfileClient />
        </Suspense>
      </div>
    </div>
  );
}