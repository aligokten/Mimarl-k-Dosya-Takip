// ArsaPay — AutoCAD şerit (ribbon) eklentisi
//
// AutoCAD açılırken Autoloader (ArsaPay.bundle/PackageContents.xml) bu DLL'i
// yükler. DLL, şeride "ARSAPAY" sekmesini çalışma anında ekler. Düğmeler,
// aynı paketle yüklenen SAGG_ARSAPAY.lsp içindeki LISP komutlarını çalıştırır.
// Böylece CUIx dosyası düzenlemeye gerek kalmaz ve kullanıcının kendi CUI
// özelleştirmelerine dokunulmaz. Çalışma alanı (WSCURRENT) değiştiğinde ya
// da sekme kaybolursa ARSAPAYSERIT komutuyla sekme yeniden oluşturulur.

using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Autodesk.AutoCAD.Runtime;
using Autodesk.Windows;
using AcApp = Autodesk.AutoCAD.ApplicationServices.Application;

[assembly: ExtensionApplication(typeof(ArsaPay.RibbonApp))]
[assembly: CommandClass(typeof(ArsaPay.RibbonApp))]

namespace ArsaPay
{
    public class RibbonApp : IExtensionApplication
    {
        internal const string TabId = "SAGG_ARSAPAY_TAB";

        public void Initialize()
        {
            try
            {
                if (ComponentManager.Ribbon == null)
                    ComponentManager.ItemInitialized += OnRibbonItemInitialized;
                else
                    RibbonBuilder.EnsureTab();

                // Çalışma alanı değişince AutoCAD şeridi yeniden kurar;
                // sekmeyi tekrar ekle.
                AcApp.SystemVariableChanged += (s, e) =>
                {
                    if (string.Equals(e.Name, "WSCURRENT", StringComparison.OrdinalIgnoreCase))
                        RibbonBuilder.EnsureTab();
                };
            }
            catch (System.Exception ex)
            {
                WriteMessage("\nArsaPay: şerit oluşturulamadı: " + ex.Message);
            }
        }

        public void Terminate() { }

        private static void OnRibbonItemInitialized(object sender, RibbonItemEventArgs e)
        {
            if (ComponentManager.Ribbon == null) return;
            ComponentManager.ItemInitialized -= OnRibbonItemInitialized;
            RibbonBuilder.EnsureTab();
        }

        /// <summary>Sekme görünmüyorsa elle yeniden oluşturur.</summary>
        [CommandMethod("ARSAPAYSERIT")]
        public void RecreateTab()
        {
            if (ComponentManager.Ribbon == null)
            {
                WriteMessage("\nArsaPay: Şerit kapalı. Önce RIBBON komutuyla şeridi açın.");
                return;
            }
            RibbonBuilder.EnsureTab(activate: true);
            WriteMessage("\nArsaPay sekmesi şeride eklendi.");
        }

        internal static void WriteMessage(string msg)
        {
            var doc = AcApp.DocumentManager.MdiActiveDocument;
            doc?.Editor.WriteMessage(msg);
        }
    }

    internal static class RibbonBuilder
    {
        public static void EnsureTab(bool activate = false)
        {
            RibbonControl ribbon = ComponentManager.Ribbon;
            if (ribbon == null) return;

            RibbonTab existing = null;
            foreach (RibbonTab t in ribbon.Tabs)
            {
                if (t.Id == RibbonApp.TabId) { existing = t; break; }
            }

            if (existing == null)
            {
                existing = BuildTab();
                ribbon.Tabs.Add(existing);
            }

            if (activate) existing.IsActive = true;
        }

        private static RibbonTab BuildTab()
        {
            var tab = new RibbonTab
            {
                Title = "ARSAPAY",
                Id = RibbonApp.TabId,
            };

            // --- Parsel Bölme paneli ---
            var split = new RibbonPanelSource { Title = "Parsel Bölme" };
            split.Items.Add(LargeButton(
                "Eşit Alanlı\nBöl", "ARSAPAY", Icons.Split,
                "Eşit Alanlı Böl (ARSAPAY)",
                "Kapalı bir parsel poliçizgisini en kompakt parçaları veren kesim " +
                "açılarını arayarak eşit alanlı N parçaya böler. Parçalar, etiketler " +
                "ve paylaşım lejantı çizime eklenir."));
            split.Items.Add(LargeButton(
                "Referansa\nDik Böl", "ARSAPAYREF", Icons.Reference,
                "Referans Çizgisine Göre Böl (ARSAPAYREF)",
                "İki noktayla bir referans doğrultusu verin; parsel, kesimleri bu " +
                "doğrultuya dik olan (şeritleri ona paralel) eşit alanlı parçalara bölünür."));
            tab.Panels.Add(new RibbonPanel { Source = split });

            // --- Bilgi paneli ---
            var info = new RibbonPanelSource { Title = "ArsaPay" };
            info.Items.Add(LargeButton(
                "Ruhsat360\nPaneli", "ARSAPAYWEB", Icons.Web,
                "Ruhsat360 / ArsaPay Web (ARSAPAYWEB)",
                "TKGM parsel sorgusu ile çalışan ArsaPay web modülünü içeren " +
                "Ruhsat360 panelini tarayıcıda açar."));
            info.Items.Add(LargeButton(
                "Bilgi", "ARSAPAYBILGI", Icons.Info,
                "ArsaPay Hakkında (ARSAPAYBILGI)",
                "Sürüm, kullanım ve bilgilendirme notu."));
            tab.Panels.Add(new RibbonPanel { Source = info });

            return tab;
        }

        private static RibbonButton LargeButton(string text, string command,
            Func<int, BitmapSource> icon, string tipTitle, string tipBody)
        {
            return new RibbonButton
            {
                Text = text,
                ShowText = true,
                ShowImage = true,
                Size = RibbonItemSize.Large,
                Orientation = System.Windows.Controls.Orientation.Vertical,
                LargeImage = icon(32),
                Image = icon(16),
                CommandParameter = command,
                CommandHandler = new CommandHandler(),
                ToolTip = new RibbonToolTip
                {
                    Title = tipTitle,
                    Content = tipBody,
                    Command = command,
                },
            };
        }
    }

    /// <summary>Düğmeye basılınca ilgili LISP komutunu komut satırına gönderir.</summary>
    internal class CommandHandler : ICommand
    {
        public event EventHandler CanExecuteChanged { add { } remove { } }

        public bool CanExecute(object parameter) => true;

        public void Execute(object parameter)
        {
            var btn = parameter as RibbonButton;
            var cmd = btn?.CommandParameter as string;
            if (string.IsNullOrEmpty(cmd)) return;

            var doc = AcApp.DocumentManager.MdiActiveDocument;
            if (doc == null) return;

            // Çalışan bir komut varsa iki kez ESC ile iptal edip komutu başlat.
            doc.SendStringToExecute("\x03\x03_" + cmd + " ", true, false, true);
        }
    }

    /// <summary>
    /// Düğme simgeleri kod içinde çizilir; harici resim dosyası gerekmez.
    /// Marka turuncusu ArsaPay logosuyla uyumludur.
    /// </summary>
    internal static class Icons
    {
        private static readonly Color Brand = Color.FromRgb(0xC1, 0x44, 0x0E);
        private static readonly Color Ink = Color.FromRgb(0x2A, 0x2A, 0x28);

        public static BitmapSource Split(int size) => Render(size, (dc, s) =>
        {
            // Parsel çerçevesi ve iki kesim çizgisi
            var frame = new Pen(new SolidColorBrush(Brand), s / 12.0);
            var cut = new Pen(new SolidColorBrush(Ink), s / 16.0) { DashStyle = DashStyles.Dash };
            var fill = new SolidColorBrush(Color.FromArgb(0x40, Brand.R, Brand.G, Brand.B));
            var geo = Poly(s, new[] { (0.12, 0.30), (0.40, 0.12), (0.88, 0.22), (0.88, 0.88), (0.12, 0.88) });
            dc.DrawGeometry(fill, frame, geo);
            dc.DrawLine(cut, P(s, 0.38, 0.14), P(s, 0.38, 0.88));
            dc.DrawLine(cut, P(s, 0.63, 0.17), P(s, 0.63, 0.88));
        });

        public static BitmapSource Reference(int size) => Render(size, (dc, s) =>
        {
            var frame = new Pen(new SolidColorBrush(Brand), s / 12.0);
            var refPen = new Pen(new SolidColorBrush(Color.FromRgb(0xEA, 0xB3, 0x08)), s / 9.0);
            var cut = new Pen(new SolidColorBrush(Ink), s / 16.0) { DashStyle = DashStyles.Dash };
            var geo = Poly(s, new[] { (0.12, 0.12), (0.88, 0.12), (0.88, 0.72), (0.12, 0.72) });
            dc.DrawGeometry(null, frame, geo);
            dc.DrawLine(cut, P(s, 0.37, 0.12), P(s, 0.37, 0.72));
            dc.DrawLine(cut, P(s, 0.62, 0.12), P(s, 0.62, 0.72));
            dc.DrawLine(refPen, P(s, 0.08, 0.88), P(s, 0.92, 0.88));
        });

        public static BitmapSource Web(int size) => Render(size, (dc, s) =>
        {
            var pen = new Pen(new SolidColorBrush(Brand), s / 12.0);
            var c = P(s, 0.5, 0.5);
            dc.DrawEllipse(null, pen, c, s * 0.38, s * 0.38);
            dc.DrawEllipse(null, pen, c, s * 0.16, s * 0.38);
            dc.DrawLine(pen, P(s, 0.12, 0.5), P(s, 0.88, 0.5));
        });

        public static BitmapSource Info(int size) => Render(size, (dc, s) =>
        {
            dc.DrawEllipse(new SolidColorBrush(Brand), null, P(s, 0.5, 0.5), s * 0.42, s * 0.42);
            var white = new SolidColorBrush(Colors.White);
            dc.DrawEllipse(white, null, P(s, 0.5, 0.28), s * 0.065, s * 0.065);
            dc.DrawRectangle(white, null, new Rect(s * 0.44, s * 0.42, s * 0.12, s * 0.34));
        });

        private static Point P(double s, double x, double y) => new Point(s * x, s * y);

        private static Geometry Poly(double s, (double x, double y)[] pts)
        {
            var g = new StreamGeometry();
            using (var ctx = g.Open())
            {
                ctx.BeginFigure(P(s, pts[0].x, pts[0].y), true, true);
                for (int i = 1; i < pts.Length; i++)
                    ctx.LineTo(P(s, pts[i].x, pts[i].y), true, false);
            }
            g.Freeze();
            return g;
        }

        private static BitmapSource Render(int size, Action<DrawingContext, double> draw)
        {
            var visual = new DrawingVisual();
            using (var dc = visual.RenderOpen())
            {
                draw(dc, size);
            }
            var bmp = new RenderTargetBitmap(size, size, 96, 96, PixelFormats.Pbgra32);
            bmp.Render(visual);
            bmp.Freeze();
            return bmp;
        }
    }
}
