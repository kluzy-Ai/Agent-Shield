import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Agent Shield | AI Agent Security & Defense for NEAR',
  description:
    'Institutional-grade security layer for autonomous AI agents on NEAR Protocol. Enforce spending limits, Function Call Keys, counterparty scoring, and forensic threat intelligence.',
  keywords: [
    'NEAR Protocol',
    'AI Agent Security',
    'Function Call Keys',
    'AI Security Hackathon',
    'Policy Engine',
    'TEE Attestation',
    'Prompt Injection Defense'
  ],
  authors: [{ name: 'Agent Shield Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
