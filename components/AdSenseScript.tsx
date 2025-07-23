"use client"

import Script from 'next/script'
import { useEffect, useState } from 'react'

interface AdSenseScriptProps {
  /** Whether substantial content is present on the page */
  hasContent?: boolean
  /** Whether the page is still loading */
  isLoading?: boolean
  /** Whether user is authenticated (avoid ads during auth flows) */
  isAuthenticated?: boolean
  /** Minimum content length required before showing ads */
  minContentLength?: number
  /** Content text to validate length */
  contentText?: string
}

export default function AdSenseScript({
  hasContent = true,
  isLoading = false,
  isAuthenticated = true,
  minContentLength = 100,
  contentText = ""
}: AdSenseScriptProps) {
  const [shouldShowAds, setShouldShowAds] = useState(false)

  useEffect(() => {
    // AdSense Policy Compliance Checks
    const isContentSufficient = contentText.length >= minContentLength
    const hasRealContent = hasContent && !isLoading
    const notInAuthFlow = isAuthenticated // Assuming true means past auth, false means in auth flow
    
    // Additional checks for problematic content
    const hasMaintenanceMessage = contentText.includes('Under Maintenance') || 
                                  contentText.includes('🛠️') ||
                                  contentText.includes('Loading...')
    
    const hasEmptyStateMessage = contentText.includes('No friends') ||
                                contentText.includes('Loading friends') ||
                                contentText.includes('Sign in to')
    
    // Only show ads if ALL conditions are met
    const shouldShow = hasRealContent && 
                      notInAuthFlow && 
                      isContentSufficient && 
                      !hasMaintenanceMessage && 
                      !hasEmptyStateMessage
    
    setShouldShowAds(shouldShow)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('AdSense Compliance Check:', {
        hasContent,
        isLoading,
        isAuthenticated,
        isContentSufficient,
        hasMaintenanceMessage,
        hasEmptyStateMessage,
        shouldShow,
        contentLength: contentText.length
      })
    }
  }, [hasContent, isLoading, isAuthenticated, contentText, minContentLength])

  // Don't render anything if conditions aren't met
  if (!shouldShowAds) {
    return null
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4021281612777695"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ AdSense script loaded - content validation passed')
        }
      }}
      onError={() => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ AdSense script failed to load')
        }
      }}
    />
  )
}