import './globals.css';

export const metadata = {
  title: 'Feeling Fine — Admin Portal',
  description: 'Content management portal for Feeling Fine wellness platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
