import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scolaris — ERP de gestion scolaire',
  description:
    "SaaS cloud multi-établissements : élèves, notes, bulletins, paiements, emplois du temps, communication. Conçu pour les écoles africaines et francophones.",
};

// Applique le thème avant le premier rendu pour éviter le flash.
const themeScript = `
try {
  const saved = localStorage.getItem('scolaris.theme');
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
