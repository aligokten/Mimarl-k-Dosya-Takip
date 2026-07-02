import { useNavigate } from "react-router-dom";
import { addProject } from "../data";
import { cardCls } from "../ui";
import ProjectForm from "./ProjectForm";

export default function ProjectNew() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Yeni Proje
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Proje, müşteri, arsa sahibi ve müteahhit bilgilerini girin.
        </p>
      </div>
      <div className={`${cardCls} p-6`}>
        <ProjectForm
          submitLabel="Projeyi Kaydet"
          onSubmit={async (values) => {
            const id = await addProject(values);
            navigate(`/projeler/${id}`);
          }}
        />
      </div>
    </div>
  );
}
