;============================================================
; SAGG_ARSAPAY.lsp  -  ArsaPay v1.0 (AutoCAD eklentisi)
; ArsaPay v1.0 uygulamasi SAGG markasina ait olup, tum haklari saklidir. 2026.
;
; SAGG_ARSA_PAYLASTIR_V5.lsp tabanlidir (bkz. arsiv/). V5'e gore yenilikler:
;  - ARSAPAYREF: kesimler bir referans cizgisine (or. yol cephesi) dik olur;
;    boylece her parca referans boyunca cephe alir. (Ruhsat360 ArsaPay web
;    modulundeki "referans cizgisine dik kesim" ile ayni mantik.)
;  - Yayli sinirlar: V5 yay iceren policizgiyi 800 noktayla ornekliyordu
;    (cok yavas ve koseler kayiyordu). Artik yalniz yay kenarlari ~5 derecelik
;    adimlarla bolunur, duz kenarlarin koseleri birebir korunur.
;    Duz policizgilerde sonuclar V5 ile birebir aynidir.
;  - Duzeltmeler: korumali 'pi' sembolu yerel degisken olarak kullanilmiyor;
;    T/nil karsilastirmasi guvenli hale getirildi; hata/iptal akisi tek
;    noktadan yonetiliyor, son girilen degerler oturum boyunca hatirlaniyor.
;  - Serit (ribbon) sekmesi "ARSAPAY" ArsaPayRibbon.dll ile gelir.
;
; Komutlar
;   ARSAPAY       Otomatik acisal arama ile esit alanli bolme
;   ARSAPAYREF    Referans cizgisine dik kesimlerle esit alanli bolme
;   ARSAPAYWEB    Ruhsat360 panelini (ArsaPay web, TKGM parsel sorgu) acar
;   ARSAPAYBILGI  Surum ve bilgilendirme notu
;   ARSAPAY5      Eski komut adi (ARSAPAY ile ayni)
;
; Her parca icin: kapali sinir (SAGG-PAY-SINIR), ANSI31 tarama
; (SAGG-PAY-HATCH), parca adi + alan yazisi (SAGG-PAY-YAZI) ve istege bagli
; lejant tablosu (SAGG-PAY-LEJANT). Orijinal parsel siniri degistirilmez.
;
; Dosya, her AutoCAD dil/kod sayfasi ayarinda dogru okunsun diye yalniz
; ASCII karakterlerle yazilmistir.
;============================================================

(vl-load-com)

(setq sag6:eps 1.0e-8)
(setq sag6:version "1.0.0")
(setq sag6:web-url "https://panel.ruhsat360.com")
(setq sag6:colors '(1 2 3 4 5 6 30 40 50 70 90 130 150 170 200 220 240))

; Son kullanilan degerler (oturum boyunca hatirlanir)
(if (not sag6:last-n)    (setq sag6:last-n 4))
(if (not sag6:last-unit) (setq sag6:last-unit 1.0))
(if (not sag6:last-min)  (setq sag6:last-min 0.0))
(if (not sag6:last-step) (setq sag6:last-step 5.0))

;---------------- Vektor yardimcilari ----------------
(defun sag6:pt2 (p) (list (float (car p)) (float (cadr p))))
(defun sag6:pt3 (p) (list (float (car p)) (float (cadr p)) 0.0))
(defun sag6:add (a b) (list (+ (car a) (car b)) (+ (cadr a) (cadr b))))
(defun sag6:sub (a b) (list (- (car a) (car b)) (- (cadr a) (cadr b))))
(defun sag6:mul (a s) (list (* (car a) s) (* (cadr a) s)))
(defun sag6:dot (a b) (+ (* (car a) (car b)) (* (cadr a) (cadr b))))
(defun sag6:len (v) (sqrt (+ (* (car v) (car v)) (* (cadr v) (cadr v)))))
(defun sag6:dist (a b) (sag6:len (sag6:sub a b)))
(defun sag6:cross2 (a b) (- (* (car a) (cadr b)) (* (cadr a) (car b))))

(defun sag6:unit (v / l)
  (setq l (sag6:len v))
  (if (> l sag6:eps) (list (/ (car v) l) (/ (cadr v) l)) nil)
)

; Kapali poligonun kenarlari: ((p0 p1) (p1 p2) ... (pn-1 p0))
(defun sag6:edges (pts)
  (if pts (mapcar 'list pts (append (cdr pts) (list (car pts)))))
)

(defun sag6:clean-poly (pts / out)
  (foreach p pts
    (if (or (null out) (> (sag6:dist p (car out)) 1.0e-7))
      (setq out (cons p out))
    )
  )
  (setq out (reverse out))
  (if (and (> (length out) 1) (< (sag6:dist (car out) (last out)) 1.0e-7))
    (setq out (reverse (cdr (reverse out))))
  )
  out
)

(defun sag6:signed-area (pts / s)
  (setq s 0.0)
  (if (>= (length pts) 3)
    (foreach e (sag6:edges pts)
      (setq s (+ s (sag6:cross2 (car e) (cadr e))))
    )
  )
  (/ s 2.0)
)

(defun sag6:area (pts) (abs (sag6:signed-area pts)))

(defun sag6:centroid (pts / a cx cy cr p q)
  (if (< (length pts) 3)
    (if pts (car pts) '(0.0 0.0))
    (progn
      (setq a 0.0 cx 0.0 cy 0.0)
      (foreach e (sag6:edges pts)
        (setq p  (car e)
              q  (cadr e)
              cr (sag6:cross2 p q)
              a  (+ a cr)
              cx (+ cx (* (+ (car p) (car q)) cr))
              cy (+ cy (* (+ (cadr p) (cadr q)) cr))
        )
      )
      (if (< (abs a) sag6:eps)
        (car pts)
        (list (/ cx (* 3.0 a)) (/ cy (* 3.0 a)))
      )
    )
  )
)

(defun sag6:range-dot (pts u / mn mx v)
  (foreach p pts
    (setq v (sag6:dot p u))
    (if (or (null mn) (< v mn)) (setq mn v))
    (if (or (null mx) (> v mx)) (setq mx v))
  )
  (list mn mx)
)

;---------------- Yarim duzlem kirpma ----------------
(defun sag6:line-cut (a b u k / da db den)
  (setq da  (- (sag6:dot a u) k)
        db  (- (sag6:dot b u) k)
        den (- db da)
  )
  (if (< (abs den) sag6:eps)
    b
    (sag6:add a (sag6:mul (sag6:sub b a) (/ (- da) den)))
  )
)

; mode: T = "<= k" (LE), nil = ">= k" (GE)
(defun sag6:inside (p u k le / d)
  (setq d (- (sag6:dot p u) k))
  (if le (<= d sag6:eps) (>= d (- sag6:eps)))
)

(defun sag6:clip-halfplane (poly u k le / out prev pin cin)
  (setq poly (sag6:clean-poly poly))
  (if (>= (length poly) 3)
    (progn
      (setq prev (last poly)
            pin  (sag6:inside prev u k le)
      )
      (foreach cur poly
        (setq cin (sag6:inside cur u k le))
        (cond
          ((and pin cin) (setq out (cons cur out)))
          ((and pin (not cin)) (setq out (cons (sag6:line-cut prev cur u k) out)))
          ((and (not pin) cin)
           (setq out (cons cur (cons (sag6:line-cut prev cur u k) out)))
          )
        )
        (setq prev cur pin cin)
      )
      (sag6:clean-poly (reverse out))
    )
  )
)

(defun sag6:strip (poly u low high / a b)
  (setq a (sag6:clip-halfplane poly u high T))
  (if a (setq b (sag6:clip-halfplane a u low nil)))
  (if (and b (>= (length b) 3) (> (sag6:area b) sag6:eps)) b nil)
)

(defun sag6:find-cut-for-area (poly u low high target / lo hi mid sp ar i)
  (setq lo low hi high i 0)
  (while (< i 80)
    (setq mid (/ (+ lo hi) 2.0)
          sp  (sag6:strip poly u low mid)
          ar  (if sp (sag6:area sp) 0.0)
    )
    (if (< ar target) (setq lo mid) (setq hi mid))
    (setq i (1+ i))
  )
  hi
)

;---------------- Sinir okuma ----------------
; Policizgi (LWPOLYLINE / 2B POLYLINE): koseler birebir alinir, yalnizca yay
; (bulge) kenarlari ~5 derecelik adimlarla bolunur.
(defun sag6:poly-points (e / obj ep i b m k pts res sweep)
  (setq obj (vlax-ename->vla-object e))
  (setq ep (vlax-curve-getEndParam e))
  (setq i 0)
  (while (< i (fix (+ ep 0.5)))
    (setq pts (cons (sag6:pt2 (vlax-curve-getPointAtParam e i)) pts))
    (setq res (vl-catch-all-apply 'vla-GetBulge (list obj i)))
    (setq b (if (vl-catch-all-error-p res) 0.0 res))
    (if (/= b 0.0)
      (progn
        (setq sweep (abs (* 4.0 (atan b))))           ; yay acisi (radyan)
        (setq m (max 4 (fix (+ 1 (/ sweep (/ pi 36.0))))))
        (setq k 1)
        (while (< k m)
          (setq pts (cons (sag6:pt2 (vlax-curve-getPointAtParam e (+ i (/ (float k) m)))) pts))
          (setq k (1+ k))
        )
      )
    )
    (setq i (1+ i))
  )
  (sag6:clean-poly (reverse pts))
)

; Daire / elips / spline ve egri uydurulmus policizgiler: uzunluk boyunca ornekleme
(defun sag6:sample-curve (e / ep len n i p pts res)
  (setq res (vl-catch-all-apply 'vlax-curve-getEndParam (list e)))
  (if (not (vl-catch-all-error-p res))
    (progn
      (setq ep res)
      (setq res (vl-catch-all-apply 'vlax-curve-getDistAtParam (list e ep)))
      (if (not (vl-catch-all-error-p res))
        (progn
          (setq len res n 240 i 0)
          (while (< i n)
            (setq p (vl-catch-all-apply 'vlax-curve-getPointAtDist
                      (list e (* len (/ (float i) (float n))))))
            (if (not (vl-catch-all-error-p p))
              (setq pts (cons (sag6:pt2 p) pts))
            )
            (setq i (1+ i))
          )
          (sag6:clean-poly (reverse pts))
        )
      )
    )
  )
)

(defun sag6:get-boundary-points (e / edata typ res)
  (setq edata (entget e)
        typ   (cdr (assoc 0 edata))
  )
  (cond
    ((= typ "LWPOLYLINE")
     (setq res (vl-catch-all-apply 'sag6:poly-points (list e)))
     (if (vl-catch-all-error-p res) (sag6:sample-curve e) res)
    )
    ((= typ "POLYLINE")
     ; 70 kodu: 2=egri uydurma, 4=spline uydurma -> parametreler koseye denk gelmez
     (if (/= 0 (logand 6 (cdr (assoc 70 edata))))
       (sag6:sample-curve e)
       (progn
         (setq res (vl-catch-all-apply 'sag6:poly-points (list e)))
         (if (vl-catch-all-error-p res) (sag6:sample-curve e) res)
       )
     )
    )
    ((member typ '("CIRCLE" "ELLIPSE" "SPLINE")) (sag6:sample-curve e))
    (T nil)
  )
)

(defun sag6:is-closed (e / res)
  (setq res (vl-catch-all-apply 'vlax-curve-isClosed (list e)))
  (and (not (vl-catch-all-error-p res)) res)
)

;---------------- Cizim nesneleri ----------------
(defun sag6:make-layer (name color)
  (if (not (tblsearch "LAYER" name))
    (entmake
      (list
        (cons 0 "LAYER")
        (cons 100 "AcDbSymbolTableRecord")
        (cons 100 "AcDbLayerTableRecord")
        (cons 2 name)
        (cons 70 0)
        (cons 62 color)
        (cons 6 "Continuous")
      )
    )
  )
)

(defun sag6:make-poly (pts layer color)
  (setq pts (sag6:clean-poly pts))
  (if (>= (length pts) 3)
    (entmakex
      (append
        (list
          (cons 0 "LWPOLYLINE")
          (cons 100 "AcDbEntity")
          (cons 8 layer)
          (cons 62 color)
          (cons 100 "AcDbPolyline")
          (cons 90 (length pts))
          (cons 70 1)
          (cons 43 0.0)
        )
        (mapcar '(lambda (p) (cons 10 p)) pts)
      )
    )
  )
)

(defun sag6:make-hatch (boundary color / doc ms obj hatch arr res scaleVal)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
        ms  (vla-get-ModelSpace doc)
        obj (vlax-ename->vla-object boundary)
  )
  ; 1 = acHatchPatternTypePreDefined
  (setq res (vl-catch-all-apply 'vla-AddHatch (list ms 1 "ANSI31" :vlax-true)))
  (if (not (vl-catch-all-error-p res))
    (progn
      (setq hatch res)
      (vl-catch-all-apply 'vla-put-Layer (list hatch "SAGG-PAY-HATCH"))
      (vl-catch-all-apply 'vla-put-Color (list hatch color))
      (setq scaleVal (vl-catch-all-apply 'getvar (list "HPSCALE")))
      (if (or (vl-catch-all-error-p scaleVal) (not scaleVal) (<= scaleVal 0.0))
        (setq scaleVal 1.0)
      )
      (vl-catch-all-apply 'vla-put-PatternScale (list hatch scaleVal))
      (setq arr (vlax-make-safearray vlax-vbObject '(0 . 0)))
      (vlax-safearray-put-element arr 0 obj)
      (setq res (vl-catch-all-apply 'vla-AppendOuterLoop (list hatch (vlax-make-variant arr))))
      (if (vl-catch-all-error-p res)
        (progn (vl-catch-all-apply 'vla-Delete (list hatch)) nil)
        (progn
          (vl-catch-all-apply 'vla-Evaluate (list hatch))
          (vlax-vla-object->ename hatch)
        )
      )
    )
  )
)

(defun sag6:make-mtext (pt text h layer color)
  (entmakex
    (list
      (cons 0 "MTEXT")
      (cons 100 "AcDbEntity")
      (cons 8 layer)
      (cons 62 color)
      (cons 100 "AcDbMText")
      (cons 10 (sag6:pt3 pt))
      (cons 40 h)
      (cons 41 (* h 20.0))
      (cons 71 5)
      (cons 1 text)
      (cons 7 (getvar "TEXTSTYLE"))
    )
  )
)

(defun sag6:fmt (x p) (rtos x 2 p))
(defun sag6:sqm-label () "m\\U+00B2")
(defun sag6:piece-name (i) (strcat "P-" (if (< i 10) "0" "") (itoa i)))

(defun sag6:edge-list-text (pts unitM / idx txt)
  (setq idx 1 txt "")
  (foreach e (sag6:edges (sag6:clean-poly pts))
    (setq txt (strcat txt (if (= txt "") "" ", ")
                      "K" (itoa idx) "=" (sag6:fmt (* (sag6:dist (car e) (cadr e)) unitM) 2))
          idx (1+ idx)
    )
  )
  txt
)

(defun sag6:add-legend-mtext (pt rows h totalAreaM sumAreaM / txt)
  (setq txt
    (strcat "PARSEL PAYLASIM LEJANTI (ArsaPay)"
            "\\PParca | Alan " (sag6:sqm-label) " | Min kenar m | Renk | Kenarlar m")
  )
  (foreach row rows
    (setq txt (strcat txt "\\P" (nth 0 row) " | " (nth 1 row) " | " (nth 2 row)
                      " | " (nth 3 row) " | " (nth 4 row)))
  )
  (setq txt
    (strcat txt "\\P"
            "\\PParca Alanlari Toplami | " (sag6:fmt sumAreaM 2) " " (sag6:sqm-label)
            "\\PBolunmeden Onceki Parsel Alani | " (sag6:fmt totalAreaM 2) " " (sag6:sqm-label))
  )
  (sag6:make-mtext pt txt h "SAGG-PAY-LEJANT" 7)
)

(defun sag6:add-legend-table (pt rows h totalAreaM sumAreaM / doc ms tab res r rh)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
        ms  (vla-get-ModelSpace doc)
        rh  (* h 2.5)
  )
  ; Kolonlar: Parca, Alan, Min kenar, Renk, Kenarlar
  (setq res (vl-catch-all-apply 'vla-AddTable
              (list ms (vlax-3d-point (sag6:pt3 pt)) (+ 3 (length rows)) 5 rh (* h 15.0))))
  (if (vl-catch-all-error-p res)
    (sag6:add-legend-mtext pt rows h totalAreaM sumAreaM)
    (progn
      (setq tab res)
      (vl-catch-all-apply 'vla-put-Layer (list tab "SAGG-PAY-LEJANT"))
      (vl-catch-all-apply 'vla-SetColumnWidth (list tab 0 (* h 12.0)))
      (vl-catch-all-apply 'vla-SetColumnWidth (list tab 1 (* h 16.0)))
      (vl-catch-all-apply 'vla-SetColumnWidth (list tab 2 (* h 16.0)))
      (vl-catch-all-apply 'vla-SetColumnWidth (list tab 3 (* h 10.0)))
      (vl-catch-all-apply 'vla-SetColumnWidth (list tab 4 (* h 55.0)))
      (vl-catch-all-apply 'vla-SetRowHeight (list tab 0 rh))
      (vla-SetText tab 0 0 "Parca")
      (vla-SetText tab 0 1 (strcat "Alan " (sag6:sqm-label)))
      (vla-SetText tab 0 2 "Min kenar m")
      (vla-SetText tab 0 3 "Renk")
      (vla-SetText tab 0 4 "Kenarlar m")
      (setq r 1)
      (foreach row rows
        (vla-SetText tab r 0 (nth 0 row))
        (vla-SetText tab r 1 (nth 1 row))
        (vla-SetText tab r 2 (nth 2 row))
        (vla-SetText tab r 3 (nth 3 row))
        (vla-SetText tab r 4 (nth 4 row))
        (vl-catch-all-apply 'vla-SetRowHeight (list tab r (* h 3.2)))
        (setq r (1+ r))
      )
      (vla-SetText tab r 0 "Parca Alanlari Toplami")
      (vla-SetText tab r 1 (strcat (sag6:fmt sumAreaM 2) " " (sag6:sqm-label)))
      (vla-SetText tab r 4 "Olusan yeni parsellerin alan toplami")
      (setq r (1+ r))
      (vla-SetText tab r 0 "Bolunmeden Onceki Parsel Alani")
      (vla-SetText tab r 1 (strcat (sag6:fmt totalAreaM 2) " " (sag6:sqm-label)))
      (vla-SetText tab r 4 "Bilgi amaclidir, resmi baglayiciligi yoktur. ArsaPay v1.0 - SAGG")
      tab
    )
  )
)

;---------------- Girdi ----------------
(defun sag6:getreal-default (msg def bits / v)
  (initget bits)
  (setq v (getreal (strcat "\n" msg " <" (sag6:fmt def 4) ">: ")))
  (if v v def)
)

(defun sag6:getint-default (msg def / v)
  (initget 6)                       ; sifir ve negatif kabul edilmez
  (setq v (getint (strcat "\n" msg " <" (itoa def) ">: ")))
  (if v v def)
)

;---------------- Geometri kontrolleri ----------------
(defun sag6:perimeter (pts / s)
  (setq s 0.0)
  (foreach e (sag6:edges (sag6:clean-poly pts))
    (setq s (+ s (sag6:dist (car e) (cadr e))))
  )
  s
)

(defun sag6:min-edge (pts / d mn)
  (foreach e (sag6:edges (sag6:clean-poly pts))
    (setq d (sag6:dist (car e) (cadr e)))
    (if (or (null mn) (< d mn)) (setq mn d))
  )
  (if mn mn 0.0)
)

; Ardisik dogrusal koseleri ve cok kisa kenarlari ayiklar.
(defun sag6:simplify-collinear (pts tol / changed out prevs nexts v1 v2 keep)
  (setq pts (sag6:clean-poly pts) changed T)
  (while changed
    (setq changed nil)
    (if (>= (length pts) 4)
      (progn
        (setq prevs (cons (last pts) (reverse (cdr (reverse pts))))
              nexts (append (cdr pts) (list (car pts)))
              out   nil
        )
        (mapcar
          '(lambda (prev cur nxt)
             (setq v1 (sag6:sub cur prev)
                   v2 (sag6:sub nxt cur)
                   keep (not (< (sag6:dist cur prev) tol))
             )
             (if (and keep
                      (< (abs (sag6:cross2 v1 v2))
                         (* tol (max 1.0 (sag6:len v1)) (max 1.0 (sag6:len v2)))))
               (setq keep nil)
             )
             (if keep (setq out (cons cur out)) (setq changed T))
           )
          prevs pts nexts
        )
        (setq pts (sag6:clean-poly (reverse out)))
      )
    )
  )
  pts
)

(defun sag6:on-seg-p (p a b tol / vap vab vbp)
  (setq vap (sag6:sub p a) vab (sag6:sub b a) vbp (sag6:sub p b))
  (and (<= (abs (sag6:cross2 vap vab)) (* tol (max 1.0 (sag6:len vab))))
       (<= (sag6:dot vap vbp) tol))
)

; Ray casting. Sinir uzerindeyse de T dondurur.
(defun sag6:point-in-poly (p pts / x y inside onb pa pb)
  (setq x (car p) y (cadr p))
  (foreach e (sag6:edges (sag6:clean-poly pts))
    (if (not onb)
      (progn
        (setq pa (car e) pb (cadr e))
        (if (sag6:on-seg-p p pa pb 1.0e-7)
          (setq onb T)
          (if (and (not (eq (> (cadr pa) y) (> (cadr pb) y)))
                   (< x (+ (car pa)
                           (/ (* (- (car pb) (car pa)) (- y (cadr pa)))
                              (- (cadr pb) (cadr pa))))))
            (setq inside (not inside))
          )
        )
      )
    )
  )
  (if (or onb inside) T nil)
)

; Konkav parsellerde kesim sonucu yapay kopru/iki ada olusursa cocuk poligonun
; bazi kenar orta noktalari ana poligon disinda kalir; bu durumda gecersizdir.
(defun sag6:child-inside-parent-p (child parent / ok)
  (setq ok T)
  (foreach e (sag6:edges (sag6:clean-poly child))
    (if (and ok (not (sag6:point-in-poly (sag6:mul (sag6:add (car e) (cadr e)) 0.5) parent)))
      (setq ok nil)
    )
  )
  ok
)

(defun sag6:valid-final-piece-p (piece parent minRaw / simp)
  (setq simp (sag6:simplify-collinear piece 1.0e-7))
  (and (>= (length simp) 4)
       (> (sag6:area simp) 1.0e-6)
       (sag6:child-inside-parent-p simp parent)
       (or (<= minRaw 0.0) (>= (sag6:min-edge simp) (- minRaw 1.0e-7))))
)

(defun sag6:valid-connected-child-p (child parent / simp)
  (setq simp (sag6:simplify-collinear child 1.0e-7))
  (and (>= (length simp) 3)
       (> (sag6:area simp) 1.0e-6)
       (sag6:child-inside-parent-p simp parent))
)

(defun sag6:compactness-score (pts / a p)
  (setq a (sag6:area pts) p (sag6:perimeter pts))
  (if (> a 1.0e-9) (/ (* p p) a) 1.0e99)
)

(defun sag6:candidate-score (piece rest)
  ; 4+ kenar isteniyor; cok kirikli parseller daha dusuk puanli olsun.
  (+ (sag6:compactness-score piece)
     (* 0.35 (sag6:compactness-score rest))
     (* 0.20 (length (sag6:simplify-collinear piece 1.0e-7))))
)

;---------------- Kesim arama ----------------
; Donus: (skor parca kalan) veya nil
(defun sag6:try-cut (parent target u minRaw restWillBeFinal / rng k piece rest)
  (setq rng (sag6:range-dot parent u))
  (if (> (- (cadr rng) (car rng)) sag6:eps)
    (progn
      (setq k     (sag6:find-cut-for-area parent u (car rng) (cadr rng) target)
            piece (sag6:clip-halfplane parent u k T)
            rest  (sag6:clip-halfplane parent u k nil)
      )
      (if (and piece rest
               (sag6:valid-final-piece-p piece parent minRaw)
               (sag6:valid-connected-child-p rest parent)
               (or (not restWillBeFinal) (sag6:valid-final-piece-p rest parent minRaw)))
        (list (sag6:candidate-score piece rest) piece rest)
      )
    )
  )
)

(defun sag6:best-cut (parent target minRaw stepDeg restWillBeFinal / deg ang cand best)
  (setq deg 0.0)
  (while (< deg 360.0)
    (setq ang  (* pi (/ deg 180.0))
          cand (sag6:try-cut parent target (list (cos ang) (sin ang)) minRaw restWillBeFinal)
    )
    (if (and cand (or (null best) (< (car cand) (car best))))
      (setq best cand)
    )
    (setq deg (+ deg stepDeg))
  )
  best
)

; ufix nil -> her parca icin otomatik acisal arama
; ufix (ux uy) -> tum kesimler bu normale gore (referans cizgisine dik)
(defun sag6:generate-pieces (poly n minRaw stepDeg ufix / target remain pieces i cand ok)
  (setq target (/ (sag6:area poly) n)
        remain (sag6:clean-poly poly)
        i 1
        ok T
  )
  (while (and ok (< i n))
    (princ (strcat "\rArsaPay: " (itoa i) ". kesim araniyor (" (itoa n) " parca)...   "))
    (setq cand
      (if ufix
        (sag6:try-cut remain target ufix minRaw (= i (1- n)))
        (sag6:best-cut remain target minRaw stepDeg (= i (1- n)))
      )
    )
    (if cand
      (setq pieces (cons (cadr cand) pieces) remain (caddr cand))
      (setq ok nil)
    )
    (setq i (1+ i))
  )
  (princ "\r                                                        ")
  (if (and ok (sag6:valid-final-piece-p remain remain minRaw))
    (reverse (cons remain pieces))
  )
)

;---------------- Ana akis ----------------
(defun sag6:fail (msg)
  (alert msg)
  nil
)

(defun sag6:run (useRef / *error* oldcmdecho doc undoOpen e entData objType pts n unitM
                         minM minRaw stepDeg total pieces rng textH h rows created i
                         color name areaM b sp sumAreaM totalAreaM legpt p1 p2 ufix t0)

  (defun *error* (msg)
    (if undoOpen (vl-catch-all-apply 'vla-EndUndoMark (list doc)))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*QUIT*,*BREAK*,*EXIT*")))
      (princ (strcat "\nArsaPay hata: " msg))
    )
    (princ)
  )

  (setq oldcmdecho (getvar "CMDECHO"))
  (setvar "CMDECHO" 0)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))

  (princ (strcat "\nArsaPay v" sag6:version " - Esit alanli parsel bolme (SAGG)"))
  (if useRef
    (princ "\nMod: kesimler referans cizgisine dik (her parca referans boyunca cephe alir).")
    (princ "\nMod: her parca icin otomatik acisal kesim aranir (en kompakt parca).")
  )

  (setq e (car (entsel "\nKapali parsel sinirini secin: ")))
  (cond
    ((null e) (princ "\nSecim yapilmadi."))
    ((not (member (setq objType (cdr (assoc 0 (setq entData (entget e)))))
                  '("LWPOLYLINE" "POLYLINE" "CIRCLE" "ELLIPSE" "SPLINE")))
     (sag6:fail "Secilen obje desteklenmiyor. Lutfen kapali LWPOLYLINE kullanin. Gerekirse BOUNDARY komutu ile sinir olusturun.")
    )
    ((not (sag6:is-closed e))
     (sag6:fail "Secilen obje kapali degil. PEDIT > Close veya BOUNDARY ile kapali policizgi olusturun.")
    )
    ((progn
       (setq pts (sag6:get-boundary-points e))
       (or (null pts) (< (length pts) 3) (< (sag6:area pts) 1.0e-6))
     )
     (sag6:fail "Parsel siniri okunamadi. En guvenli format: kapali LWPOLYLINE.")
    )
    ((< (setq n (sag6:getint-default "Kac esit alanli parcaya bolunsun" sag6:last-n)) 2)
     (sag6:fail "Parca sayisi en az 2 olmali.")
    )
    (T
     (setq unitM (sag6:getreal-default "1 cizim birimi kac metre? Metre=1, cm=0.01, mm=0.001"
                                       sag6:last-unit 6))
     (setq minM (sag6:getreal-default "Yeni parsellerde minimum kenar kac metre olsun? 0=kontrol yok"
                                      sag6:last-min 4))
     (setq minRaw (if (> minM 0.0) (/ minM unitM) 0.0))
     (if useRef
       (progn
         (setq stepDeg sag6:last-step)
         (setq p1 (getpoint "\nReferans cizgisinin (or. yol cephesi) ilk noktasi: "))
         (if p1 (setq p2 (getpoint p1 "\nReferans cizgisinin ikinci noktasi: ")))
         (if (and p1 p2)
           (setq ufix (sag6:unit (sag6:sub (sag6:pt2 (trans p2 1 0)) (sag6:pt2 (trans p1 1 0)))))
         )
       )
       (progn
         (setq stepDeg (sag6:getreal-default
                         "Acisal arama hassasiyeti (derece)? Kucuk deger daha yavas ama daha iyi sonuc verir"
                         sag6:last-step 6))
         (if (> stepDeg 45.0) (setq stepDeg 5.0))
       )
     )
     (setq sag6:last-n n sag6:last-unit unitM sag6:last-min minM sag6:last-step stepDeg)

     (cond
       ((and useRef (null ufix))
        (sag6:fail "Referans cizgisi alinamadi (iki farkli nokta gerekli).")
       )
       (T
        (setq total (sag6:area pts))
        (princ (strcat "\nToplam alan: " (sag6:fmt (* total unitM unitM) 2) " m2 | Hedef parca: "
                       (sag6:fmt (* (/ total n) unitM unitM) 2) " m2"))
        (setq t0 (getvar "MILLISECS"))
        (setq pieces (sag6:generate-pieces pts n minRaw stepDeg ufix))
        (if (null pieces)
          (sag6:fail
            (strcat
              (if useRef
                "Referans cizgisine dik kesimlerle guvenli bolme bulunamadi.\n\n"
                "Bu geometri ve kriterlerle guvenli bolme bulunamadi.\n\n")
              "Sebep genellikle sunlardan biridir:\n"
              "- Parsel cok girintili/cikintili ve esit alan parcasi tek parca kalmiyor.\n"
              "- Minimum kenar sarti bu parca sayisi icin cok buyuk.\n"
              "- Parca sayisi fazla.\n\n"
              "Oneri:\n"
              "- Minimum kenar degerini dusurun,\n"
              "- Parca sayisini azaltin,\n"
              (if useRef
                "- Referans cizgisini farkli cizin veya ARSAPAY (otomatik) komutunu deneyin."
                "- Arama hassasiyetini 2 veya 3 derece yaparak tekrar deneyin.")
            )
          )
          (progn
            (princ (strcat "\nHesap suresi: " (sag6:fmt (/ (- (getvar "MILLISECS") t0) 1000.0) 1) " sn"))
            (vla-StartUndoMark doc)
            (setq undoOpen T)
            (sag6:make-layer "SAGG-PAY-SINIR" 7)
            (sag6:make-layer "SAGG-PAY-HATCH" 8)
            (sag6:make-layer "SAGG-PAY-YAZI" 7)
            (sag6:make-layer "SAGG-PAY-LEJANT" 7)

            (setq rng (sag6:range-dot pts '(1.0 0.0)))
            (setq textH (max 1.0 (/ (max 1.0 (- (cadr rng) (car rng))) 45.0)))
            (initget 6)
            (setq h (getreal (strcat "\nYazi yuksekligi (cizim birimi) <" (sag6:fmt textH 2) ">: ")))
            (if h (setq textH h))

            (setq created 0 i 1 sumAreaM 0.0)
            (foreach sp pieces
              (setq sp    (sag6:simplify-collinear sp 1.0e-7)
                    color (nth (rem (1- i) (length sag6:colors)) sag6:colors)
                    name  (sag6:piece-name i)
                    areaM (* (sag6:area sp) unitM unitM)
                    sumAreaM (+ sumAreaM areaM)
              )
              (setq b (sag6:make-poly sp "SAGG-PAY-SINIR" color))
              (if b
                (progn
                  (sag6:make-hatch b color)
                  (sag6:make-mtext (sag6:centroid sp)
                                   (strcat name "\\P" (sag6:fmt areaM 2) " " (sag6:sqm-label))
                                   textH "SAGG-PAY-YAZI" 7)
                  (setq created (1+ created))
                )
              )
              (setq rows (cons (list name
                                     (sag6:fmt areaM 2)
                                     (sag6:fmt (* (sag6:min-edge sp) unitM) 2)
                                     (itoa color)
                                     (sag6:edge-list-text sp unitM))
                               rows))
              (setq i (1+ i))
            )
            (setq rows (reverse rows))
            (setq totalAreaM (* total unitM unitM))

            (setq legpt (getpoint "\nLejant tablosu yerlesim noktasi <atla>: "))
            (if legpt
              (sag6:add-legend-table (sag6:pt2 (trans legpt 1 0)) rows textH totalAreaM sumAreaM)
            )

            (vla-EndUndoMark doc)
            (setq undoOpen nil)
            (princ
              (strcat
                "\nArsaPay tamamlandi. Olusan parca: " (itoa created)
                " | Toplam alan: " (sag6:fmt totalAreaM 2) " m2"
                " | Hedef parca alani: " (sag6:fmt (/ totalAreaM n) 2) " m2"
              )
            )
          )
        )
       )
     )
    )
  )
  (setvar "CMDECHO" oldcmdecho)
  (princ)
)

;---------------- Komutlar ----------------
(defun c:ARSAPAY () (sag6:run nil))
(defun c:ARSAPAYREF () (sag6:run T))
(defun c:ARSAPAY5 () (sag6:run nil))          ; eski komut adi

(defun c:ARSAPAYWEB (/ sh res)
  (setq sh (vl-catch-all-apply 'vlax-create-object (list "Shell.Application")))
  (if (and sh (not (vl-catch-all-error-p sh)))
    (progn
      (setq res (vl-catch-all-apply 'vlax-invoke-method (list sh 'ShellExecute sag6:web-url)))
      (vlax-release-object sh)
      (if (vl-catch-all-error-p res) (command "_.BROWSER" sag6:web-url))
    )
    (command "_.BROWSER" sag6:web-url)
  )
  (princ)
)

(defun c:ARSAPAYBILGI ()
  (alert
    (strcat
      "ArsaPay v" sag6:version " - Esit alanli parsel bolme\n\n"
      "Komutlar:\n"
      "  ARSAPAY        Otomatik acisal arama ile bol\n"
      "  ARSAPAYREF     Referans cizgisine dik kesimlerle bol\n"
      "  ARSAPAYWEB     Ruhsat360 panelini ac (TKGM parsel sorgu)\n"
      "  ARSAPAYSERIT   Serit sekmesini yeniden olustur\n\n"
      "Bilgilendirme: Parsel verileri TKGM Parsel Sorgu sisteminden alinmakta olup, "
      "kesin imar bilgisi icin islem yapacaginiz belediye ve ilgili birimlere "
      "basvurmaniz gerekmektedir. Buradan edindiginiz bilgilerin resmi bir "
      "baglayiciligi bulunmamaktadir.\n\n"
      "ArsaPay v1.0 uygulamasi SAGG markasina ait olup, tum haklari saklidir. 2026."
    )
  )
  (princ)
)

(princ "\nArsaPay v1.0 yuklendi. Komutlar: ARSAPAY, ARSAPAYREF, ARSAPAYWEB, ARSAPAYBILGI")
(princ)
