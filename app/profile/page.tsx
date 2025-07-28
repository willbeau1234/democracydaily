import { Suspense } from 'react';
import ProfileClient from './ProfileClient';
import OpinionDropdown from '@/components/OpinionDropdown';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Server rendered */}
        <div className="bg-white border-b-4 border-black mb-6 sm:mb-8 p-4 sm:p-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-2 sm:px-4 my-2 gap-2 sm:gap-0">
              <span>Vol. 1, No. 1</span>
              <span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric", 
                month: "long",
                day: "numeric",
              })}</span>
              
              {/* Opinion Section Dropdown */}
              <OpinionDropdown sectionName="Profile" currentPage="profile" />
            </div>
            <p className="text-gray-600 mt-2">Profile Management</p>
          </div>
        </div>

        {/* Client-side profile content */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          </div>
        }>
          <ProfileClient />
        </Suspense>
      </div>
    </div>
  );
}