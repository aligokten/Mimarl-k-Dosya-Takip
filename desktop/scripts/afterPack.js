"use strict";

// macOS paketini ad-hoc imzalar.
//
// Neden gerekli: Apple Silicon'da her çalıştırılabilir ikilinin geçerli bir
// imza taşıması zorunlu. Electron'un kendi ikilisi imzalı gelir, ama
// electron-builder paketi yeniden adlandırıp app.asar'ı gömdüğü için o imza
// geçersizleşir. İmza onarılmazsa macOS uygulamayı kurcalanmış sayar ve
// "Kötü Amaçlı Yazılım Engellendi" diyerek Çöp Sepeti'ne taşır; karantina
// özniteliğini silmek bu durumu çözmez.
//
// electron-builder'ın kendi imzalama yolu burada işe yaramıyor:
// `identity: null` imzalamayı tamamen atlıyor, `identity: "-"` ise bu
// sürümde (25.x) anahtarlıkta "-" diye bir sertifika arayıp bulamayınca yine
// atlıyor — ad-hoc'a düşme davranışı 26.x ile geldi. Bu yüzden imzalama
// doğrudan burada yapılıyor.
//
// Ad-hoc imza uygulamayı notarize etmez: kullanıcı yine de karantinayı
// kaldırmak zorunda. Yaptığı şey, uygulamanın hiç çalışmaması ile
// çalışması arasındaki fark.

const { execFileSync } = require("child_process");
const path = require("path");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const uygulamaAdi = `${context.packager.appInfo.productFilename}.app`;
  const uygulamaYolu = path.join(context.appOutDir, uygulamaAdi);

  console.log(`  • ad-hoc imzalanıyor: ${uygulamaYolu}`);
  execFileSync(
    "codesign",
    ["--force", "--deep", "--sign", "-", "--timestamp=none", uygulamaYolu],
    { stdio: "inherit" }
  );

  // İmza gerçekten oturmuş mu? Oturmadıysa derleme burada patlasın;
  // bozuk bir .dmg kullanıcıya ulaşmasın.
  execFileSync(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", uygulamaYolu],
    { stdio: "inherit" }
  );
  console.log("  • imza doğrulandı");
};
