import { uploadPowerOfAttorney } from "@/lib/actions/land-owners";

export default function PowerOfAttorneyFile({
  landOwnerId,
  driveFileUrl,
}: {
  landOwnerId: string;
  driveFileUrl: string | null;
}) {
  const action = uploadPowerOfAttorney.bind(null, landOwnerId);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">
        Taranmış Vekaletname
      </h2>
      {driveFileUrl ? (
        <a
          href={driveFileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-blue-600 hover:underline"
        >
          Vekaletname dosyasını görüntüle
        </a>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          Henüz taranmış vekaletname yüklenmedi.
        </p>
      )}
      <form action={action} className="mt-3 flex items-center gap-2">
        <input
          type="file"
          name="file"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          {driveFileUrl ? "Yenile" : "Yükle"}
        </button>
      </form>
    </div>
  );
}
