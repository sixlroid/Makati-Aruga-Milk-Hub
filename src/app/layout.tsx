import { Space_Grotesk, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from './Providers';
import Header from '@/components/Header';

// 1. Configure Space Grotesk for Headings
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space-grotesk' 
});

// 2. Configure Manrope for Body text
const manrope = Manrope({ 
  subsets: ['latin'], 
  variable: '--font-manrope' 
});

export const metadata = {
  title: 'Makati Aruga Milk Hub',
  description: 'Operations Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 3. Attach both font variables to the body */}
      <body className={`${spaceGrotesk.variable} ${manrope.variable} font-body antialiased bg-white text-slate-900`}>
  <Providers>
      <Header />
      {children}
  </Providers>
</body>
    </html>
  );
}