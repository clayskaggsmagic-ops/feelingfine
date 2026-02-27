import './globals.css';
import Providers from './providers';
import MobileNav from '@/components/MobileNav';

export const metadata = {
  title: 'Feeling Fine — Your Daily Wellness Journey',
  description: 'A daily wellness platform designed for aging adults, built around 7 Cornerstones of Health.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}

