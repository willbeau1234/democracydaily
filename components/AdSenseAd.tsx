"use client"

import { useEffect } from 'react'

interface AdSenseAdProps {
  /** AdSense ad unit ID */
  adSlot: string
  /** Ad format (e.g., 'auto', 'rectangle', 'horizontal') */
  adFormat?: string
  /** Whether to display the ad */
  shouldDisplay?: boolean
  /** Custom CSS classes */
  className?: string
}

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export default function AdSenseAd({
  adSlot,
  adFormat = 'auto',
  shouldDisplay = true,
  className = ''
}: AdSenseAdProps) {
  useEffect(() => {
    if (shouldDisplay && typeof window !== 'undefined') {
      try {
        // Push ad to AdSense queue
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (error) {
        console.error('AdSense ad failed to load:', error)
      }
    }
  }, [shouldDisplay])

  // Don't render if conditions aren't met
  if (!shouldDisplay) {
    return null
  }

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4021281612777695"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  )
}