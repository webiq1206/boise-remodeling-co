import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Navigation } from '@/components/Navigation'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/Providers'
import { ScrollToTop } from '@/components/ScrollToTop'
import { SITE_TAGLINE } from '@/shared/siteContent'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { MetaPixel } from '@/components/MetaPixel'
import { MicrosoftClarity } from '@/components/MicrosoftClarity'
import { ConversionTracking } from '@/components/ConversionTracking'
import { AssistantWidget } from '@/components/assistant/AssistantWidget'
import './globals.css'

// P5 family typefaces, self-hosted from the same two OFL variable files P5 Home Co serves.
const manrope = localFont({
  src: '../public/fonts/manrope-variable.woff2',
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
})

// Cormorant Garamond carries every serif moment - headings, the italic accent
// word, display numerals, pull quotes - as it does on P5. Wordmark and seal
// artwork keep their original face; marks and live type share a register.
const cormorant = localFont({
  src: '../public/fonts/cormorant-garamond-variable.woff2',
  weight: '300 700',
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Boise Remodeling Co | Treasure Valley Design-Build',
    template: '%s | Boise Remodeling Co',
  },
  description: `Design-build remodeling for Boise, Meridian, Eagle, Nampa & the Treasure Valley. Clear expectations and budget guidance. Schedule a free in-home consultation.`,
  manifest: '/site.webmanifest',
  // Feed discovery for readers, aggregators, and AI/answer-engine crawlers.
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/feed.xml', title: 'Boise Remodeling Co | Remodeling Guides and Insights' },
      ],
    },
  },
  authors: [{ name: 'Boise Remodeling Co' }],
  creator: 'Boise Remodeling Co',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://boiseremodeling.co'),
  // Favicon set built from the brand kit's small-size icon mark (the sage disc
  // with the script initial), which is drawn for favicon sizes where the seal
  // stops reading. Assets live in /public/brand/png/icon.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Boise Remodeling Co',
    title: 'Boise Remodeling Co | Treasure Valley Design-Build',
    description: `${SITE_TAGLINE}. Kitchen, bathroom, whole-home, and addition remodeling across the Treasure Valley.`,
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'Boise Remodeling Co' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boise Remodeling Co | Treasure Valley Design-Build',
    description: `${SITE_TAGLINE}. Design-build remodeling for Boise and the Treasure Valley.`,
    images: ['/images/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#1C1F1E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to resolve on notched devices, so
  // sticky bottom bars clear the iPhone home indicator.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${cormorant.variable}`} style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <noscript>
          <style>{`.reveal-init{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <Providers>
          <ScrollToTop />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-sm focus:bg-foreground focus:px-4 focus:py-2 focus:text-background focus:shadow-lg"
          >
            Skip to content
          </a>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <ConditionalFooter />
          </div>
          <Toaster />
          <AssistantWidget />
        </Providers>
        <GoogleAnalytics />
        <MetaPixel />
        <MicrosoftClarity />
        <ConversionTracking />
      </body>
    </html>
  )
}
