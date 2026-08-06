import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { addDocTemplate, useApp } from "../data";
import { uploadToDrive, useDrive } from "../drive";
import { downloadBlob, fillDocxTemplate } from "../docxFill";
import { docxBufferToHtml } from "../docxToHtml";
import { buildTaahhutnamePlainTokens } from "../templateTokens";
import { cardCls, inputCls, labelCls, primaryBtnCls, smallLabelCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { FileIcon } from "../components/icons";

export default function TaahhutnameUpload() {
  const app = useApp();
  const drive = useDrive();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const projects = [...app.projects].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );
  const project = app.projects.find((p) => p.id === projectId);
  const projectAuthors = project
    ? app.professionals.filter((pr) => (project.authorIds ?? []).includes(pr.id))
    : [];
  const autoProfessionalId = projectAuthors.length === 1 ? projectAuthors[0].id : "";
  const effectiveProfessionalId = professionalId || autoProfessionalId;
  const professionalOptions = projectAuthors.length > 0 ? projectAuthors : app.professionals;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          to="/sablonlar"
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Evrak Şablonları
        </Link>
        <div className="mt-2">
          <PageTitle
            icon={<FileIcon className="h-5 w-5" />}
            title="Taahhütname Yükle"
            subtitle="Kendi taahhütname (.docx) belgenizi şablon olarak ekleyin; proje ve müellif seçerek aynı anda doldurulmuş bir kopya indirin."
          />
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          const title = String(formData.get("title") ?? "").trim();
          const file = formData.get("file");
          const professional = app.professionals.find(
            (pr) => pr.id === effectiveProfessionalId
          );

          if (!title) {
            setError("Taahhütname adı gerekli.");
            return;
          }
          if (!(file instanceof File) || file.size === 0) {
            setError("Bir Word (.docx) dosyası seçin.");
            return;
          }
          if (!file.name.toLowerCase().endsWith(".docx")) {
            setError(
              "Yalnızca Word (.docx) dosyaları desteklenir; sayfa düzeninin " +
                "birebir korunması için gereklidir."
            );
            return;
          }
          if (!project) {
            setError("İlgili projeyi seçin.");
            return;
          }
          if (!professional) {
            setError("Müellif/fenni mesul seçin.");
            return;
          }

          setBusy(true);
          try {
            // Drive'a yükleme (gerekirse Google yetkilendirme penceresi açar)
            // mutlaka İLK adım olmalı: tarayıcılar, kullanıcı tıklamasından
            // sonra araya giren başka bir bekleme varsa açılır pencereyi
            // engelleyebilir. Bu adım isteğe bağlıdır — başarısız olsa bile
            // asıl işlemi (şablon kaydı + doldurulmuş belge indirme)
            // engellemesin.
            let source: { sourceDriveFileId: string; sourceFileName: string } | undefined;
            if (drive.connected) {
              try {
                setBusyText("Orijinal Word dosyası Drive'a yükleniyor...");
                const uploaded = await uploadToDrive(file, "Taahhütname Word Dosyaları");
                source = { sourceDriveFileId: uploaded.id, sourceFileName: file.name };
              } catch (driveErr) {
                console.error("Drive'a orijinal dosya yüklenemedi:", driveErr);
                window.alert(
                  "Orijinal Word dosyası Drive'a yüklenemedi, bu yüzden bu " +
                    "taahhütname Uzmanlar &gt; Taahhütname Oluştur akışında " +
                    "birebir sayfa düzeniyle kullanılamayacak; ancak şablon " +
                    "normal şekilde kaydediliyor ve doldurulmuş belge " +
                    "indirilecek.\n\nHata: " +
                    (driveErr instanceof Error ? driveErr.message : String(driveErr))
                );
              }
            }

            setBusyText("Şablon kaydediliyor...");
            const body = await docxBufferToHtml(await file.arrayBuffer());
            const templateId = await addDocTemplate({ title, body, ...source });

            setBusyText("Taahhütname dolduruluyor...");
            const tokens = buildTaahhutnamePlainTokens(
              project,
              app.contacts,
              professional,
              format(new Date(), "d MMMM yyyy", { locale: tr })
            );
            const blob = await fillDocxTemplate(await file.arrayBuffer(), tokens);
            downloadBlob(blob, `${title} - ${professional.name} - ${project.name}.docx`);

            navigate(`/sablonlar/${templateId}`);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Taahhütname oluşturulamadı."
            );
            setBusy(false);
          }
        }}
        className={`${cardCls} space-y-4 p-6`}
      >
        <div>
          <label className={labelCls}>Taahhütname Adı</label>
          <input
            name="title"
            required
            placeholder="Örn: Makina Mühendisi Fenni Mesul Taahhütnamesi"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Dosya Yükle (.docx)</label>
          <input
            type="file"
            name="file"
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Belgenizdeki köşeli parantezli alanlar ([Uzman Adı Soyadı], [TC
            No], [Oda Sicil No], [Arsa Sahibi], [Pafta], [Ada], [Parsel] vb.)
            aşağıda seçtiğiniz proje ve müellife göre otomatik doldurulur.
          </p>
        </div>

        <div>
          <label className={labelCls}>İlgili Proje</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setProfessionalId("");
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Proje seçin
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {project && (
          <div>
            <label className={labelCls}>Müellif / Fenni Mesul</label>
            {professionalOptions.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Bu projede kayıtlı uzman yok. Proje sayfasından &quot;Müellif
                / Fenni Mesuller&quot; kısmına bir uzman ekleyin veya aşağıdan
                elle seçin.{" "}
                <Link
                  to={`/projeler/${project.id}`}
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Projeye git →
                </Link>
              </p>
            ) : (
              <>
                <select
                  value={effectiveProfessionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>
                    Uzman seçin
                  </option>
                  {professionalOptions.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
                {projectAuthors.length === 1 && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Projeye kayıtlı tek müellif otomatik seçildi.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`${primaryBtnCls} disabled:opacity-60`}
        >
          {busy
            ? busyText || "İşleniyor..."
            : "Şablonu Kaydet ve Doldurulmuş Belgeyi İndir"}
        </button>
      </form>

      <div className={`${cardCls} p-5`}>
        <p className={smallLabelCls}>Otomatik doldurulabilen alanlar</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          [Uzman Adı Soyadı] · [Adı Soyadı] · [TC No] · [Oda Sicil No] ·
          [Adres] · [Telefon] · [Arsa Sahibi] · [Arsa Sahibi Adres] · [Pafta]
          · [Ada] · [Parsel] · [Mahalle] · [İlçe] · [İl] · [Tarih]
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Kurumsal önekli adlandırmalar da desteklenir: [MÜELLİF ADI] /
          [FENNİ MESUL ADI], [MÜELLİF TC] / [FENNİ MESUL TC] vb. — şablonda
          hangisi geçiyorsa o dolar. Alan adları büyük/küçük harfe duyarlı
          değildir.
        </p>
      </div>
    </div>
  );
}
