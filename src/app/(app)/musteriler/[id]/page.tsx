import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateClient, deleteClient } from "@/lib/actions/clients";
import ClientForm from "../client-form";
import DeleteButton from "@/components/delete-button";

export default async function MusteriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { projects: true },
  });

  if (!client) notFound();

  const updateClientWithId = updateClient.bind(null, client.id);
  const deleteClientWithId = deleteClient.bind(null, client.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Müşteri bilgileri</p>
        </div>
        <DeleteButton
          action={deleteClientWithId}
          confirmMessage="Bu müşteriyi silmek istediğinize emin misiniz? Bağlı projeler etkilenebilir."
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ClientForm
          action={updateClientWithId}
          initialValues={client}
          submitLabel="Değişiklikleri Kaydet"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Projeler</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {client.projects.length === 0 && (
            <li className="py-3 text-sm text-slate-500">
              Bu müşteriye ait proje yok.
            </li>
          )}
          {client.projects.map((project) => (
            <li key={project.id} className="py-3">
              <Link
                href={`/projeler/${project.id}`}
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
