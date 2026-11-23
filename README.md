# Pixel Bakgrund

En liten app (PWA) för att skapa egna bakgrundsbilder till **Google Pixel 9a**
(1080 × 2424 px, 20:9, 6,3").

**Öppna appen:** https://vbromsv.github.io/Pixel-background-creator/

## Funktioner
- Bakgrund: enfärgad, gradient (linjär/radiell) eller egen bild (flytta, zooma, oskärpa, mörka/ljusa)
- Emoji (färdigt urval eller valfri emoji)
- Text: typsnitt (~20 st), storlek, färg, fet/kursiv, justering, rad-/teckenavstånd, kontur, skugga, platta bakom
- Riktning: vågrät, lodrät (↑/↓), staplade tecken eller fri rotation
- Flyttlås: fritt / bara horisontellt / bara vertikalt, samt fästning mot mittlinjerna
- Bilder ovanpå (PNG med transparens, JPG, WebP …), spegelvänd, opacitet, skugga
- Lager: ordning, dölj, lås, duplicera, ta bort. Ångra/gör om. Sparas automatiskt.
- Bildformat: **Fast 1080 × 2424** eller **bred 1620/2160 × 2424** för bakgrund som glider vid swipe
- Export: PNG, JPG eller WebP – dela direkt (t.ex. till Foton) eller spara fil
- Fungerar offline efter första start

## Installera på telefonen
1. Öppna länken ovan i **Chrome** på Pixel.
2. Meny ⋮ → **Installera app** (eller "Lägg till på startskärmen").

Appen installeras som en WebAPK och tar bara några hundra kB – mindre än en vanlig APK.

## Publicering
Mappen `app/` publiceras automatiskt till GitHub Pages av `.github/workflows/pages.yml`
vid varje push till standardgrenen. Första gången: **Settings → Pages → Source: GitHub Actions**.
