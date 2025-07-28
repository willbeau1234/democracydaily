'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export default function CreateProfileClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // ✅ MINIMAL FORM DATA STATE - just display name
  const [formData, setFormData] = useState({
    displayName: ''
  });

  // SSR Guard - only run auth logic on client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setFormData(prev => ({
          ...prev,
          displayName: currentUser.displayName || ''
        }));
        setLoading(false);
      } else {
        // Only redirect on client-side
        if (typeof window !== 'undefined') {
          router.push('/');
        }
      }
    });

    return () => unsubscribe();
  }, [router, isClient]);

  const handleSubmit = async () => {
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    if (!formData.displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    setCreating(true);
    
    try {
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        profileComplete: true
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      console.log('✅ Profile created successfully!', profileData);
    
      router.push('/');
      
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      alert('Error creating profile. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isClient || loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
        <div className="text-center text-red-600">
          Please sign in to create a profile
        </div>
      </div>
    );
  }

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