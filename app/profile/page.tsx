"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Save, User, MessageSquare, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  
  try {
    return await currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [profilePhotoURL, setProfilePhotoURL] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        })
        setProfilePhotoURL(currentUser.photoURL || "")
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      setUploading(true)
      
      // Convert file to base64 data URL for simple storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataURL = e.target?.result as string
        await updateProfilePhoto(dataURL)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Error uploading photo. Please try again.')
      setUploading(false)
    }
  }

  const updateProfilePhoto = async (photoURL: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('https://us-central1-democracydaily-8f549.cloudfunctions.net/updateProfilePhoto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoURL })
      })

      const data = await response.json()
      if (data.success) {
        setProfilePhotoURL(photoURL)
        setUser(prev => prev ? { ...prev, photoURL } : null)
        alert('Profile photo updated successfully!')
      } else {
        throw new Error(data.error || 'Failed to update profile photo')
      }
    } catch (error) {
      console.error('Error updating profile photo:', error)
      alert('Error updating profile photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoURLChange = async () => {
    if (!profilePhotoURL.trim()) return
    
    try {
      setUploading(true)
      await updateProfilePhoto(profilePhotoURL)
    } catch (error) {
      console.error('Error updating photo URL:', error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view your profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center pt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your profile information</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Photo
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Opinions
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Opinion Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    Political Views
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Social Issues
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Economic Policy
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Environmental
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    View All Opinions
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Manage Opinions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Profile Photo */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={profilePhotoURL} alt={user.displayName || "Profile"} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold text-2xl">
                  {user.displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900">{user.displayName}</h3>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Upload a new profile photo</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>

              {/* URL Input Option */}
              <div className="border border-gray-300 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Or paste photo URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={profilePhotoURL}
                    onChange={(e) => setProfilePhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={uploading}
                  />
                  <Button
                    onClick={handlePhotoURLChange}
                    disabled={uploading || !profilePhotoURL.trim()}
                    variant="outline"
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}