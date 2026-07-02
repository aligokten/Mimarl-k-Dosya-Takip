import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteContact,
  patchProject,
  updateContact,
  useApp,
} from "../data";
import { uploadToDrive, useDrive } from "../drive";
import { cardCls, secondaryBtnCls, smallLabelCls } from "../ui";
import { CONTACT_ROLE_CHIP, CONTACT_ROLE_LABELS } from "../types";
import ContactForm from "./ContactForm";
import DeleteButton from "../components/DeleteButton";
import { ChevronLeftIcon } from "../components/icons";

function PoaUpload({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const drive = useDrive();
  const [uploading, setUploading] = useState(false);

  if (!drive.connected) return null;

  return (
    <div className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
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
            if (uploaded.url) {
              await updateContact(contactId, { poaUrl: uploaded.url });
            }
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
            {contactName} adına yüklenir)
          </label>
          <input
            type="file"
            name="file"
            required
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-700 dark:file:text-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300"
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

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useApp();
  const navigate = useNavigate();

  const contact = db.contacts.find((c) => c.id === id);
  if (!contact) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Kişi bulunamadı.
      </p>
    );
  }

  const projects = db.projects.filter(
    (p) =>
      p.clientId === contact.id ||
      p.landOwnerId === contact.id ||
      p.contractorId === contact.id
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/kisiler"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Kişiler
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {contact.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {contact.roles.map((role) => (
              <span
                key={role}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTACT_ROLE_CHIP[role]}`}
              >
                {CONTACT_ROLE_LABELS[role]}
              </span>
            ))}
          </div>
          {contact.poaUrl && (
            <a
              href={contact.poaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Taranmış vekaletnameyi görüntüle
            </a>
          )}
        </div>
        <DeleteButton
          confirmMessage="Bu kişiyi silmek istediğinize emin misiniz?"
          onDelete={async () => {
            const usedAsClient = db.projects.some(
              (p) => p.clientId === contact.id
            );
            if (usedAsClient) {
              window.alert(
                "Bu kişi bazı projelerde müşteri/iş sahibi olarak kayıtlı. Önce o projeleri silin veya başka kişiye bağlayın."
              );
              return;
            }
            for (const p of db.projects) {
              const patch: Partial<{ landOwnerId: string; contractorId: string }> =
                {};
              if (p.landOwnerId === contact.id) patch.landOwnerId = "";
              if (p.contractorId === contact.id) patch.contractorId = "";
              if (Object.keys(patch).length) await patchProject(p.id, patch);
            }
            await deleteContact(contact.id);
            navigate("/kisiler");
          }}
        />
      </div>

      {contact.roles.includes("ARSA_SAHIBI") && (
        <PoaUpload contactId={contact.id} contactName={contact.name} />
      )}

      <div className={`${cardCls} p-6`}>
        <ContactForm
          initialValues={contact}
          submitLabel="Değişiklikleri Kaydet"
          onSubmit={async (values) => {
            await updateContact(contact.id, values);
            window.alert("Kişi bilgileri kaydedildi.");
          }}
        />
      </div>

      <div className={`${cardCls} p-6`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Projeler
        </h2>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
          {projects.length === 0 && (
            <li className="py-3 text-sm text-slate-500 dark:text-slate-400">
              Bu kişiye bağlı proje yok.
            </li>
          )}
          {projects.map((project) => (
            <li key={project.id} className="py-3">
              <Link
                to={`/projeler/${project.id}`}
                className="text-sm font-medium text-slate-900 hover:underline dark:text-white"
              >
                {project.name}
              </Link>
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                {[
                  project.clientId === contact.id && "Müşteri",
                  project.landOwnerId === contact.id && "Arsa Sahibi",
                  project.contractorId === contact.id && "Müteahhit",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
