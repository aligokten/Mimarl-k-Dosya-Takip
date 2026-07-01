import { Link, useNavigate, useParams } from "react-router-dom";
import { mutate, useDb } from "../store";
import { cardCls } from "../ui";
import LandOwnerForm from "./LandOwnerForm";
import DeleteButton from "../components/DeleteButton";

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
