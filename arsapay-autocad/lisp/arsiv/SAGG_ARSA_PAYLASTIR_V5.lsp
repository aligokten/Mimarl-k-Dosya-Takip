;============================================================
; SAGG_ARSA_PAYLASTIR_V5.lsp
; Komut: ARSAPAY5
;
; Amac:
; Kapali bir arsa sinirini secilen dogrultuda esit ALANLI parcalara boler.
; Her parca icin:
; - Yeni kapali parca siniri olusturur
; - Farkli renkte ANSI31 hatch/tarama atar
; - Parca adini ve m² alanini icine yazar
; - Lejant tablosu olusturur
;
; Onemli:
; - En iyi sonuc icin kapali LWPOLYLINE kullanin.
; - Duzgun, dikdortgen, yamuk ve konveks parseller icin tasarlanmistir.
; - Cok girintili/cikintili konkav geometrilerde parca sinirlari beklenenden farkli olabilir.
; - Orijinal arsa sinirini degistirmez; yeni parca sinirlari olusturur.
;
; Yazar: ChatGPT - SAGG icin revize V5
;============================================================

(vl-load-com)

(setq sag5:eps 1.0e-8)
(setq sag5:version "V5")
(setq sag5:colors '(1 2 3 4 5 6 30 40 50 70 90 130 150 170 200 220 240))

(defun sag5:pt2 (p) (list (float (car p)) (float (cadr p))))
(defun sag5:pt3 (p) (list (float (car p)) (float (cadr p)) 0.0))
(defun sag5:add (a b) (list (+ (car a) (car b)) (+ (cadr a) (cadr b))))
(defun sag5:sub (a b) (list (- (car a) (car b)) (- (cadr a) (cadr b))))
(defun sag5:mul (a s) (list (* (car a) s) (* (cadr a) s)))
(defun sag5:dot (a b) (+ (* (car a) (car b)) (* (cadr a) (cadr b))))
(defun sag5:len (v) (sqrt (+ (* (car v) (car v)) (* (cadr v) (cadr v)))))
(defun sag5:dist (a b) (sag5:len (sag5:sub a b)))
(defun sag5:last (lst) (car (reverse lst)))

(defun sag5:unit (v / l)
  (setq l (sag5:len v))
  (if (> l sag5:eps)
    (list (/ (car v) l) (/ (cadr v) l))
    nil
  )
)

(defun sag5:clean-poly (pts / out p)
  (setq out nil)
  (foreach p pts
    (if (or (null out) (> (sag5:dist p (car out)) 1.0e-7))
      (setq out (cons p out))
    )
  )
  (setq out (reverse out))
  (if (and (> (length out) 1) (< (sag5:dist (car out) (sag5:last out)) 1.0e-7))
    (setq out (reverse (cdr (reverse out))))
  )
  out
)

(defun sag5:signed-area (pts / n i p q s)
  (setq n (length pts) i 0 s 0.0)
  (if (< n 3)
    0.0
    (progn
      (while (< i n)
        (setq p (nth i pts))
        (setq q (nth (rem (1+ i) n) pts))
        (setq s (+ s (- (* (car p) (cadr q)) (* (cadr p) (car q)))))
        (setq i (1+ i))
      )
      (/ s 2.0)
    )
  )
)

(defun sag5:area (pts)
  (abs (sag5:signed-area pts))
)

(defun sag5:centroid (pts / n i p q cross a cx cy)
  (setq n (length pts) i 0 a 0.0 cx 0.0 cy 0.0)
  (if (< n 3)
    (if pts (car pts) '(0.0 0.0))
    (progn
      (while (< i n)
        (setq p (nth i pts))
        (setq q (nth (rem (1+ i) n) pts))
        (setq cross (- (* (car p) (cadr q)) (* (cadr p) (car q))))
        (setq a (+ a cross))
        (setq cx (+ cx (* (+ (car p) (car q)) cross)))
        (setq cy (+ cy (* (+ (cadr p) (cadr q)) cross)))
        (setq i (1+ i))
      )
      (if (< (abs a) sag5:eps)
        (car pts)
        (list (/ cx (* 3.0 a)) (/ cy (* 3.0 a)))
      )
    )
  )
)

(defun sag5:range-dot (pts u / mn mx v)
  (setq mn nil mx nil)
  (foreach p pts
    (setq v (sag5:dot p u))
    (if (or (null mn) (< v mn)) (setq mn v))
    (if (or (null mx) (> v mx)) (setq mx v))
  )
  (list mn mx)
)

(defun sag5:line-cut (a b u k / da db den oran)
  (setq da (- (sag5:dot a u) k))
  (setq db (- (sag5:dot b u) k))
  (setq den (- db da))
  (if (< (abs den) sag5:eps)
    b
    (progn
      (setq oran (/ (- da) den))
      (sag5:add a (sag5:mul (sag5:sub b a) oran))
    )
  )
)

(defun sag5:inside (p u k mode / d)
  (setq d (- (sag5:dot p u) k))
  (if (= mode 'LE)
    (<= d sag5:eps)
    (>= d (- sag5:eps))
  )
)

(defun sag5:clip-halfplane (poly u k mode / out prev cur pin cin inter)
  (setq poly (sag5:clean-poly poly))
  (if (< (length poly) 3)
    nil
    (progn
      (setq out nil)
      (setq prev (sag5:last poly))
      (setq pin (sag5:inside prev u k mode))
      (foreach cur poly
        (setq cin (sag5:inside cur u k mode))
        (cond
          ((and pin cin)
            (setq out (cons cur out))
          )
          ((and pin (not cin))
            (setq inter (sag5:line-cut prev cur u k))
            (setq out (cons inter out))
          )
          ((and (not pin) cin)
            (setq inter (sag5:line-cut prev cur u k))
            (setq out (cons cur (cons inter out)))
          )
        )
        (setq prev cur)
        (setq pin cin)
      )
      (sag5:clean-poly (reverse out))
    )
  )
)

(defun sag5:strip (poly u low high / a b)
  (setq a (sag5:clip-halfplane poly u high 'LE))
  (if a
    (progn
      (setq b (sag5:clip-halfplane a u low 'GE))
      (if (and b (>= (length b) 3) (> (sag5:area b) sag5:eps)) b nil)
    )
    nil
  )
)

(defun sag5:find-cut-for-area (poly u low high target / lo hi mid sp ar i)
  (setq lo low hi high i 0)
  (while (< i 80)
    (setq mid (/ (+ lo hi) 2.0))
    (setq sp (sag5:strip poly u low mid))
    (setq ar (if sp (sag5:area sp) 0.0))
    (if (< ar target)
      (setq lo mid)
      (setq hi mid)
    )
    (setq i (1+ i))
  )
  hi
)

(defun sag5:lwpoly-has-bulge (edata / item has)
  (setq has nil)
  (foreach item edata
    (if (and (= (car item) 42) (/= (abs (cdr item)) 0.0))
      (setq has T)
    )
  )
  has
)

(defun sag5:lwpoly-vertices (edata / pts item)
  (setq pts nil)
  (foreach item edata
    (if (= (car item) 10)
      (setq pts (cons (sag5:pt2 (cdr item)) pts))
    )
  )
  (sag5:clean-poly (reverse pts))
)

(defun sag5:sample-curve (e / ep len n i p pts res)
  (setq res (vl-catch-all-apply 'vlax-curve-getEndParam (list e)))
  (if (vl-catch-all-error-p res)
    nil
    (progn
      (setq ep res)
      (setq res (vl-catch-all-apply 'vlax-curve-getDistAtParam (list e ep)))
      (if (vl-catch-all-error-p res)
        nil
        (progn
          (setq len res)
          (setq n 800)
          (setq i 0 pts nil)
          (while (< i n)
            (setq p (vl-catch-all-apply 'vlax-curve-getPointAtDist (list e (* len (/ (float i) (float n))))))
            (if (not (vl-catch-all-error-p p))
              (setq pts (cons (sag5:pt2 p) pts))
            )
            (setq i (1+ i))
          )
          (sag5:clean-poly (reverse pts))
        )
      )
    )
  )
)

(defun sag5:get-boundary-points (e / edata typ pts)
  (setq edata (entget e))
  (setq typ (cdr (assoc 0 edata)))
  (cond
    ((= typ "LWPOLYLINE")
      (if (sag5:lwpoly-has-bulge edata)
        (sag5:sample-curve e)
        (sag5:lwpoly-vertices edata)
      )
    )
    ((or (= typ "POLYLINE") (= typ "CIRCLE") (= typ "ELLIPSE") (= typ "SPLINE"))
      (sag5:sample-curve e)
    )
    (T nil)
  )
)

(defun sag5:is-closed (e / res)
  (setq res (vl-catch-all-apply 'vlax-curve-isClosed (list e)))
  (and (not (vl-catch-all-error-p res)) res)
)

(defun sag5:make-layer (name color /)
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

(defun sag5:make-poly (pts layer color / data p e)
  (setq pts (sag5:clean-poly pts))
  (if (< (length pts) 3)
    nil
    (progn
      (setq data
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
      )
      (foreach p pts
        (setq data (append data (list (cons 10 p))))
      )
      (setq e (entmakex data))
      e
    )
  )
)

(defun sag5:make-hatch (boundary color / doc ms obj hatch arr res scaleVal)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq ms (vla-get-ModelSpace doc))
  (setq obj (vlax-ename->vla-object boundary))

  ; ANSI31 icin predefined hatch pattern kullanilir.
  ; 1 = acHatchPatternTypePreDefined
  (setq res (vl-catch-all-apply 'vla-AddHatch (list ms 1 "ANSI31" :vlax-true)))
  (if (vl-catch-all-error-p res)
    nil
    (progn
      (setq hatch res)
      (vl-catch-all-apply 'vla-put-Layer (list hatch "SAGG-PAY-HATCH"))
      (vl-catch-all-apply 'vla-put-Color (list hatch color))

      ; Mevcut HPSCALE degeri korunur. Deger okunamazsa 1.0 kullanilir.
      (setq scaleVal (vl-catch-all-apply 'getvar (list "HPSCALE")))
      (if (or (vl-catch-all-error-p scaleVal) (not scaleVal) (<= scaleVal 0.0))
        (setq scaleVal 1.0)
      )
      (vl-catch-all-apply 'vla-put-PatternScale (list hatch scaleVal))

      (setq arr (vlax-make-safearray vlax-vbObject '(0 . 0)))
      (vlax-safearray-put-element arr 0 obj)
      (setq res (vl-catch-all-apply 'vla-AppendOuterLoop (list hatch (vlax-make-variant arr))))
      (if (vl-catch-all-error-p res)
        nil
        (progn
          (vl-catch-all-apply 'vla-Evaluate (list hatch))
          (vlax-vla-object->ename hatch)
        )
      )
    )
  )
)

(defun sag5:make-mtext (pt text h layer color / w)
  (setq w (* h 20.0))
  (entmakex
    (list
      (cons 0 "MTEXT")
      (cons 100 "AcDbEntity")
      (cons 8 layer)
      (cons 62 color)
      (cons 100 "AcDbMText")
      (cons 10 (sag5:pt3 pt))
      (cons 40 h)
      (cons 41 w)
      (cons 71 5)
      (cons 1 text)
      (cons 7 (getvar "TEXTSTYLE"))
    )
  )
)

(defun sag5:fmt (x p)
  (rtos x 2 p)
)

(defun sag5:sqm-label ()
  "m\\U+00B2"
)

(defun sag5:edge-lengths (pts unitM / n i p q out)
  (setq pts (sag5:clean-poly pts))
  (setq n (length pts) i 0 out nil)
  (while (< i n)
    (setq p (nth i pts))
    (setq q (nth (rem (1+ i) n) pts))
    (setq out (append out (list (* (sag5:dist p q) unitM))))
    (setq i (1+ i))
  )
  out
)

(defun sag5:edge-list-text (pts unitM / lens idx txt lenVal)
  (setq lens (sag5:edge-lengths pts unitM))
  (setq idx 1 txt "")
  (foreach lenVal lens
    (if (= txt "")
      (setq txt (strcat "K" (itoa idx) "=" (sag5:fmt lenVal 2)))
      (setq txt (strcat txt ", K" (itoa idx) "=" (sag5:fmt lenVal 2)))
    )
    (setq idx (1+ idx))
  )
  txt
)

(defun sag5:piece-name (i)
  (strcat "P-" (if (< i 10) "0" "") (itoa i))
)

(defun sag5:add-legend-mtext (pt rows h totalAreaM sumAreaM / txt row)
  (setq txt
    (strcat
      "PARSEL PAYLASIM LEJANTI"
      "\\PParca | Alan " (sag5:sqm-label) " | Genislik m | Renk | Kenarlar m"
    )
  )
  (foreach row rows
    (if (= (nth 4 row) "PARCA")
      (setq txt (strcat txt "\\P" (nth 0 row) " | " (nth 1 row) " | " (nth 2 row) " | " (nth 3 row) " | " (nth 5 row)))
    )
  )
  (setq txt
    (strcat
      txt
      "\\P"
      "\\PParca Alanlari Toplami | " (sag5:fmt sumAreaM 2) " " (sag5:sqm-label)
      "\\PBolunmeden Onceki Parsel Alani | " (sag5:fmt totalAreaM 2) " " (sag5:sqm-label)
    )
  )
  (sag5:make-mtext pt txt h "SAGG-PAY-LEJANT" 7)
)

(defun sag5:add-legend-table (pt rows h totalAreaM sumAreaM / doc ms tab res r row rh cw rowCount)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq ms (vla-get-ModelSpace doc))
  (setq rh (* h 2.5))
  (setq cw (* h 15.0))
  (setq rowCount (+ 3 (length rows)))
  ; Kolonlar: Parca, Alan, Genislik, Renk, Kenarlar
  (setq res (vl-catch-all-apply 'vla-AddTable (list ms (vlax-3d-point (sag5:pt3 pt)) rowCount 5 rh cw)))
  (if (vl-catch-all-error-p res)
    (sag5:add-legend-mtext pt rows h totalAreaM sumAreaM)
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
      (vla-SetText tab 0 1 (strcat "Alan " (sag5:sqm-label)))
      (vla-SetText tab 0 2 "Min kenar m")
      (vla-SetText tab 0 3 "Renk")
      (vla-SetText tab 0 4 "Kenarlar m")
      (setq r 1)
      (foreach row rows
        (vla-SetText tab r 0 (nth 0 row))
        (vla-SetText tab r 1 (nth 1 row))
        (vla-SetText tab r 2 (nth 2 row))
        (vla-SetText tab r 3 (nth 3 row))
        (vla-SetText tab r 4 (nth 5 row))
        (vl-catch-all-apply 'vla-SetRowHeight (list tab r (* h 3.2)))
        (setq r (1+ r))
      )
      (vla-SetText tab r 0 "Parca Alanlari Toplami")
      (vla-SetText tab r 1 (strcat (sag5:fmt sumAreaM 2) " " (sag5:sqm-label)))
      (vla-SetText tab r 4 "Olusan yeni parsellerin alan toplami")
      (setq r (1+ r))
      (vla-SetText tab r 0 "Bolunmeden Onceki Parsel Alani")
      (vla-SetText tab r 1 (strcat (sag5:fmt totalAreaM 2) " " (sag5:sqm-label)))
      (vla-SetText tab r 4 "Secilen ana parselin bolme oncesi alani")
      tab
    )
  )
)

(defun sag5:getreal-default (msg def / v)
  (setq v (getreal (strcat msg " <" (sag5:fmt def 4) ">: ")))
  (if v v def)
)

(defun sag5:getint-default (msg def / v)
  (setq v (getint (strcat msg " <" (itoa def) ">: ")))
  (if v v def)
)



;---------------- V5 Geometri Kontrol Fonksiyonlari ----------------
(defun sag5:cross2 (a b)
  (- (* (car a) (cadr b)) (* (cadr a) (car b)))
)

(defun sag5:perimeter (pts / n i p q s)
  (setq pts (sag5:clean-poly pts))
  (setq n (length pts) i 0 s 0.0)
  (while (< i n)
    (setq p (nth i pts))
    (setq q (nth (rem (1+ i) n) pts))
    (setq s (+ s (sag5:dist p q)))
    (setq i (1+ i))
  )
  s
)

(defun sag5:min-edge (pts / n i p q d mn)
  (setq pts (sag5:clean-poly pts))
  (setq n (length pts) i 0 mn nil)
  (while (< i n)
    (setq p (nth i pts))
    (setq q (nth (rem (1+ i) n) pts))
    (setq d (sag5:dist p q))
    (if (or (null mn) (< d mn)) (setq mn d))
    (setq i (1+ i))
  )
  (if mn mn 0.0)
)

(defun sag5:simplify-collinear (pts tol / changed out n i prev cur nxt v1 v2 keep)
  (setq pts (sag5:clean-poly pts))
  (setq changed T)
  (while changed
    (setq changed nil)
    (setq out nil n (length pts) i 0)
    (if (< n 4)
      (setq out pts)
      (progn
        (while (< i n)
          (setq prev (nth (rem (+ i n -1) n) pts))
          (setq cur  (nth i pts))
          (setq nxt  (nth (rem (1+ i) n) pts))
          (setq v1 (sag5:sub cur prev))
          (setq v2 (sag5:sub nxt cur))
          (setq keep T)
          (if (< (sag5:dist cur prev) tol)
            (setq keep nil)
          )
          (if (and keep (< (abs (sag5:cross2 v1 v2)) (* tol (max 1.0 (sag5:len v1)) (max 1.0 (sag5:len v2)))))
            (setq keep nil)
          )
          (if keep
            (setq out (append out (list cur)))
            (setq changed T)
          )
          (setq i (1+ i))
        )
      )
    )
    (setq pts (sag5:clean-poly out))
  )
  pts
)

(defun sag5:on-seg-p (p a b tol / ap ab bp cross dotv)
  (setq ap (sag5:sub p a))
  (setq ab (sag5:sub b a))
  (setq bp (sag5:sub p b))
  (setq cross (abs (sag5:cross2 ap ab)))
  (setq dotv (sag5:dot ap bp))
  (and (<= cross (* tol (max 1.0 (sag5:len ab)))) (<= dotv tol))
)

(defun sag5:point-in-poly (p pts / n i j pi pj xi yi xj yj x y inside)
  ; Ray casting. Sınır üzerindeyse de T döndürür.
  (setq pts (sag5:clean-poly pts))
  (setq n (length pts) i 0 inside nil x (car p) y (cadr p))
  (while (< i n)
    (setq j (rem (1+ i) n))
    (setq pi (nth i pts))
    (setq pj (nth j pts))
    (if (sag5:on-seg-p p pi pj 1.0e-7)
      (setq inside T i n)
      (progn
        (setq xi (car pi) yi (cadr pi) xj (car pj) yj (cadr pj))
        (if (and (/= (> yi y) (> yj y))
                 (< x (+ xi (/ (* (- xj xi) (- y yi)) (- yj yi)))))
          (setq inside (not inside))
        )
      )
    )
    (setq i (1+ i))
  )
  inside
)

(defun sag5:child-inside-parent-p (child parent / n i p q mid ok)
  ; Konkav parsellerde kesim sonucu yapay köprü/iki ada oluşursa,
  ; çocuk poligonun bazı kenar orta noktaları ana poligon dışında kalır. Bu durumda geçersiz sayılır.
  (setq child (sag5:clean-poly child))
  (setq n (length child) i 0 ok T)
  (while (and ok (< i n))
    (setq p (nth i child))
    (setq q (nth (rem (1+ i) n) child))
    (setq mid (sag5:mul (sag5:add p q) 0.5))
    (if (not (sag5:point-in-poly mid parent))
      (setq ok nil)
    )
    (setq i (1+ i))
  )
  ok
)

(defun sag5:valid-final-piece-p (piece parent minRaw / simp area mn)
  (setq piece (sag5:clean-poly piece))
  (setq simp (sag5:simplify-collinear piece 1.0e-7))
  (setq area (sag5:area simp))
  (setq mn (sag5:min-edge simp))
  (and
    (>= (length simp) 4)
    (> area 1.0e-6)
    (sag5:child-inside-parent-p simp parent)
    (or (<= minRaw 0.0) (>= mn (- minRaw 1.0e-7)))
  )
)

(defun sag5:valid-connected-child-p (child parent / simp)
  (setq child (sag5:clean-poly child))
  (setq simp (sag5:simplify-collinear child 1.0e-7))
  (and
    (>= (length simp) 3)
    (> (sag5:area simp) 1.0e-6)
    (sag5:child-inside-parent-p simp parent)
  )
)

(defun sag5:compactness-score (pts / a p)
  (setq a (sag5:area pts))
  (setq p (sag5:perimeter pts))
  (if (> a 1.0e-9)
    (/ (* p p) a)
    1.0e99
  )
)

(defun sag5:candidate-score (piece rest / sc)
  (setq sc (+ (sag5:compactness-score piece) (* 0.35 (sag5:compactness-score rest))))
  ; 4+ kenar isteniyor; cok kirikli parseller daha dusuk puanli olsun.
  (setq sc (+ sc (* 0.20 (length (sag5:simplify-collinear piece 1.0e-7)))))
  sc
)

(defun sag5:try-cut (parent target u minRaw restWillBeFinal / rng minK maxK k piece rest sc)
  (setq rng (sag5:range-dot parent u))
  (setq minK (car rng))
  (setq maxK (cadr rng))
  (if (<= (- maxK minK) sag5:eps)
    nil
    (progn
      (setq k (sag5:find-cut-for-area parent u minK maxK target))
      (setq piece (sag5:clip-halfplane parent u k 'LE))
      (setq rest  (sag5:clip-halfplane parent u k 'GE))
      (if (and piece rest
               (sag5:valid-final-piece-p piece parent minRaw)
               (sag5:valid-connected-child-p rest parent)
               (if restWillBeFinal (sag5:valid-final-piece-p rest parent minRaw) T))
        (progn
          (setq sc (sag5:candidate-score piece rest))
          (list sc piece rest u k)
        )
        nil
      )
    )
  )
)

(defun sag5:best-cut (parent target minRaw stepDeg restWillBeFinal / deg ang u cand best)
  (setq deg 0.0 best nil)
  (while (< deg 360.0)
    (setq ang (* pi (/ deg 180.0)))
    (setq u (list (cos ang) (sin ang)))
    (setq cand (sag5:try-cut parent target u minRaw restWillBeFinal))
    (if (and cand (or (null best) (< (car cand) (car best))))
      (setq best cand)
    )
    (setq deg (+ deg stepDeg))
  )
  best
)

(defun sag5:generate-pieces-auto (poly n minRaw stepDeg / total target remain pieces i cand ok restFinal)
  (setq total (sag5:area poly))
  (setq target (/ total n))
  (setq remain (sag5:clean-poly poly))
  (setq pieces nil i 1 ok T)
  (while (and ok (< i n))
    (setq restFinal (= i (1- n)))
    (setq cand (sag5:best-cut remain target minRaw stepDeg restFinal))
    (if cand
      (progn
        (setq pieces (append pieces (list (cadr cand))))
        (setq remain (caddr cand))
      )
      (setq ok nil)
    )
    (setq i (1+ i))
  )
  (if (and ok (sag5:valid-final-piece-p remain remain minRaw))
    (append pieces (list remain))
    nil
  )
)


(defun c:ARSAPAY5 (/ *error* oldcmdecho doc e pts n unitM minM minRaw stepDeg total pieces
                    rng minK maxK h textH color name areaM b cen rows legpt created entData objType
                    edgeText sumAreaM totalAreaM i sp msg)

  (defun *error* (msg)
    (if doc (vl-catch-all-apply 'vla-EndUndoMark (list doc)))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*QUIT*,*BREAK*")))
      (princ (strcat "\nHata: " msg))
    )
    (princ)
  )

  (setq oldcmdecho (getvar "CMDECHO"))
  (setvar "CMDECHO" 0)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)

  (sag5:make-layer "SAGG-PAY-SINIR" 7)
  (sag5:make-layer "SAGG-PAY-HATCH" 8)
  (sag5:make-layer "SAGG-PAY-YAZI" 7)
  (sag5:make-layer "SAGG-PAY-LEJANT" 7)

  (princ "\nARSAPAY5 basladi.")
  (princ "\nV5: Sabit dik serit yerine her parca icin otomatik acisal kesim arar.")
  (princ "\nAmac: esit alan + tek parca + en az 4 kenar + minimum kenar kontrolu.")

  (setq e (car (entsel "\nKapali parsel sinirini secin: ")))
  (if (null e)
    (progn (alert "Secim yapilmadi.") (*error* "CANCEL") (exit))
  )

  (setq entData (entget e))
  (setq objType (cdr (assoc 0 entData)))
  (if (not (member objType '("LWPOLYLINE" "POLYLINE" "CIRCLE" "ELLIPSE" "SPLINE")))
    (progn
      (alert "Secilen obje desteklenmiyor. Lutfen kapali LWPOLYLINE kullanin. Gerekirse BOUNDARY komutu ile sinir olusturun.")
      (*error* "CANCEL")
      (exit)
    )
  )

  (if (not (sag5:is-closed e))
    (progn
      (alert "Secilen obje kapali degil. PEDIT > Close veya BOUNDARY ile kapali polyline olusturun.")
      (*error* "CANCEL")
      (exit)
    )
  )

  (setq pts (sag5:get-boundary-points e))
  (if (or (null pts) (< (length pts) 3) (< (sag5:area pts) 1.0e-6))
    (progn
      (alert "Parsel siniri okunamadi. En guvenli format: kapali LWPOLYLINE.")
      (*error* "CANCEL")
      (exit)
    )
  )

  (setq n (sag5:getint-default "Kac esit alanli parcaya bolunsun" 4))
  (if (< n 2)
    (progn (alert "Parca sayisi en az 2 olmali.") (*error* "CANCEL") (exit))
  )

  (setq unitM (sag5:getreal-default "1 cizim birimi kac metre? Metre=1, cm=0.01, mm=0.001" 1.0))
  (if (<= unitM 0.0) (setq unitM 1.0))

  (setq minM (sag5:getreal-default "Yeni parsellerde izin verilen minimum kenar kac metre olsun? 0=kontrol yok" 0.0))
  (setq minRaw (if (> minM 0.0) (/ minM unitM) 0.0))

  (setq stepDeg (sag5:getreal-default "Otomatik acisal arama hassasiyeti kac derece olsun? Kucuk deger daha yavas ama daha iyi sonuc verir" 5.0))
  (if (or (<= stepDeg 0.0) (> stepDeg 45.0)) (setq stepDeg 5.0))

  (setq total (sag5:area pts))

  (princ "\nParsel analiz ediliyor. Uygun kesim yonleri otomatik deneniyor...")
  (setq pieces (sag5:generate-pieces-auto pts n minRaw stepDeg))

  (if (null pieces)
    (progn
      (setq msg
        (strcat
          "Bu geometri ve kriterlerle guvenli bolme bulunamadi.\n\n"
          "Sebep genellikle sunlardan biridir:\n"
          "- Parsel cok girintili/cikintili ve esit alan parcasi tek parca kalmiyor.\n"
          "- Minimum kenar sarti bu parca sayisi icin cok buyuk.\n"
          "- Parca sayisi fazla.\n\n"
          "Oneri:\n"
          "- Minimum kenar degerini dusurun,\n"
          "- Parca sayisini azaltin,\n"
          "- Arama hassasiyetini 2 veya 3 derece yaparak tekrar deneyin."
        )
      )
      (alert msg)
      (*error* "CANCEL")
      (exit)
    )
  )

  (setq rng (sag5:range-dot pts '(1.0 0.0)))
  (setq minK (car rng))
  (setq maxK (cadr rng))
  (setq textH (/ (max 1.0 (- maxK minK)) 45.0))
  (if (< textH 1.0) (setq textH 1.0))
  (setq h (getreal (strcat "\nYazi yuksekligi cizim birimi <" (sag5:fmt textH 2) ">: ")))
  (if h (setq textH h))

  (setq rows nil created 0 i 1)
  (foreach sp pieces
    (setq sp (sag5:simplify-collinear sp 1.0e-7))
    (setq color (nth (rem (1- i) (length sag5:colors)) sag5:colors))
    (setq name (sag5:piece-name i))
    (setq areaM (* (sag5:area sp) unitM unitM))

    (setq b (sag5:make-poly sp "SAGG-PAY-SINIR" color))
    (if b
      (progn
        (sag5:make-hatch b color)
        (setq cen (sag5:centroid sp))
        (sag5:make-mtext cen (strcat name "\\P" (sag5:fmt areaM 2) " " (sag5:sqm-label)) textH "SAGG-PAY-YAZI" 7)
        (setq created (1+ created))
      )
    )

    (setq edgeText (sag5:edge-list-text sp unitM))
    ; V5'te sabit serit genisligi yok; bu kolon 'Min kenar m' olarak kullanilir.
    (setq rows (append rows (list (list name (sag5:fmt areaM 2) (sag5:fmt (* (sag5:min-edge sp) unitM) 2) (itoa color) "PARCA" edgeText))))
    (setq i (1+ i))
  )

  (setq totalAreaM (* total unitM unitM))
  (setq sumAreaM 0.0)
  (foreach sp pieces
    (setq sumAreaM (+ sumAreaM (* (sag5:area sp) unitM unitM)))
  )

  (setq legpt (getpoint "\nLejant tablosu yerlesim noktasi <atla>: "))
  (if legpt
    (sag5:add-legend-table (sag5:pt2 (trans legpt 1 0)) rows textH totalAreaM sumAreaM)
  )

  (vla-EndUndoMark doc)
  (setvar "CMDECHO" oldcmdecho)
  (princ
    (strcat
      "\nARSAPAY5 tamamlandi. Olusan parca: " (itoa created)
      " | Toplam alan: " (sag5:fmt (* total unitM unitM) 2) " " (sag5:sqm-label)
      " | Hedef parca alani: " (sag5:fmt (* (/ total n) unitM unitM) 2) " " (sag5:sqm-label)
    )
  )
  (princ)
)

(princ "\nSAGG ARSAPAY V5 yuklendi. Komut: ARSAPAY5")
(princ)
