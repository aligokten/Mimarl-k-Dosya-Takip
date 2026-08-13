# PP Neue Montreal — panel yazı tipi

Panel tipografisi **PP Neue Montreal** (Pangram Pangram) üzerine kurulu.
Kesimler `.woff2` olarak bu klasörde tutulur ve `src/index.css` içindeki
`@font-face` tanımlarıyla yüklenir.

## Neden `public/` değil de `src/`?

Vite yapılandırmasında `base: "./"` kullanılıyor (hem `panel.ruhsat360.com`
kök yayını hem de GitHub Pages `/Mimarl-k-Dosya-Takip/` alt yolu çalışsın
diye). `public/` altındaki dosyalara **mutlak** yolla (`/brand/fonts/...`)
erişmek gerekir ve bu alt yol deploy'unda kırılır. `src/` altında
tutulduğunda Vite dosyaları parmak izli adlarla paketler ve CSS içindeki
URL'leri kendisi yeniden yazar — her iki deploy biçiminde de doğru çalışır,
ayrıca sürüm değişince önbellek kendiliğinden tazelenir.

## Ağırlık eşlemesi

| Dosya | CSS `font-weight` | Karşılık gelen sınıflar |
|---|---|---|
| `NeueMontreal-Regular.woff2` (Book) | `400` | `font-normal`, `font-light` |
| `NeueMontreal-Medium.woff2` | `500` | `font-medium` |
| `NeueMontreal-Bold.woff2` | `600 900` | `font-semibold`, `font-bold`, `font-extrabold` |
| `NeueMontreal-Italic.woff2` | `400` + `italic` | `italic` |

> **Not:** Sette **dik (upright) SemiBold** kesimi yok — yalnızca
> SemiBoldItalic var. Bu yüzden `600–900` aralığı gerçek **Bold** kesimine
> bağlandı; tarayıcının sentetik kalınlaştırma yapmasını engelliyor ancak
> `font-semibold` tasarım referansındakinden bir tık daha kalın görünür.
> Lisansınızda dik **SemiBold** varsa `NeueMontreal-SemiBold.woff2` olarak
> ekleyip `index.css`'e `600` ağırlıklı ayrı bir `@font-face` tanımlamanız
> yeterli; Bold tanımını da `700 900`'e daraltın.

## Kaynak dosyalardan yeniden üretme

Depoya yalnızca `.woff2` eklenir (OTF'ye göre belirgin şekilde küçük).
Elinizdeki `.otf` dosyalarından üretmek için:

```bash
pip install fonttools brotli
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('ppneuemontreal-book.otf'); f.flavor = 'woff2'
f.save('NeueMontreal-Regular.woff2')
"
```

## Lisans

PP Neue Montreal ticari lisanslı bir yazı tipidir ve font dosyaları web
üzerinden herkese açık şekilde sunulur. Panelin canlı yayını için
geçerli bir **webfont/web kullanım** lisansınız olduğundan emin olun —
masaüstü lisansı çoğu dökümhanede web yayınını kapsamaz.
