import { redirect } from 'next/navigation';
import { getServerSideUser, getServerSideUserProfile, getServerSideUserSummary, getServerSideFriends, getServerSidePendingRequests } from '@/lib/server-auth';
import ProfileServer from './ProfileServer';
import OpinionDropdown from '@/components/OpinionDropdown';

export default async function ProfilePage() {
  // Get authenticated user server-side
  const user = await getServerSideUser();
  
  if (!user) {
    redirect('/');
  }

  // Fetch all profile data server-side
  const [profile, userSummary, friends, pendingRequests] = await Promise.all([
    getServerSideUserProfile(user.uid),
    getServerSideUserSummary(user.uid),
    getServerSideFriends(user.uid),
    getServerSidePendingRequests(user.uid)
  ]);

  if (!profile) {
    redirect('/create-profile');
  }

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

        {/* Server-side rendered profile content */}
        <ProfileServer 
          user={user}
          profile={profile}
          userSummary={userSummary}
          friends={friends}
          pendingRequests={pendingRequests}
        />
      </div>
    </div>
  );
}