import { disconnectDriveAction } from "@/lib/actions/drive";
import DeleteButton from "@/components/delete-button";

type Connection = {
  accountEmail: string;
  rootFolderUrl: string | null;
} | null;

export default function DriveSection({
  connection,
  isAdmin,
  driveConnected,
  driveError,
}: {
  connection: Connection;
  isAdmin: boolean;
  driveConnected: boolean;
  driveError?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">
        Google Drive Bağlantısı
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Tüm dijital evraklar bu bağlantı üzerinden ofisin ortak Google
        Drive alanına yüklenir.
      </p>

      {driveConnected && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Google Drive bağlantısı başarıyla kuruldu.
        </p>
      )}
      {driveError && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Bağlantı kurulamadı: {driveError}
        </p>
      )}

      <div className="mt-4">
        {connection ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Bağlı: {connection.accountEmail}
              </p>
              {connection.rootFolderUrl && (
                <a
                  href={connection.rootFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:underline"
                >
                  Drive klasörünü görüntüle
                </a>
              )}
            </div>
            {isAdmin && (
              <DeleteButton
                action={disconnectDriveAction}
                confirmMessage="Google Drive bağlantısını kaldırmak istediğinize emin misiniz?"
                label="Bağlantıyı Kaldır"
              />
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-600">
              Henüz Google Drive bağlantısı kurulmadı.
            </p>
            {isAdmin ? (
              <a
                href="/api/drive/connect"
                className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Google Drive&apos;a Bağlan
              </a>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Bağlantıyı kurmak için bir yöneticiyle iletişime geçin.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
