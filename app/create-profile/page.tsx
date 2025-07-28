import { redirect } from 'next/navigation';
import { getServerSideUser, getServerSideUserProfile } from '@/lib/server-auth';
import CreateProfileServer from './CreateProfileServer';

export default async function CreateProfilePage() {
  // Get authenticated user server-side
  const user = await getServerSideUser();
  
  if (!user) {
    redirect('/');
  }

  // Check if profile already exists
  const existingProfile = await getServerSideUserProfile(user.uid);
  
  if (existingProfile) {
    redirect('/profile');
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header - Server rendered */}
        <div className="bg-white border-b-4 border-black mb-6 sm:mb-8 p-4 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <p className="text-gray-600 mt-2">Create Your Political Profile</p>
        </div>

        {/* Server-side rendered profile creation form */}
        <CreateProfileServer user={user} />
      </div>
    </div>
  );
}