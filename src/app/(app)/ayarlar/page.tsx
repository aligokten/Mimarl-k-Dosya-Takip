import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveConnection } from "@/lib/google-drive";
import DriveSection from "./drive-section";
import ServiceTypesSection from "./service-types-section";
import UsersSection from "./users-section";

export default async function AyarlarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const params = await searchParams;

  const [connection, serviceTypes, users] = await Promise.all([
    getActiveConnection(),
    prisma.serviceType.findMany({
      orderBy: { order: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    }),
    isAdmin
      ? prisma.user.findMany({ orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Google Drive bağlantısı, hizmet türleri ve kullanıcı yönetimi.
        </p>
      </div>

      <DriveSection
        connection={connection}
        isAdmin={isAdmin}
        driveConnected={params.drive_connected === "1"}
        driveError={params.drive_error}
      />

      <ServiceTypesSection serviceTypes={serviceTypes} isAdmin={isAdmin} />

      {isAdmin && <UsersSection users={users} currentUserId={session!.user.id} />}
    </div>
  );
}
