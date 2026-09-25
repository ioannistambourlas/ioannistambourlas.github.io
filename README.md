# ioannistambourlas.com

Personal website of Ioannis Tambourlas: Computer Science student at KTH, co-founder of Futsalaki and badminton player for Cyprus.

Plain HTML, CSS and JavaScript with no build step, served by GitHub Pages at [ioannistambourlas.com](https://ioannistambourlas.com).

```
index.html                    home page
styles.css                    shared by every page
assets/site.js                menu, scroll reveals, lazy images, filters, page transitions
assets/shots/                 project screenshots
work/futsalaki/               case study
work/sssb-market/             case study
demos/futsalaki/              Futsalaki venue dashboard, interactive with sample data
demos/futsalaki-app/          Futsalaki player app, interactive with sample data
demos/student-market/         SSSB Market, interactive with sample data
cv.html                       source of the CV (A4, print-ready)
Ioannis-Tambourlas-CV.pdf     the CV linked from the site
CNAME                         custom domain for GitHub Pages
```

## Publishing

Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)`.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

The demos run entirely in the browser; nothing is sent to a server.
