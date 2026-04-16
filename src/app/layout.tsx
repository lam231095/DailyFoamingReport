import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OVN Production | Quản Lý Sản Xuất',
  description: 'Hệ thống quản lý sản lượng và biến động 4M - Ortholite Vietnam',
  keywords: 'sản xuất, giày, Ortholite, quản lý sản lượng, KPI',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0052CC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0052CC" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏭</text></svg>" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('ovn_theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch(e) {
                document.documentElement.classList.add('dark');
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
