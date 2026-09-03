import { useEffect, useState } from "react";

// Sabit başlık çubuğunun soluklaşma durumu.
//
// Aşağı kaydırma başlayınca başlık saydamlaşır (içeriğin üstünü kapatmasın),
// imleç hareketi veya dokunma olunca yeniden belirginleşir. Sayfanın en
// üstündeyken ve yukarı kaydırırken her zaman tam görünürdür.
//
// Not: Bazı tarayıcılar imleç sabitken sayfa kaydığında da pointermove
// üretiyor; bu yüzden "gerçek" hareket için küçük bir eşik aranır, aksi halde
// kaydırmanın kendisi başlığı hemen geri açardı.
export function useHeaderFaded(): { faded: boolean; scrolled: boolean } {
  const [faded, setFaded] = useState(false);
  // Sayfa kaydırıldığında başlık ekranın tepesine yapışır; yuvarlak üst
  // köşelerinden altındaki içerik sızmasın diye köşeler o anda düzleştirilir.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let px = -1;
    let py = -1;

    function onScroll() {
      const y = window.scrollY;
      const goingDown = y > lastY;
      lastY = y;
      setScrolled(y > 8);
      // En üstteyken ve yukarı kaydırırken başlık tam görünür kalsın.
      if (y <= 8 || !goingDown) {
        setFaded(false);
        return;
      }
      setFaded(true);
    }

    function onPointerMove(e: PointerEvent) {
      if (px >= 0 && Math.hypot(e.clientX - px, e.clientY - py) < 6) return;
      px = e.clientX;
      py = e.clientY;
      setFaded(false);
    }

    function wake() {
      setFaded(false);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("touchstart", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("focusin", wake);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("focusin", wake);
    };
  }, []);

  return { faded, scrolled };
}
