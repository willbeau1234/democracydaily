import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Democracy Daily',
  description: 'Where Your Voice Matters - Daily civic engagement through opinion discussions',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
  verification: {
    google: 'xbrAok1TFMNTDTyAnWt6ynYeItRa5RSwAp-fAXt4B64',
  },
  other: {
    'google-adsense-account': 'ca-pub-4021281612777695',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4021281612777695"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}