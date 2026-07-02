import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mutate, useDb } from "../store";
import { uploadToDrive, useDrive } from "../drive";
import { cardCls, secondaryBtnCls, smallLabelCls } from "../ui";
import LandOwnerForm from "./LandOwnerForm";
import DeleteButton from "../components/DeleteButton";

function PoaUpload({
  ownerId,
  ownerName,
}: {
  ownerId: string;
  ownerName: string;
}) {
  const drive = useDrive();
  const [uploading, setUploading] = useState(false);

  if (!drive.connected) return null;

  return (
    <div className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900">
        Taranmış Vekaletnameyi Drive&apos;a Yükle
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const file = new FormData(form).get("file");
          if (!(file instanceof File) || file.size === 0) return;
          setUploading(true);
          try {
            const uploaded = await uploadToDrive(file, "Vekaletnameler");
            mutate((draft) => {
              const target = draft.landOwners.find((o) => o.id === ownerId);
              if (target && uploaded.url) target.poaUrl = uploaded.url;
            });
            form.reset();
            window.alert("Vekaletname Drive'a yüklendi ve kayda bağlandı.");
          } catch (err) {
            window.alert(
              err instanceof Error ? err.message : "Dosya yüklenemedi."
            );
          } finally {
            setUploading(false);
          }
        }}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <div className="flex-1">
          <label className={smallLabelCls}>
            Dosya (Drive&apos;daki &quot;Vekaletnameler&quot; klasörüne,{" "}
            {ownerName} adına yüklenir)
          </label>
          <input
            type="file"
            name="file"
            required
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className={`${secondaryBtnCls} disabled:opacity-60`}
        >
          {uploading ? "Yükleniyor..." : "Drive'a Yükle"}
        </button>
      </form>
    </div>
  );
}

export default function LandOwnerDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDb();
  const navigate = useNavigate();

  const owner = db.landOwners.find((o) => o.id === id);
  if (!owner) {
    return <p className="text-sm text-slate-500">Arsa sahibi bulunamadı.</p>;
  }

  const projects = db.projects.filter((p) => p.landOwnerId === owner.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {owner.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Arsa sahibi bilgileri</p>
          {owner.poaUrl && (
            <a
              href={owner.poaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              Taranmış vekaletnameyi görüntüle
            </a>
          )}
        </div>
        <DeleteButton
          confirmMessage="Bu arsa sahibini silmek istediğinize emin misiniz? Projelerdeki arsa sahibi bağlantısı kaldırılır."
          onDelete={() => {
            mutate((draft) => {
              draft.landOwners = draft.landOwners.filter(
                (o) => o.id !== owner.id
              );
              draft.projects.forEach((p) => {
                if (p.landOwnerId === owner.id) p.landOwnerId = undefined;
              });
            });
            navigate("/arsa-sahipleri");
          }}
        />
      </div>

      <PoaUpload ownerId={owner.id} ownerName={owner.name} />

      <div className={`${cardCls} p-6`}>
        <LandOwnerForm
          initialValues={owner}
          submitLabel="Değişiklikleri Kaydet"
          onSubmit={(values) => {
            mutate((draft) => {
              const target = draft.landOwners.find((o) => o.id === owner.id);
              if (target) Object.assign(target, values);
            });
            window.alert("Arsa sahibi bilgileri kaydedildi.");
          }}
        />
      </div>

      <div className={`${cardCls} p-6`}>
        <h2 className="text-sm font-semibold text-slate-900">Projeler</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {projects.length === 0 && (
            <li className="py-3 text-sm text-slate-500">
              Bu arsa sahibine ait proje yok.
            </li>
          )}
          {projects.map((project) => (
            <li key={project.id} className="py-3">
              <Link
                to={`/projeler/${project.id}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
