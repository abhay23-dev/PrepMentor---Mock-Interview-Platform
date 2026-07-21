import Sidebar from "./Sidebar";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({
  children,
}: AppLayoutProps) {
  return (
    <div>
      <Sidebar />

      <main>
        {children}
      </main>
    </div>
  );
}