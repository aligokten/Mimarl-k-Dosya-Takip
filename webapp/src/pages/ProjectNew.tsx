import { useNavigate } from "react-router-dom";
import { mutate, now, uid } from "../store";
import { cardCls } from "../ui";
import ProjectForm from "./ProjectForm";

export default function ProjectNew() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yeni Proje</h1>
        <p className="mt-1 text-sm text-slate-500">
          Proje, müşteri, arsa ve arsa sahibi bilgilerini girin.
        </p>
      </div>
      <div className={`${cardCls} p-6`}>
        <ProjectForm
          submitLabel="Projeyi Kaydet"
          onSubmit={(values) => {
            const id = uid();
            const timestamp = now();
            mutate((db) => {
              db.projects.push({
                id,
                status: "DEVAM_EDIYOR",
                services: [],
                documents: [],
                createdAt: timestamp,
                updatedAt: timestamp,
                ...values,
              });
            });
            navigate(`/projeler/${id}`);
          }}
        />
      </div>
    </div>
  );
}
