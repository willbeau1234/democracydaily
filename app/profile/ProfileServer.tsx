import { AuthUser, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FriendRequestsManager from './components/FriendRequestsManager';
import FriendsManager from './components/FriendsManager';
import OpinionCalendar from './components/OpinionCalendar';
import BackToMainButton from './components/BackToMainButton';

interface ProfileServerProps {
  user: AuthUser;
  profile: UserProfile;
  userSummary: any;
  friends: any[];
  pendingRequests: any[];
}

export default function ProfileServer({ 
  user, 
  profile, 
  userSummary, 
  friends, 
  pendingRequests 
}: ProfileServerProps) {
  return (
    <>
      {/* Profile Content */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold">{profile.displayName}</h2>
              <p className="text-blue-100 text-lg">{profile.email}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Member since</p>
              <p className="text-white">
                {profile.createdAt ? 
                  new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 
                  'Recently'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Profile Body */}
        <div className="p-6">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-2xl font-bold">Profile Information</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Account Details
                </h4>
                <div>
                  <label className="text-sm font-medium text-gray-500">Display Name</label>
                  <p className="text-lg text-gray-900">{profile.displayName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg text-gray-900">{profile.email}</p>
                </div>
              </div>

              {/* Account History */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Account History
                </h4>
                <div>
                  <label className="text-sm font-medium text-gray-500">Profile Created</label>
                  <p className="text-lg text-gray-900">
                    {profile.createdAt ? 
                      new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 
                      'Recently'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-lg text-gray-900">
                    {profile.updatedAt ? 
                      new Date(profile.updatedAt.seconds * 1000).toLocaleDateString() : 
                      'Not updated yet'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Profile Status</label>
                  <p className="text-lg text-gray-900">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      profile.profileComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {profile.profileComplete ? 'Complete' : 'Incomplete'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Friend Requests Section */}
      <div className="mb-8">
        <FriendRequestsManager userId={user.uid} initialRequests={pendingRequests} />
      </div>

      {/* Friends Section */}
      <div className="mb-8">
        <FriendsManager userId={user.uid} initialFriends={friends} />
      </div>

      {/* Opinion Activity Calendar */}
      <OpinionCalendar authUserId={user.uid} initialUserSummary={userSummary} />

      {/* Navigation Buttons */}
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-center">
          <BackToMainButton />
        </div>
      </div>
    </>
  );
}