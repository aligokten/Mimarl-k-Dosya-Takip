// Word (.docx) şablonlarını, belgenin iç yapısına (sayfa kenar boşlukları,
// yazı tipi, tablo/paragraf konumları, biçimlendirme) hiç dokunmadan
// doldurur. .docx bir ZIP arşividir; içindeki word/document.xml (ve
// header/footer parçaları) doğrudan metin düğümü (<w:t>) seviyesinde
// düzenlenir — yalnızca [TOKEN] metinleri gerçek değerle değiştirilir,
// başka hiçbir öğe taşınmaz veya yeniden biçimlendirilmez. Bu sayede
// e-imza için kritik olan birebir sayfa düzeni korunur.
import JSZip from "jszip";

const W_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const FILLABLE_PART = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

interface TextSpan {
  node: Element;
  start: number;
  end: number;
}

interface Replacement {
  start: number;
  end: number;
  value: string;
}

function replaceTokensInPart(
  xml: string,
  tokens: Record<string, string | undefined>
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    // Bozuk/çözümlenemeyen XML — değiştirmeden bırak.
    return xml;
  }

  const textNodes = Array.from(doc.getElementsByTagNameNS(W_NS, "t"));
  if (textNodes.length === 0) return xml;

  let full = "";
  const spans: TextSpan[] = [];
  for (const node of textNodes) {
    const text = node.textContent ?? "";
    const start = full.length;
    full += text;
    spans.push({ node, start, end: start + text.length });
  }

  const replacements: Replacement[] = [];
  for (const [token, value] of Object.entries(tokens)) {
    if (!value) continue;
    const needle = `[${token}]`;
    let from = 0;
    for (;;) {
      const idx = full.indexOf(needle, from);
      if (idx === -1) break;
      replacements.push({ start: idx, end: idx + needle.length, value });
      from = idx + needle.length;
    }
  }
  if (replacements.length === 0) return xml;
  replacements.sort((a, b) => a.start - b.start);

  for (const span of spans) {
    let newText = "";
    let pos = span.start;
    while (pos < span.end) {
      const hit = replacements.find((r) => r.start <= pos && pos < r.end);
      if (hit) {
        if (pos === hit.start) newText += hit.value;
        pos = Math.min(hit.end, span.end);
        continue;
      }
      const nextStart = replacements
        .map((r) => r.start)
        .filter((s) => s > pos && s < span.end)
        .sort((a, b) => a - b)[0];
      const segEnd = nextStart ?? span.end;
      newText += full.slice(pos, segEnd);
      pos = segEnd;
    }
    if (newText !== (span.node.textContent ?? "")) {
      span.node.textContent = newText;
      // Baştaki/sondaki boşlukların Word tarafından silinmemesi için.
      span.node.setAttribute("xml:space", "preserve");
    }
  }

  let out = new XMLSerializer().serializeToString(doc);
  if (!out.startsWith("<?xml")) {
    out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + out;
  }
  return out;
}

export async function fillDocxTemplate(
  original: ArrayBuffer,
  tokens: Record<string, string | undefined>
): Promise<Blob> {
  const zip = await JSZip.loadAsync(original);
  const targets = Object.keys(zip.files).filter((name) =>
    FILLABLE_PART.test(name)
  );

  for (const path of targets) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("string");
    zip.file(path, replaceTokensInPart(xml, tokens));
  }

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
