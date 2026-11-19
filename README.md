# Glühwein Royale

Die Gameshow für die Weihnachtsfeier. Jede*r spielt für sich mit dem eigenen Handy, ein Gerät moderiert und zeigt die Show. Kein Konto, keine App, keine Datenbank.

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
