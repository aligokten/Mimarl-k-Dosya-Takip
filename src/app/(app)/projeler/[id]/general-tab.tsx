import { updateProject } from "@/lib/actions/projects";
import ProjectForm from "../project-form";

type Project = {
  id: string;
  name: string;
  clientId: string;
  landOwnerId: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  ada: string | null;
  parsel: string | null;
  pafta: string | null;
  address: string | null;
  notes: string | null;
};

export default function GeneralTab({
  project,
  clients,
  landOwners,
}: {
  project: Project;
  clients: { id: string; name: string }[];
  landOwners: { id: string; name: string }[];
}) {
  const updateProjectWithId = updateProject.bind(null, project.id);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <ProjectForm
        action={updateProjectWithId}
        initialValues={project}
        clients={clients}
        landOwners={landOwners}
        submitLabel="Değişiklikleri Kaydet"
      />
    </div>
  );
}
