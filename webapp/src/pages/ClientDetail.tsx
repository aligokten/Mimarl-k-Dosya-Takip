import { Link, useNavigate, useParams } from "react-router-dom";
import { mutate, useDb } from "../store";
import { cardCls } from "../ui";
import ClientForm from "./ClientForm";
import DeleteButton from "../components/DeleteButton";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDb();
  const navigate = useNavigate();

  const client = db.clients.find((c) => c.id === id);
  if (!client) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Müşteri bulunamadı.</p>;
  }

  const projects = db.projects.filter((p) => p.clientId === client.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Müşteri bilgileri</p>
        </div>
        <DeleteButton
          confirmMessage="Bu müşteriyi silmek istediğinize emin misiniz?"
          onDelete={() => {
            if (projects.length > 0) {
              window.alert(
                "Bu müşteriye bağlı projeler var. Önce projeleri silin veya başka müşteriye taşıyın."
              );
              return;
            }
            mutate((draft) => {
              draft.clients = draft.clients.filter((c) => c.id !== client.id);
            });
            navigate("/musteriler");
          }}
        />
      </div>

      <div className={`${cardCls} p-6`}>
        <ClientForm
          initialValues={client}
          submitLabel="Değişiklikleri Kaydet"
          onSubmit={(values) => {
            mutate((draft) => {
              const target = draft.clients.find((c) => c.id === client.id);
              if (target) Object.assign(target, values);
            });
            window.alert("Müşteri bilgileri kaydedildi.");
          }}
        />
      </div>

      <div className={`${cardCls} p-6`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Projeler</h2>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
          {projects.length === 0 && (
            <li className="py-3 text-sm text-slate-500 dark:text-slate-400">
              Bu müşteriye ait proje yok.
            </li>
          )}
          {projects.map((project) => (
            <li key={project.id} className="py-3">
              <Link
                to={`/projeler/${project.id}`}
                className="text-sm font-medium text-slate-900 dark:text-white hover:underline"
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
