import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentic Traffic Market (ATM)',
  description: 'AI agents negotiate and trade physical right-of-way using JPYC on Avalanche',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

