'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/lib/types';

interface CreateProfileServerProps {
  user: AuthUser;
}

export default function CreateProfileServer({ user }: CreateProfileServerProps) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  
  // MINIMAL FORM DATA STATE - just display name
  const [formData, setFormData] = useState({
    displayName: user.displayName || ''
  });

  const handleSubmit = async () => {
    if (!formData.displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    setCreating(true);
    
    try {
      // Create profile via server action / API call
      const response = await fetch('/api/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Profile created successfully!');
        router.push('/');
      } else {
        throw new Error(result.error || 'Failed to create profile');
      }
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      alert('Error creating profile. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Welcome, {user?.email}!
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Just one quick step to get started!
      </p>

      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({...prev, displayName: e.target.value}))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="How should we address you?"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            onClick={handleSubmit}
            disabled={creating || !formData.displayName.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Creating Profile...' : 'Create Profile & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}