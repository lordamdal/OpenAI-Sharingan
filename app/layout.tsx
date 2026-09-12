export const metadata = {
  title: "Ring Chief",
  description: "An agent that calls you when it needs your OK.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400..800&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          background: "var(--paper)",
          color: "var(--ink)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <style>{`
          :root {
            --ink: #050505;
            --blue: #3044ff;
            --rule: #dededb;
            --muted: #676763;
            --paper: #fff;
            --soft: #f6f6f4;
            --mono: 'IBM Plex Mono', monospace;
            --display: 'Bricolage Grotesque', sans-serif;
            --serif: 'Instrument Serif', serif;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
