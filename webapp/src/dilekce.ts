// Dilekçe şablonu düzenleyicisinin saf DOM yardımcıları.
// TemplateEditor.tsx'ten ayrı tutulur ki tarayıcıda bağımsız test edilebilsin.
// Köşeli parantezli alan adı: [MÜŞTERİ ADI] gibi.
export const TOKEN_RE = /\[([^\][\n]{1,60})\]/g;

// "Dilekçe düzeni" uygulanırken sola dayanacak bloklar (imza/mal sahibi
// künyesi). Gövde metni serbest bırakılır.
// Not: Metin karşılaştırmadan önce tr-TR kurallarıyla küçültülür. JavaScript'in
// /i/ bayrağı Unicode katlaması yaptığı için Türkçe büyük "İ" (U+0130) ile
// "i" eşleşmez — "İmza" satırı bu yüzden yakalanmıyordu.
export const SOLA_DAYALI_RE =
  /(mal sahibi|arsa sahibi|mülk sahibi|imza|adı soyadı|vekil|başvuran|tc kimlik|t\.c\. kimlik)/;

export function trLower(text: string): string {
  return text.toLocaleLowerCase("tr-TR");
}

// Dilekçe eki olarak sık kullanılan belgeler (hızlı ekleme için).
export const EK_ONERILERI = [
  "Tapu fotokopisi",
  "İmar durum belgesi (çap)",
  "Aplikasyon krokisi",
  "Kot krokisi",
  "Vekaletname",
  "Kimlik fotokopisi",
  "Mimari proje",
  "Statik proje",
  "Elektrik projesi",
  "Mekanik tesisat projesi",
  "Zemin etüt raporu",
  "Numarataj belgesi",
];

export function textNodesOf(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

// Belgedeki tüm alan adlarını topla: hem henüz doldurulmamış ham [ALAN]
// metinleri hem de daha önce doldurulup <span data-token> içine alınmış olanlar.
export function collectTokens(root: HTMLElement): string[] {
  const set = new Set<string>();
  root.querySelectorAll<HTMLElement>("[data-token]").forEach((el) => {
    if (el.dataset.token) set.add(el.dataset.token);
  });
  for (const node of textNodesOf(root)) {
    if (node.parentElement?.closest("[data-token]")) continue;
    const text = node.nodeValue ?? "";
    if (!text.includes("[")) continue;
    TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_RE.exec(text))) set.add(m[1].trim());
  }
  return [...set];
}

// Alanları belgeye uygular. Doldurulan değer <span data-token> içine alınır;
// böylece seçim değiştirildiğinde (ör. başka bir proje ya da vekil seçilince)
// aynı alan yeniden yazılabilir — eski davranışta [ALAN] metni kaybolduğu için
// ilk doldurma kalıcı oluyordu.
export function applyTokens(
  root: HTMLElement,
  tokens: Record<string, string | undefined>
) {
  // 1) Daha önce doldurulmuş alanları güncelle.
  root.querySelectorAll<HTMLElement>("[data-token]").forEach((el) => {
    const key = el.dataset.token;
    if (!key) return;
    const value = tokens[key];
    if (value && el.textContent !== value) el.textContent = value;
  });

  // 2) Kalan ham [ALAN] metinlerini doldur.
  for (const node of textNodesOf(root)) {
    if (node.parentElement?.closest("[data-token]")) continue;
    const text = node.nodeValue ?? "";
    if (!text.includes("[")) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    let replaced = false;
    TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_RE.exec(text))) {
      const value = tokens[m[1].trim()];
      if (!value) continue;
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      const span = document.createElement("span");
      span.dataset.token = m[1].trim();
      span.textContent = value;
      frag.appendChild(span);
      last = m.index + m[0].length;
      replaced = true;
    }
    if (!replaced) continue;
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode?.replaceChild(frag, node);
  }
}

export function isUpperish(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3) return false;
  return letters === letters.toLocaleUpperCase("tr-TR");
}

// Başlıkları ortalar, imza/mal sahibi künyesini sola dayar.
export function applyDilekceLayout(root: HTMLElement): { orta: number; sol: number } {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,div")
  ).filter((el) => (el.textContent ?? "").trim().length > 0);

  let orta = 0;
  let sol = 0;
  let seen = 0;

  for (const el of blocks) {
    // İç içe bloklarda yalnızca en dıştakini hizala.
    if (el.parentElement?.closest("p,h1,h2,h3,h4")) continue;
    const text = (el.textContent ?? "").trim();
    seen += 1;

    const heading = /^H[1-4]$/.test(el.tagName);
    const looksLikeTitle =
      heading ||
      (seen <= 5 &&
        text.length <= 80 &&
        !/[.!?]$/.test(text) &&
        (isUpperish(text) ||
          el.querySelector("strong,b")?.textContent?.trim() === text));

    if (SOLA_DAYALI_RE.test(trLower(text))) {
      el.style.textAlign = "left";
      sol += 1;
    } else if (looksLikeTitle) {
      el.style.textAlign = "center";
      orta += 1;
    }
  }
  return { orta, sol };
}

// Dilekçe eki listesini bul: "EKLER:" / "Dilekçe eki" gibi bir satırın hemen
// ardından gelen liste. Daha önce bu ekranda oluşturulmuşsa data-ekler ile
// işaretlidir.
export function findEkList(root: HTMLElement): HTMLElement | null {
  const marked = root.querySelector<HTMLElement>("[data-ekler]");
  if (marked) return marked;

  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,div,strong,b")
  );
  for (const el of blocks) {
    const text = (el.textContent ?? "").trim();
    if (!/^(dilekçe\s*ek(i|leri)?|ek(ler|leri)?)\s*[:：]?$/.test(trLower(text)))
      continue;
    let sib = el.nextElementSibling;
    // <strong> içindeyse bir üst bloğun kardeşine bak.
    if (!sib && el.parentElement) sib = el.parentElement.nextElementSibling;
    while (sib && !(sib.textContent ?? "").trim()) sib = sib.nextElementSibling;
    if (sib && (sib.tagName === "UL" || sib.tagName === "OL")) {
      sib.setAttribute("data-ekler", "");
      return sib as HTMLElement;
    }
  }
  return null;
}

export function readEkler(root: HTMLElement): string[] {
  const list = findEkList(root);
  if (!list) return [];
  return Array.from(list.querySelectorAll("li")).map((li) =>
    (li.textContent ?? "").trim()
  );
}

export function writeEkler(root: HTMLElement, items: string[]) {
  let list = findEkList(root);
  if (!list) {
    const heading = document.createElement("p");
    heading.innerHTML = "<strong>EKLER:</strong>";
    heading.style.textAlign = "left";
    list = document.createElement("ol");
    list.setAttribute("data-ekler", "");
    root.appendChild(heading);
    root.appendChild(list);
  }
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }
}
