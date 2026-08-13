# Neue Montreal font dosyaları

Panel tipografisi **Neue Montreal** üzerine kurulu. Font ticari lisanslı
olduğu için dosyalar depoya dahil edilmedi; lisansınızla birlikte gelen
`.woff2` dosyalarını **bu klasöre** aşağıdaki adlarla ekleyin:

```
public/brand/fonts/NeueMontreal-Regular.woff2    (400)
public/brand/fonts/NeueMontreal-Medium.woff2     (500)
public/brand/fonts/NeueMontreal-SemiBold.woff2   (600–800)
```

Dosyalar eklendiği anda `src/index.css` içindeki `@font-face` tanımları
devreye girer; ayrıca bir kod değişikliği gerekmez.

**Dosyalar yokken:** tarayıcı sessizce yedek yazı tipi olan **Inter**'e
düşer — panel bozulmaz, yalnızca harf karakteri farklı görünür. (Konsolda
eksik font dosyaları için 404 uyarısı görebilirsiniz; bu beklenen
durumdur.)

`.otf`/`.ttf` dosyalarınız varsa `.woff2`'ye çevirmeniz önerilir (belirgin
şekilde daha küçük ve hızlı):
<https://transfonter.org> veya `woff2_compress` aracı kullanılabilir.
