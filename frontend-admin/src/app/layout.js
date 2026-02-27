import './globals.css';
import { AdminAuthProvider } from '@/lib/useAdminAuth';

export const metadata = {
  title: 'Feeling Fine — Admin Portal',
  description: 'Content management portal for Feeling Fine wellness platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}
