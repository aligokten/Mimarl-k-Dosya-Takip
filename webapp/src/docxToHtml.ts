// Word (.docx) baytlarını ekran içi düzenleme için HTML'e çevirir (mammoth).
// TemplateUpload.tsx ve TaahhutnameUpload.tsx tarafından ortak kullanılır.
export async function docxBufferToHtml(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  // Tablolar, görseller (base64) ve başlıklar korunur; altı çizili/üstü
  // çizili gibi biçimler de aktarılır. Sayfa/tablo yapısı bozulmaz.
  // (Tür tanımı tek argüman bildiriyor; options çalışma zamanında geçerli.)
  const convert = mammoth.convertToHtml as unknown as (
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string[]; includeDefaultStyleMap?: boolean }
  ) => Promise<{ value: string }>;
  const result = await convert(
    { arrayBuffer: buffer },
    {
      styleMap: [
        "u => u",
        "strike => s",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
      ],
      includeDefaultStyleMap: true,
    }
  );
  return result.value;
}
