import { auth } from "@/lib/auth";
import Sidebar from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar
        userName={session?.user?.name ?? ""}
        userRole={session?.user?.role ?? "STAFF"}
      />
      <main className="flex-1 px-6 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
