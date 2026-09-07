import './globals.css';

export const metadata = {
  title: 'ISRO Burn-In Anomaly Detection System',
  description: 'AI-Driven Anomaly Detection in Component Burn-In & Screening - SIH 2026',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-isro-darker text-gray-100">
        {children}
      </body>
    </html>
  );
}
