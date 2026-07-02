import { useState } from "react";
import { saveConfig } from "../firebase";
import type { FirebaseConfig } from "../firebase-config";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";

// Firebase Console'un verdiği bloğu esnek şekilde ayrıştırır: tüm kod
// parçasını ("import { ... }" satırları + "const firebaseConfig = { ... }"
// + initializeApp çağrıları), yalnızca "{ ... }" nesnesini ya da düz JSON'u
// kabul eder.
export function parseFirebaseConfig(input: string): FirebaseConfig {
  let text = input;
  // "firebaseConfig =" varsa oradan başla; böylece "import { ... }" gibi
  // önceki süslü parantezler yanlışlıkla nesne sanılmaz.
  const eq = text.search(/firebaseConfig\s*=/);
  if (eq >= 0) text = text.slice(eq);
  const start = text.indexOf("{");
  if (start < 0) throw new Error("Yapılandırma bulunamadı.");
  // Dengeli süslü parantezle nesnenin kapanışını bul.
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error("Yapılandırma bulunamadı.");
  let obj = text.slice(start, end + 1);
  // Yorumları temizle (URL'lerdeki // zarar görmesin diye yalnızca satır
  // başındaki // yorumları), anahtarları tırnakla, sondaki virgülü at.
  obj = obj
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/[^\n]*$/gm, "")
    .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(obj) as FirebaseConfig;
}

// Yalnızca yönetici ilk kurulumda görür: Firebase proje yapılandırmasını
// yapıştırma ekranı. Değerler herkese açıktır (gizli değildir).
export default function FirebaseSetup() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parseAndSave() {
    setError(null);
    try {
      const cfg = parseFirebaseConfig(raw);
      if (!cfg.apiKey || !cfg.projectId || !cfg.appId || !cfg.authDomain) {
        throw new Error(
          "apiKey, authDomain, projectId ve appId alanları gerekli."
        );
      }
      saveConfig(cfg);
      location.reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Yapılandırma okunamadı: ${e.message}`
          : "Yapılandırma okunamadı."
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className={`${cardCls} w-full max-w-lg p-7`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path d="M5 16 L8 3l3 5 3-6 5 14a9 4 0 0 1-14 0z" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Firebase Kurulumu
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Çoklu kullanıcı, davet ve bildirimler için tek seferlik.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            Adımlar:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline dark:text-blue-400"
              >
                console.firebase.google.com
              </a>{" "}
              → yeni proje oluşturun.
            </li>
            <li>
              <strong>Build → Authentication → Get started</strong> →{" "}
              <strong>Google</strong> sağlayıcısını etkinleştirin.
            </li>
            <li>
              <strong>Build → Firestore Database → Create database</strong>{" "}
              (production modu; kurallar sonra otomatik gelir).
            </li>
            <li>
              <strong>
                Proje Ayarları (⚙) → General → Your apps → Web (&lt;/&gt;)
              </strong>{" "}
              ekleyin; verilen <code>firebaseConfig</code> bloğunu aşağıya
              yapıştırın.
            </li>
            <li>
              <strong>Authentication → Settings → Authorized domains</strong>{" "}
              listesine <code>aligokten.github.io</code> ekleyin.
            </li>
          </ol>
        </div>

        <label className={`${labelCls} mt-5`}>firebaseConfig</label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={9}
          placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "proje.firebaseapp.com",\n  projectId: "proje",\n  appId: "1:...:web:..."\n};`}
          className={`${inputCls} font-mono text-xs`}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button onClick={parseAndSave} className={`${primaryBtnCls} mt-4`}>
          Kaydet ve Başla
        </button>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Not: Bu değerler gizli değildir; güvenlik Firebase kuralları ve
          Google girişiyle sağlanır. Bir kez yöneticinin girmesi yeterlidir —
          derlemeye gömüldüğünde tüm çalışanlar için otomatik gelir.
        </p>
      </div>
    </div>
  );
}
