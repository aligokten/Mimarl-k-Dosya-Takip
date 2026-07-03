import { useState } from "react";
import {
  addProfessional,
  deleteProfessional,
  updateProfessional,
  useApp,
} from "../data";
import {
  PROFESSIONAL_ROLE_CHIP,
  PROFESSIONAL_ROLE_LABELS,
  type Professional,
  type ProfessionalRole,
} from "../types";
import { cardCls, inputCls, labelCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import DeleteButton from "../components/DeleteButton";
import { UsersIcon, SearchIcon } from "../components/icons";

const ROLES: ProfessionalRole[] = [
  "INSAAT_MUHENDISI",
  "MAKINA_MUHENDISI",
  "ELEKTRIK_MUHENDISI",
  "JEOLOJI_MUHENDISI",
  "JEOFIZIK_MUHENDISI",
  "GEOTEKNIK_MUHENDISI",
  "HARITA_MUHENDISI",
  "PEYZAJ_MIMARI",
  "MIMAR",
  "SANTIYE_SEFI",
  "MUTEAHHIT",
  "DIGER",
];

export default function Uzmanlar() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Professional | "new" | null>(null);

  const q = query.trim().toLocaleLowerCase("tr");
  const list = [...app.professionals]
    .filter(
      (p) =>
        !q ||
        p.name.toLocaleLowerCase("tr").includes(q) ||
        (p.company ?? "").toLocaleLowerCase("tr").includes(q) ||
        (p.profession ?? "").toLocaleLowerCase("tr").includes(q)
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          icon={<UsersIcon className="h-5 w-5" />}
          title="Uzmanlar"
          subtitle="Birlikte çalıştığınız mühendis, mimar, şantiye şefi ve müteahhitler."
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad, firma, meslek ara..."
              className="w-44 rounded-full bg-white dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-56"
            />
          </label>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={primaryBtnCls}
          >
            + Yeni Uzman
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
          {q
            ? "Aramanızla eşleşen kayıt yok."
            : 'Henüz uzman eklenmemiş. "+ Yeni Uzman" ile başlayın.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className={`${cardCls} flex flex-col p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PROFESSIONAL_ROLE_CHIP[p.role]}`}
                  >
                    {PROFESSIONAL_ROLE_LABELS[p.role]}
                  </span>
                  <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    {p.name}
                  </p>
                  {(p.profession || p.company) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[p.profession, p.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <DeleteButton
                  confirmMessage={`"${p.name}" kaydını silmek istediğinize emin misiniz?`}
                  onDelete={() => deleteProfessional(p.id)}
                />
              </div>

              <dl className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {p.odaSicilNo && (
                  <Row label="Oda Sicil No" value={p.odaSicilNo} />
                )}
                {p.buroTescilNo && (
                  <Row label="Büro Tescil No" value={p.buroTescilNo} />
                )}
                {p.tcNo && <Row label="TC No" value={p.tcNo} />}
                {p.phone && (
                  <Row
                    label="Telefon"
                    value={
                      <a href={`tel:${p.phone}`} className="hover:underline">
                        {p.phone}
                      </a>
                    }
                  />
                )}
                {p.email && (
                  <Row
                    label="E-posta"
                    value={
                      <a
                        href={`mailto:${p.email}`}
                        className="hover:underline"
                      >
                        {p.email}
                      </a>
                    }
                  />
                )}
                {p.address && <Row label="Adres" value={p.address} />}
                {p.notes && <Row label="Not" value={p.notes} />}
              </dl>

              <button
                type="button"
                onClick={() => setEditing(p)}
                className="mt-4 self-start text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Düzenle
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProfessionalModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 font-medium text-slate-400 dark:text-slate-500">
        {label}:
      </dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function ProfessionalModal({
  initial,
  onClose,
}: {
  initial: Professional | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {initial ? "Uzmanı Düzenle" : "Yeni Uzman"}
        </h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const val = (k: string) => {
              const v = f.get(k);
              return typeof v === "string" && v.trim() ? v.trim() : undefined;
            };
            const name = val("name");
            if (!name) return;
            const data = {
              name,
              role: (f.get("role") as ProfessionalRole) || "DIGER",
              profession: val("profession"),
              company: val("company"),
              tcNo: val("tcNo"),
              odaSicilNo: val("odaSicilNo"),
              buroTescilNo: val("buroTescilNo"),
              phone: val("phone"),
              email: val("email"),
              address: val("address"),
              notes: val("notes"),
            };
            setBusy(true);
            try {
              if (initial) await updateProfessional(initial.id, data);
              else await addProfessional(data);
              onClose();
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Ad Soyad *</label>
              <input
                name="name"
                required
                defaultValue={initial?.name}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Rol</label>
              <select
                name="role"
                defaultValue={initial?.role ?? "INSAAT_MUHENDISI"}
                className={inputCls}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {PROFESSIONAL_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Meslek / Ünvan</label>
              <input
                name="profession"
                defaultValue={initial?.profession}
                placeholder="Ör: İnşaat Mühendisi"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Firma / Büro</label>
              <input
                name="company"
                defaultValue={initial?.company}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Oda Sicil No</label>
              <input
                name="odaSicilNo"
                defaultValue={initial?.odaSicilNo}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Büro Tescil No</label>
              <input
                name="buroTescilNo"
                defaultValue={initial?.buroTescilNo}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>TC Kimlik No</label>
              <input
                name="tcNo"
                defaultValue={initial?.tcNo}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input
                name="phone"
                defaultValue={initial?.phone}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>E-posta</label>
              <input
                name="email"
                type="email"
                defaultValue={initial?.email}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Adres</label>
              <input
                name="address"
                defaultValue={initial?.address}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notlar</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={initial?.notes}
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={secondaryBtnCls}>
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`${primaryBtnCls} disabled:opacity-60`}
            >
              {busy ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
