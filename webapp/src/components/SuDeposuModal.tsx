import { useMemo, useState } from "react";
import {
  CATI_TIPLERI,
  TEHLIKE_SINIFLARI,
  TUKETIM_ON_TANIMLARI,
  YAGMUR_ESIK_CATI_M2,
  YAGMUR_ESIK_HACIM_M3,
  YAGMUR_ESIK_PARSEL_M2,
  hesaplaKullanimSuyu,
  hesaplaYagmurSuyu,
  hesaplaYanginSuyu,
  type Adim,
} from "../suDeposu";
import { cardCls, inputCls, labelCls, smallLabelCls } from "../ui";
import { DropletIcon } from "./icons";

type Sekme = "yagmur" | "kullanim" | "yangin";

const SEKMELER: { id: Sekme; ad: string }[] = [
  { id: "yagmur", ad: "Yağmur Suyu" },
  { id: "kullanim", ad: "Kullanım Suyu" },
  { id: "yangin", ad: "Yangın Suyu" },
];

function Alan({
  etiket,
  birim,
  deger,
  onChange,
  adim = "any",
  ipucu,
}: {
  etiket: string;
  birim?: string;
  deger: number;
  onChange: (v: number) => void;
  adim?: string;
  ipucu?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {etiket}
        {birim && (
          <span className="ml-1 font-normal text-slate-400">({birim})</span>
        )}
      </span>
      <input
        type="number"
        step={adim}
        min="0"
        value={Number.isFinite(deger) ? deger : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={inputCls}
      />
      {ipucu && (
        <span className="mt-1 block text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          {ipucu}
        </span>
      )}
    </label>
  );
}

function Sonuc({
  baslik,
  deger,
  adimlar,
  dayanak,
  not,
}: {
  baslik: string;
  deger: number;
  adimlar: Adim[];
  dayanak: string;
  not?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-5 py-4">
        <p className={smallLabelCls}>{baslik}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
          {deger.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
          <span className="text-lg font-semibold">m³</span>
        </p>
      </div>

      <div>
        <p className={smallLabelCls}>Hesap adımları</p>
        <ol className="mt-2 space-y-2">
          {adimlar.map((a, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-200/70 px-3 py-2 text-xs dark:border-white/10"
            >
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {a.etiket}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {a.ifade}
              </p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                = {a.sonuc}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl bg-slate-500/10 px-3 py-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        <span className="font-semibold">Dayanak:</span> {dayanak}
        {not && <span className="mt-1 block opacity-90">{not}</span>}
      </div>
    </div>
  );
}

function YagmurSekmesi() {
  const [catiAlani, setCatiAlani] = useState(1500);
  const [parselAlani, setParselAlani] = useState(2500);
  const [yillikYagis, setYillikYagis] = useState(392.4);
  const [catiTipi, setCatiTipi] = useState<string>("duz");
  const [akis, setAkis] = useState(0.8);
  const [filtre, setFiltre] = useState(0.9);

  const sonuc = useMemo(
    () =>
      hesaplaYagmurSuyu({
        catiAlani: catiAlani || 0,
        yillikYagis: yillikYagis || 0,
        akisKatsayisi: akis || 0,
        filtreVerimi: filtre || 0,
        parselAlani: parselAlani || 0,
        depoOrani: 0.06,
      }),
    [catiAlani, yillikYagis, akis, filtre, parselAlani]
  );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <Alan etiket="Çatı izdüşüm alanı" birim="m²" deger={catiAlani} onChange={setCatiAlani} />
        <Alan etiket="Parsel alanı" birim="m²" deger={parselAlani} onChange={setParselAlani} />
        <Alan
          etiket="Yıllık ortalama yağış"
          birim="mm/yıl"
          deger={yillikYagis}
          onChange={setYillikYagis}
          ipucu="İlinizin MGM uzun yıllar ortalamasını girin. Hazır il listesi bilerek konmadı — yanlış iklim verisi yanlış depo demektir."
        />
        <label className="block">
          <span className={labelCls}>Çatı / yüzey tipi</span>
          <select
            value={catiTipi}
            onChange={(e) => {
              setCatiTipi(e.target.value);
              const t = CATI_TIPLERI.find((c) => c.id === e.target.value);
              if (t) setAkis(t.e);
            }}
            className={inputCls}
          >
            {CATI_TIPLERI.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ad} — e = {c.e}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Alan etiket="Akış katsayısı (e)" deger={akis} onChange={setAkis} adim="0.05" />
          <Alan etiket="Filtre verimi (η)" deger={filtre} onChange={setFiltre} adim="0.05" />
        </div>
      </div>

      <div className="space-y-4">
        <Sonuc
          baslik="Asgari yağmur suyu deposu hacmi"
          deger={sonuc.depoM3}
          adimlar={sonuc.adimlar}
          dayanak="Yağmur Sularının Toplanması, Depolanması ve Deşarjı Hakkında Yönetmelik (RG 23.06.2017 / 30105) ve TS EN 16941-1. Asgari hacim, yıllık toplanabilir suyun %6'sıdır."
        />
        <div
          className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
            sonuc.zorunlu
              ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
              : "bg-slate-500/10 text-slate-600 dark:text-slate-300"
          }`}
        >
          {sonuc.zorunlu ? (
            <>
              <span className="font-semibold">Sistem zorunlu görünüyor.</span>{" "}
              Depolama ihtiyacı {YAGMUR_ESIK_HACIM_M3} m³&apos;ü aşıyor ve parsel{" "}
              {YAGMUR_ESIK_PARSEL_M2.toLocaleString("tr-TR")} m² (ya da çatı{" "}
              {YAGMUR_ESIK_CATI_M2.toLocaleString("tr-TR")} m²) eşiğinin
              üzerinde.
            </>
          ) : (
            <>
              Bu girdilerle yönetmelik eşikleri (ihtiyaç &gt;{" "}
              {YAGMUR_ESIK_HACIM_M3} m³ ve parsel &gt;{" "}
              {YAGMUR_ESIK_PARSEL_M2.toLocaleString("tr-TR")} m² / çatı &gt;{" "}
              {YAGMUR_ESIK_CATI_M2.toLocaleString("tr-TR")} m²) aşılmıyor.
              İdarenizin ek şartı olabilir.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KullanimSekmesi() {
  const [bagimsiz, setBagimsiz] = useState(20);
  const [kisiDaire, setKisiDaire] = useState(4);
  const [onTanim, setOnTanim] = useState<string>("konut-pratik");
  const [tuketim, setTuketim] = useState(150);
  const [gun, setGun] = useState(1);
  const [pay, setPay] = useState(0.1);

  const sonuc = useMemo(
    () =>
      hesaplaKullanimSuyu({
        bagimsizBolum: bagimsiz || 0,
        kisiBasinaDaire: kisiDaire || 0,
        kisiBasiTuketim: tuketim || 0,
        depolamaGunu: gun || 0,
        guvenlikPayi: pay || 0,
      }),
    [bagimsiz, kisiDaire, tuketim, gun, pay]
  );

  const secili = TUKETIM_ON_TANIMLARI.find((t) => t.id === onTanim);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <Alan etiket="Bağımsız bölüm sayısı" deger={bagimsiz} onChange={setBagimsiz} adim="1" />
        <Alan etiket="Bağımsız bölüm başına kişi" deger={kisiDaire} onChange={setKisiDaire} adim="0.5" />
        <label className="block">
          <span className={labelCls}>Kullanım türü</span>
          <select
            value={onTanim}
            onChange={(e) => {
              setOnTanim(e.target.value);
              const t = TUKETIM_ON_TANIMLARI.find((x) => x.id === e.target.value);
              if (t) setTuketim(t.deger);
            }}
            className={inputCls}
          >
            {TUKETIM_ON_TANIMLARI.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ad} — {t.deger} L/kişi·gün
              </option>
            ))}
          </select>
          {secili && (
            <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
              Kaynak: {secili.kaynak}
            </span>
          )}
        </label>
        <Alan
          etiket="Kişi başı tüketim"
          birim="L/kişi·gün"
          deger={tuketim}
          onChange={setTuketim}
          ipucu="Bağlı olduğunuz su idaresinin (İSKİ, MUSKİ, ASKİ vb.) esas aldığı değeri girin."
        />
        <div className="grid grid-cols-2 gap-3">
          <Alan etiket="Depolama süresi" birim="gün" deger={gun} onChange={setGun} adim="0.5" />
          <Alan etiket="Güvenlik payı" birim="oran" deger={pay} onChange={setPay} adim="0.05" />
        </div>
      </div>

      <Sonuc
        baslik="Kullanım suyu deposu hacmi"
        deger={sonuc.depoM3}
        adimlar={sonuc.adimlar}
        dayanak="Kullanım suyu deposu için ulusal tek bir yönetmelik yoktur; hacim, bağlı olunan su ve kanalizasyon idaresinin esasları ile TS 1258 / TS EN 806 serisine göre belirlenir."
        not="Bu sebeple kişi başı tüketim, depolama süresi ve güvenlik payı ön tanımlı sabit değil, düzenlenebilir girdidir. İdarenizin değerini girerek kullanın."
      />
    </div>
  );
}

function YanginSekmesi() {
  const [sinifId, setSinifId] = useState("OH2");
  const sinif = TEHLIKE_SINIFLARI.find((s) => s.id === sinifId)!;

  const [sprinklerVar, setSprinklerVar] = useState(true);
  const [dolapVar, setDolapVar] = useState(true);
  const [hidrantVar, setHidrantVar] = useState(true);
  const [yogunluk, setYogunluk] = useState(sinif.yogunluk);
  const [etkiAlani, setEtkiAlani] = useState(sinif.etkiAlani);
  const [dolapLdk, setDolapLdk] = useState(sinif.dolapLdk);
  const [hidrantLdk, setHidrantLdk] = useState(sinif.hidrantLdk);
  const [sureDk, setSureDk] = useState(sinif.sureDk);

  function sinifDegistir(id: string) {
    const s = TEHLIKE_SINIFLARI.find((x) => x.id === id);
    if (!s) return;
    setSinifId(id);
    setYogunluk(s.yogunluk);
    setEtkiAlani(s.etkiAlani);
    setDolapLdk(s.dolapLdk);
    setHidrantLdk(s.hidrantLdk);
    setSureDk(s.sureDk);
  }

  const sonuc = useMemo(
    () =>
      hesaplaYanginSuyu({
        sinifId,
        sprinklerVar,
        dolapVar,
        hidrantVar,
        yogunluk: yogunluk || 0,
        etkiAlani: etkiAlani || 0,
        dolapLdk: dolapLdk || 0,
        hidrantLdk: hidrantLdk || 0,
        sureDk: sureDk || 0,
      }),
    [sinifId, sprinklerVar, dolapVar, hidrantVar, yogunluk, etkiAlani, dolapLdk, hidrantLdk, sureDk]
  );

  const kutu =
    "flex items-center gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200";

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <label className="block">
          <span className={labelCls}>Bina tehlike sınıfı</span>
          <select
            value={sinifId}
            onChange={(e) => sinifDegistir(e.target.value)}
            className={inputCls}
          >
            {TEHLIKE_SINIFLARI.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad} — {s.sureDk} dk
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
            Süre BYKHY Madde 92/3&apos;e göre otomatik gelir (düşük 30, orta
            60, yüksek 90 dk).
          </span>
        </label>

        <div className="space-y-2">
          <span className={smallLabelCls}>Yapıdaki sulu söndürme sistemleri</span>
          <label className={kutu}>
            <input type="checkbox" checked={sprinklerVar} onChange={(e) => setSprinklerVar(e.target.checked)} />
            Yağmurlama (sprinkler)
          </label>
          <label className={kutu}>
            <input type="checkbox" checked={dolapVar} onChange={(e) => setDolapVar(e.target.checked)} />
            Yangın dolabı
          </label>
          <label className={kutu}>
            <input type="checkbox" checked={hidrantVar} onChange={(e) => setHidrantVar(e.target.checked)} />
            Hidrant
          </label>
        </div>

        {sprinklerVar && (
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Tasarım yoğunluğu" birim="mm/dk" deger={yogunluk} onChange={setYogunluk} adim="0.25" />
            <Alan etiket="Etki alanı" birim="m²" deger={etkiAlani} onChange={setEtkiAlani} adim="1" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {dolapVar && (
            <Alan etiket="Yangın dolabı debisi" birim="L/dk" deger={dolapLdk} onChange={setDolapLdk} adim="10" />
          )}
          {hidrantVar && (
            <Alan etiket="Hidrant debisi" birim="L/dk" deger={hidrantLdk} onChange={setHidrantLdk} adim="50" />
          )}
        </div>
        <Alan etiket="Süre" birim="dakika" deger={sureDk} onChange={setSureDk} adim="5" />
      </div>

      <div className="space-y-4">
        <Sonuc
          baslik="Yangın suyu deposu hacmi (ön hesap)"
          deger={sonuc.depoM3}
          adimlar={sonuc.adimlar}
          dayanak="Binaların Yangından Korunması Hakkında Yönetmelik (BKK 2007/12937, RG 19.12.2007 / 26735) Madde 92 ve Ek-8/B, Ek-8/C. Yağmurlama tasarım yoğunluğu ve etki alanları TS EN 12845 ile aynıdır."
          not="Madde 92 uyarınca hidrolik hesap yapılması hâlinde hidrolik hesapla bulunan hacim esas alınır; buradaki değer ön hesaptır. Yangın rezervi başka amaçla kullanılamaz."
        />
        {sonuc.uyari && (
          <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            {sonuc.uyari}
          </p>
        )}
      </div>
    </div>
  );
}

// Su Deposu Hesapları: yağmur suyu, kullanım suyu ve yangın suyu deposu
// hacimlerini ilgili yönetmelik formülleriyle hesaplar. Arsapay / Ruhsat
// Hesap ile aynı modal deseni, ancak iframe yerine uygulama içi React
// bileşeni — tema, erişilebilirlik ve test edilebilirlik için.
export default function SuDeposuModal({ onClose }: { onClose: () => void }) {
  const [sekme, setSekme] = useState<Sekme>("yagmur");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className={`${cardCls} my-4 w-full max-w-5xl p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <DropletIcon className="h-4 w-4" />
            </span>
            Su Deposu Hesapları
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 pt-4">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSekme(s.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                sekme === s.id
                  ? "border-brand-500/60 bg-brand-500 text-white"
                  : "border-slate-200/70 text-slate-600 hover:border-brand-300 dark:border-white/10 dark:text-slate-300"
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {sekme === "yagmur" && <YagmurSekmesi />}
          {sekme === "kullanim" && <KullanimSekmesi />}
          {sekme === "yangin" && <YanginSekmesi />}
        </div>

        <p className="border-t border-slate-200/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
          Bu araç ön hesap içindir. Katsayılar ve eşikler yürürlükteki
          yönetmelik metni ile idarenizin uygulama esaslarına göre
          doğrulanmalıdır; nihai sorumluluk proje müellifindedir.
        </p>
      </div>
    </div>
  );
}
