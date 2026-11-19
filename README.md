# Glühwein Royale

Die Gameshow für die Weihnachtsfeier. Jede*r spielt für sich mit dem eigenen Handy, ein Gerät moderiert und zeigt die Show. Kein Konto, keine App, keine Datenbank.

<p align="center">
  <img src="docs/screenshots/01-titel.webp" width="49%" alt="Titelbild mit dem Schriftzug Glühwein Royale">
  <img src="docs/screenshots/02-lobby.webp" width="49%" alt="Lobby mit QR-Code, Raumcode und sechs beigetretenen Personen">
</p>

## So sieht’s aus

### Auf dem Handy der Gäste

<p>
  <img src="docs/screenshots/p1-beitreten.webp" width="13.5%" alt="Beitreten: Name und Zeichen wählen">
  <img src="docs/screenshots/p2-frage.webp" width="13.5%" alt="Quizfrage mit vier Antwortknöpfen">
  <img src="docs/screenshots/p3-ergebnis.webp" width="13.5%" alt="Auflösung: richtige Antwort markiert, eigenes Ergebnis darunter">
  <img src="docs/screenshots/p4-abstimmung.webp" width="13.5%" alt="Wer würde am ehesten: Abstimmung über die Mitspielenden">
  <img src="docs/screenshots/p5-zeitstrahl.webp" width="13.5%" alt="Früher oder später: zwei große Knöpfe">
  <img src="docs/screenshots/p6-einsatz.webp" width="13.5%" alt="Finale: Einsatz per Schieberegler festlegen">
  <img src="docs/screenshots/p7-endstand.webp" width="13.5%" alt="Endstand mit eigenem Platz und Podest">
</p>

### Auf dem Beamer (oder dem Moderations-Handy)

| | |
|---|---|
| ![Rundenstart mit Regeln](docs/screenshots/03-runde.webp) | ![Quizfrage mit Timer und Antwortzähler](docs/screenshots/04-frage.webp) |
| **Rundenstart** – Regeln in drei Sätzen | **Frage** – Timer, Zähler „3 von 6 haben geantwortet“ |
| ![Auflösung mit Antwortverteilung](docs/screenshots/05-aufloesung.webp) | ![Zwischenstand mit animierter Rangliste](docs/screenshots/06-zwischenstand.webp) |
| **Auflösung** – Verteilung und schnellste richtige Antwort | **Zwischenstand** – Rangliste gleitet an die neuen Plätze |
| ![Die Band spielt eine Melodie, Piano-Roll oben](docs/screenshots/07-band.webp) | ![Schätzduell mit Punktewolke aller Tipps](docs/screenshots/08-schaetzduell.webp) |
| **Die Band spielt …** – Piano-Roll zeigt nur bereits gespielte Noten | **Schätzduell** – alle Tipps als Punktewolke, die drei Nächsten markiert |
| ![Ergebnis von Wer würde am ehesten](docs/screenshots/09-wer-wuerde.webp) | ![Früher oder später mit Ausgeschiedenen](docs/screenshots/10-zeitstrahl.webp) |
| **Wer würde am ehesten …?** – nur das Ergebnis, nie wer wen gewählt hat | **Früher oder später?** – wer falsch liegt, fliegt |
| ![Rücken zur Leinwand mit großem Begriff](docs/screenshots/11-ruecken.webp) | ![Glücksrad im Finale](docs/screenshots/12-gluecksrad.webp) |
| **Rücken zur Leinwand** – eine Person rät, der Saal erklärt | **Finale** – das Glücksrad bestimmt den Multiplikator |

<p align="center"><img src="docs/screenshots/13-siegerehrung.webp" width="70%" alt="Siegerehrung mit Podest und Feuerwerk"></p>

Alle Screenshots stammen aus einer echten Testshow (1 Moderation + 6 Handys, verbunden über PeerJS).

## So läuft eine Show

1. **Moderationsgerät** (Laptop am Beamer, Tablet oder Handy): Seite öffnen, **Show eröffnen**.
2. **Gäste** scannen den QR-Code oder öffnen den Link mit Raumcode, geben einen Namen ein, fertig. Mobile Daten reichen, ein gemeinsames WLAN ist nicht nötig.
3. Showlänge wählen, **Show starten**. Weiter geht es mit `Enter` oder den Knöpfen.

## Spiele

| Spiel | Prinzip |
|---|---|
| Fangfragen | Multiple Choice, schnelle richtige Antworten bringen bis zu 1000 Punkte, Serien geben Bonus |
| Schätzduell | Alle tippen eine Zahl, die drei Nächsten punkten. Auf der Leinwand erscheint die Punktewolke aller Tipps |
| Die Band spielt … | Die Hausband spielt eine gemeinfreie Melodie an, wer den Titel früh erkennt, bekommt mehr Punkte |
| Wer würde am ehesten …? | Anonyme Abstimmung über die Runde, Punkte für alle, die mit der Mehrheit lagen |
| Emoji-Express | Emojis erscheinen nach und nach, wer früh die Lösung tippt, bekommt mehr Punkte |
| Früher oder später? | Ausscheidungsspiel auf dem Zeitstrahl. Wer falsch liegt, fliegt |
| Rücken zur Leinwand | Eine ausgeloste Person rät, der ganze Saal erklärt (das Wort steht auch auf den Handys) |
| Finale | Glücksrad mit Multiplikator, Einsatz am Handy, letzte Frage. Verlieren kann man höchstens den Einsatz |
| Insider-Runde | Nur auf claude.ai: Claude schreibt Fragen aus euren Infos |

**Goldenes Mikro:** Wer nach einer Runde allein vorne liegt, wählt am Handy die nächste Runde.
Zwischen den Runden gibt es Zufallsereignisse wie doppelte Punkte, eine Aufholjagd, Glückskekse oder eine Tanzeinlage.

## Soundboard (Moderation)

`T` Tusch · `B` Ba-dum-tss · `A` Applaus · `W` Trommelwirbel · `F` Vollbild. Auf Touch-Geräten über die Knöpfe unten rechts.
Die Hausband „Die Glühwürmchen“ ist komplett im Browser synthetisiert (WebAudio), es gibt keine Audiodateien.

## Technik

```
Handys ──(WebRTC-Datenkanal)──▶ Moderationsgerät = Server, hält den Spielstand (localStorage)
   ▲                                  │
   └──── persönliche Ansicht ◀────────┘
Handshake einmalig über den öffentlichen PeerJS-Vermittler (0.peerjs.com)
```

- **Stern-Topologie:** Das Moderationsgerät ist die einzige Wahrheit. Handys schicken nur Eingaben (`hello`, `ans`, `choose`, `ping`) und bekommen ihre Ansicht zurück. Antworten nach Ablauf oder zu einer alten Frage werden verworfen.
- **Wiederverbinden:** Jedes Handy hat eine feste ID im localStorage. Nach Standby oder Reload ist es automatisch wieder drin. Auch das Moderationsgerät kann neu laden: **Show fortsetzen** holt Raum und Punkte zurück.
- **Bildschirm bleibt an:** Das Moderationsgerät hält den Bildschirm per Wake Lock wach. Trotzdem gilt: ans Ladekabel und im Vordergrund lassen.
- **Moderator-Stimme:** Eine Schnittstelle (`Voice` in `src/20-core.js`). Auf claude.ai spricht Claude, sonst die Sprachausgabe des Browsers. Weitere Stimmen, etwa Gemini Live, lassen sich dort einhängen.

### Wenn Handys sich nicht verbinden

Manche Mobilfunknetze lassen keine direkte WebRTC-Verbindung zu. Dann braucht es einen TURN-Server, also eine Weiterleitung. Kostenlos geht das z. B. mit [metered.ca](https://www.metered.ca/tools/openrelay/). Die Zugangsdaten werden vor dem Hauptskript gesetzt:

```html
<script>window.GR_TURN = [{ urls: 'turn:…', username: '…', credential: '…' }];</script>
```

## Entwickeln

```bash
sh build.sh            # baut dist/index.html
cd dist && python3 -m http.server 8765
```

- Moderation: `http://localhost:8765/?local=1`
- **Testmodus** `?local=1`: Statt WebRTC läuft alles über BroadcastChannel. Jeder Tab bekommt seinen eigenen Speicher, du kannst also mehrere Tabs als „Handys“ öffnen (der Beitrittslink enthält `&local=1`).

```
src/01-head.html   Design (CSS, mobile first; Nachtblau, Weiß, Glühwein-Beere)
src/02-body.html   Grundgerüst
src/10-content.js  Fragen, Begriffe, Melodien, Ereignisse
src/20-core.js     Helfer, Moderator-Stimme
src/30-band.js     Sound-Synthese, Hausband, Effekte
src/40-net.js      Verbindung (PeerJS / Testmodus)
src/50-host.js     Moderation: Spielstand, Screens, Ablauf
src/55-games.js    Die Spiele
src/60-player.js   Handy der Gäste
src/70-boot.js     ?r=CODE → Handy, sonst Moderation
vendor/            PeerJS, QR-Code-Generator (MIT, siehe vendor/LICENSES.md)
```

## Hosting auf Netlify

Repo verbinden, `netlify.toml` erledigt den Rest (Build `sh build.sh`, Ordner `dist`). Alternativ `dist/` per Drag & Drop hochladen.

## Datenschutz

- Keine Konten, keine Datenbank, kein eigener Server. Namen und Punkte liegen nur auf dem Moderationsgerät.
- Der PeerJS-Vermittler sieht für den Handshake die IP-Adressen und zufällige IDs, aber keine Spielinhalte.
- „Wer würde am ehesten …?“ zeigt nur das Ergebnis. Wer wen gewählt hat, verlässt das Moderationsgerät nie.

## Inhalte

Alle Fragen sind selbst geschrieben. Die Melodien sind gemeinfrei (traditionelle Lieder, Klassik, Volkslieder).
