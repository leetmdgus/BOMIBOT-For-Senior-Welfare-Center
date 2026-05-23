import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ChatbotClientLoader } from '@/components/chatbot-client-loader'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'
import './hwpx-document.css'
import './a4-document-viewport.css'
import './document-format-toolbar-rail.css'
import './print-document.css'
import './rich-text-table.css'
import './rich-text-lists.css'
import './rich-text-print.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: '봄이봇 - 사업관리 대시보드',
  description: '복지기관용 사업 관리 및 업무 관리 시스템',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <ChatbotClientLoader />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
