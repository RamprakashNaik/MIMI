import type { Metadata } from "next";
import { SettingsProvider } from "@/context/SettingsContext";
import { ChatProvider } from "@/context/ChatContext";
import { ArtifactProvider } from "@/context/ArtifactContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIMI - Advanced AI Agent",
  description: "Your personalized, local-first AI Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <SettingsProvider>
          <ChatProvider>
            <ArtifactProvider>
              <div className="app-container">
                {children}
              </div>
            </ArtifactProvider>
          </ChatProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
