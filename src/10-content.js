/* ================= Inhalte (alle selbst geschrieben) ================= */
// Quiz: a[0] ist immer richtig, die Reihenfolge wird im Spiel gemischt.
const QUIZ = [
  { q: 'Wie viele Tiere jeder Art nahm Moses mit auf die Arche?', a: ['Keine – das war Noah', 'Zwei', 'Sieben', 'Eins'] },
  { q: 'Welches Land hat die meisten Zeitzonen (inklusive Überseegebiete)?', a: ['Frankreich', 'Russland', 'USA', 'China'] },
  { q: 'Wie viele Rentiere ziehen den Schlitten des Weihnachtsmanns – Rudolph mitgezählt?', a: ['9', '8', '12', '7'] },
  { q: 'In welchem Land wurde der Adventskranz erfunden?', a: ['Deutschland', 'Schweden', 'Österreich', 'Dänemark'] },
  { q: 'Welche Farbe hat die „Blackbox“ im Flugzeug?', a: ['Orange', 'Schwarz', 'Rot', 'Silber'] },
  { q: 'Wie heißt die Hauptstadt von Australien?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
  { q: 'Wie viele Herzen hat ein Oktopus?', a: ['Drei', 'Eins', 'Zwei', 'Acht'] },
  { q: 'Wie lange dauerte der Hundertjährige Krieg?', a: ['116 Jahre', '100 Jahre', '99 Jahre', '87 Jahre'] },
  { q: 'Wo stammt die Kiwi ursprünglich her?', a: ['China', 'Neuseeland', 'Australien', 'Chile'] },
  { q: 'In welchem Monat wird der Jahrestag der russischen Oktoberrevolution gefeiert?', a: ['November', 'Oktober', 'Dezember', 'September'] },
  { q: 'Aus wie vielen Flächen besteht ein klassischer Fußball?', a: ['32', '24', '36', '20'] },
  { q: 'Welches Getränk wurde ursprünglich als Arzneimittel verkauft?', a: ['Coca-Cola', 'Fanta', 'Sprite', 'Red Bull'] },
  { q: 'Wie viele Tasten hat ein klassisches Klavier?', a: ['88', '76', '96', '64'] },
  { q: 'Welcher dieser Planeten dreht sich „falsch herum“ um die eigene Achse?', a: ['Venus', 'Mars', 'Jupiter', 'Merkur'] },
  { q: 'Welches Land schenkt London jedes Jahr den Weihnachtsbaum für den Trafalgar Square?', a: ['Norwegen', 'Schweden', 'Dänemark', 'Finnland'] },
  { q: 'Wie heißt die Nikolaus-Figur in den Niederlanden?', a: ['Sinterklaas', 'Joulupukki', 'Père Noël', 'Babbo Natale'] },
  { q: 'Wie viele Minuten hat ein Tag?', a: ['1.440', '1.240', '1.600', '2.400'] },
  { q: 'Welches Lebensmittel verdirbt bei richtiger Lagerung praktisch nie?', a: ['Honig', 'Reis', 'Zwieback', 'Haferflocken'] },
  { q: 'Wofür steht „PDF“?', a: ['Portable Document Format', 'Printable Data File', 'Public Document Form', 'Personal Data Format'] },
  { q: 'Welcher Weihnachtssong ist laut Guinness die meistverkaufte Single aller Zeiten?', a: ['White Christmas', 'Last Christmas', 'All I Want for Christmas Is You', 'Jingle Bell Rock'] },
  { q: 'In welcher Stadt steht das Atomium?', a: ['Brüssel', 'Amsterdam', 'Paris', 'Luxemburg'] },
  { q: 'Was ist schwerer: ein Kilo Federn oder ein Kilo Stahl?', a: ['Beides gleich schwer', 'Das Kilo Stahl', 'Das Kilo Federn', 'Kommt auf die Höhe an'] },
  { q: 'Welcher Fluss hat die längste Strecke auf deutschem Gebiet?', a: ['Rhein', 'Donau', 'Elbe', 'Main'] },
  { q: 'Was misst ein Anemometer?', a: ['Windgeschwindigkeit', 'Luftfeuchtigkeit', 'Luftdruck', 'Erdbeben'] },
  { q: 'Wie viele Spieler pro Team stehen beim Eishockey regulär auf dem Eis?', a: ['6', '5', '7', '11'] },
  { q: 'Wer schrieb das Theaterstück „Die Physiker“?', a: ['Friedrich Dürrenmatt', 'Max Frisch', 'Bertolt Brecht', 'Franz Kafka'] },
  { q: 'Welches Bundesland hat die meisten Einwohner?', a: ['Nordrhein-Westfalen', 'Bayern', 'Baden-Württemberg', 'Niedersachsen'] },
  { q: 'Welches ist das flächenmäßig kleinste Bundesland?', a: ['Bremen', 'Saarland', 'Hamburg', 'Berlin'] },
  { q: 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', a: ['206', '186', '256', '312'] },
  { q: 'Welche Zahl liegt auf einem normalen Würfel gegenüber der Sechs?', a: ['1', '3', '4', '5'] },
  { q: 'Welches Edelgas leuchtet in klassischen Leuchtreklamen rot-orange?', a: ['Neon', 'Argon', 'Helium', 'Xenon'] },
  { q: 'Welches Tier ist im Ferrari-Logo?', a: ['Ein Pferd', 'Ein Stier', 'Ein Löwe', 'Ein Adler'] },
  { q: 'Was bedeutet „Weihnachten“ ursprünglich?', a: ['Geweihte Nächte', 'Weiße Nächte', 'Wintersonnenwende', 'Warme Stuben'] },
  { q: 'Wie lautete der Text der ersten SMS der Welt (1992)?', a: ['Merry Christmas', 'Hello World', 'Can you read this?', 'Testing 1 2 3'] },
  { q: 'Welches ist das größte Organ des Menschen?', a: ['Die Haut', 'Die Leber', 'Die Lunge', 'Der Darm'] },
  { q: 'Welche Währung hat die Schweiz?', a: ['Franken', 'Euro', 'Krone', 'Taler'] },
];

// Schätzfragen mit Einheit
const ESTIMATE = [
  { q: 'Wie hoch ist der Kölner Dom?', v: 157, unit: 'Meter' },
  { q: 'Wie weit ist der Mond im Durchschnitt von der Erde entfernt?', v: 384400, unit: 'Kilometer' },
  { q: 'Wie lang ist die Chinesische Mauer mit allen Abschnitten (Vermessung 2012)?', v: 21196, unit: 'Kilometer' },
  { q: 'Wie viele Staaten sind Mitglied der Vereinten Nationen?', v: 193, unit: 'Staaten' },
  { q: 'Wie hoch ist die Zugspitze?', v: 2962, unit: 'Meter' },
  { q: 'Wie lang ist der Rhein insgesamt?', v: 1233, unit: 'Kilometer' },
  { q: 'Wie lang ist der Erdumfang am Äquator?', v: 40075, unit: 'Kilometer' },
  { q: 'Wie alt wurde Johann Wolfgang von Goethe?', v: 82, unit: 'Jahre' },
  { q: 'Wie hoch ist der Berliner Fernsehturm?', v: 368, unit: 'Meter' },
  { q: 'In welchem Jahr wurde „Stille Nacht, heilige Nacht“ uraufgeführt?', v: 1818, unit: 'Jahr', year: true },
  { q: 'Wie viele Zähne hat ein erwachsener Mensch mit Weisheitszähnen?', v: 32, unit: 'Zähne' },
  { q: 'Wie hoch ist der Eiffelturm mit Antennen (Stand 2022)?', v: 330, unit: 'Meter' },
  { q: 'Wie viele Kilometer hat ein Marathon (gerundet auf ganze Kilometer)?', v: 42, unit: 'Kilometer' },
  { q: 'Wie viele Tasten hat eine normale deutsche PC-Tastatur (Standardlayout mit Ziffernblock)?', v: 105, unit: 'Tasten' },
];

// Emoji-Rätsel
const EMOJI = [
  { e: ['🚢', '🧊', '💔'], s: 'Titanic', c: 'Film' },
  { e: ['🦁', '👑', '🌅'], s: 'Der König der Löwen', c: 'Film' },
  { e: ['🏠', '👦', '✈️', '🎄'], s: 'Kevin – Allein zu Haus', c: 'Film' },
  { e: ['❄️', '👸', '⛄'], s: 'Die Eiskönigin', c: 'Film' },
  { e: ['🧙‍♂️', '💍', '🌋'], s: 'Der Herr der Ringe', c: 'Film' },
  { e: ['🦖', '🏝️', '🧬'], s: 'Jurassic Park', c: 'Film' },
  { e: ['👽', '📞', '🏠'], s: 'E.T. – Der Außerirdische', c: 'Film' },
  { e: ['🍫', '🏭', '🎫'], s: 'Charlie und die Schokoladenfabrik', c: 'Film' },
  { e: ['🐟', '🔍', '🐠'], s: 'Findet Nemo', c: 'Film' },
  { e: ['🌰', '🌰', '🌰', '👸'], s: 'Drei Haselnüsse für Aschenbrödel', c: 'Film' },
  { e: ['💚', '🎄', '😠'], s: 'Der Grinch', c: 'Film' },
  { e: ['💡', '🏠', '🎄', '🤪'], s: 'Schöne Bescherung', c: 'Film' },
  { e: ['🍽️', '1️⃣', '🐯', '🍷'], s: 'Dinner for One', c: 'Film' },
  { e: ['🐀', '👨‍🍳', '🇫🇷'], s: 'Ratatouille', c: 'Film' },
  { e: ['🏴‍☠️', '🦜', '🌊'], s: 'Fluch der Karibik', c: 'Film' },
  { e: ['🧊', '🦣', '🐿️'], s: 'Ice Age', c: 'Film' },
  { e: ['👻', '🚫', '🔫'], s: 'Ghostbusters', c: 'Film' },
  { e: ['🎄', '🎁', '💔'], s: 'Last Christmas', c: 'Song' },
  { e: ['🤫', '🌙', '😇'], s: 'Stille Nacht, heilige Nacht', c: 'Song' },
  { e: ['❄️', '🤍', '👗'], s: 'Schneeflöckchen, Weißröckchen', c: 'Song' },
  { e: ['🔔', '🔔', '🔔', '🛷'], s: 'Jingle Bells', c: 'Song' },
  { e: ['🎅', '🏠', '⬇️', '🔜'], s: 'Morgen kommt der Weihnachtsmann', c: 'Song' },
  { e: ['🐷', '🍀'], s: 'Schwein gehabt', c: 'Redewendung' },
  { e: ['🍅', '👀'], s: 'Tomaten auf den Augen haben', c: 'Redewendung' },
  { e: ['🐻', '🤥'], s: 'Jemandem einen Bären aufbinden', c: 'Redewendung' },
  { e: ['🔨', '📌', '🧠'], s: 'Den Nagel auf den Kopf treffen', c: 'Redewendung' },
  { e: ['🪵', '🛤️'], s: 'Auf dem Holzweg sein', c: 'Redewendung' },
  { e: ['🐷', '🎶', '😳'], s: 'Ich glaub, mein Schwein pfeift', c: 'Redewendung' },
  { e: ['🐻', '💃', '🎉'], s: 'Da steppt der Bär', c: 'Redewendung' },
  { e: ['🙅', '🍺'], s: 'Das ist nicht mein Bier', c: 'Redewendung' },
];

// Begriffe für „Rücken zur Leinwand“
const WORDS = ['Glühwein', 'Lametta', 'Wichteln', 'Spekulatius', 'Christstollen', 'Rentier', 'Schneeballschlacht', 'Bescherung', 'Adventskalender', 'Krippe',
  'Mistelzweig', 'Lebkuchenherz', 'Weihnachtsmarkt', 'Geschenkpapier', 'Tesafilm', 'Lichterkette', 'Schornstein', 'Plätzchenteig', 'Zuckerstange', 'Nussknacker',
  'Christbaumkugel', 'Schlitten', 'Eisstockschießen', 'Schneemann', 'Weihnachtsmuffel', 'Kinderpunsch', 'Bratapfel', 'Raclette', 'Silvesterrakete', 'Feuerzangenbowle',
  'Neujahrsvorsatz', 'Fitnessstudio', 'Kaffeemaschine', 'Papierstau', 'Videokonferenz', 'Stummschalten', 'Mittagspause', 'Betriebsausflug', 'Urlaubsantrag', 'Feierabend',
  'Excel-Tabelle', 'Passwort', 'Kantine', 'Montagsmeeting', 'Großraumbüro', 'Homeoffice', 'Kalendereinladung', 'Klebezettel', 'Tischkicker', 'Gehaltserhöhung',
  'Kaffeeküche', 'Spülmaschine', 'Aktenordner', 'Praktikant', 'Dienstreise', 'Aufzug', 'Bürostuhl', 'Weihnachtsfeier', 'Karaoke', 'Tanzfläche',
  'Partyhut', 'Konfetti', 'Kater', 'Jogginghose', 'Hausschuhe', 'Kaminfeuer', 'Glatteis', 'Streusalz', 'Schneeschippe', 'Pinguin',
  'Eisbär', 'Polarlicht', 'Skihütte', 'Après-Ski', 'Wollsocken', 'Weihnachtspulli', 'Zimtstern', 'Marzipan', 'Christkind', 'Engelshaar',
  'Wunschzettel', 'Rodelbahn', 'Schneeflocke', 'Tannennadel', 'Gänsebraten', 'Rotkohl', 'Dominostein', 'Pfefferkuchenhaus', 'Weihnachtsstress', 'Umtauschbon'];

// Zeitstrahl: Ereignis + Jahr
const TIMELINE = [
  ['Das erste iPhone wird vorgestellt', 2007], ['Die Berliner Mauer fällt', 1989], ['Erste bemannte Mondlandung', 1969], ['Der Euro kommt als Bargeld', 2002],
  ['Google wird gegründet', 1998], ['Wikipedia geht online', 2001], ['Der erste Harry-Potter-Band erscheint (Original)', 1997], ['Tetris erscheint', 1984],
  ['Der Game Boy kommt in Japan heraus', 1989], ['„Dinner for One“ wird beim NDR aufgezeichnet', 1963], ['Der Eiffelturm wird eröffnet', 1889],
  ['Carl Benz meldet seinen Motorwagen zum Patent an', 1886], ['„Stille Nacht“ wird uraufgeführt', 1818], ['Kolumbus erreicht Amerika', 1492],
  ['Die erste Fußball-Weltmeisterschaft', 1930], ['Deutschland wird erstmals Fußballweltmeister', 1954], ['Die Deutsche Wiedervereinigung', 1990],
  ['Facebook wird gegründet', 2004], ['YouTube wird gegründet', 2005], ['Der erste „Star Wars“-Film kommt ins Kino', 1977], ['Sputnik 1 umkreist die Erde', 1957],
  ['Der erste „Tatort“ läuft im Fernsehen', 1970], ['Die Titanic sinkt', 1912], ['„Die Sendung mit der Maus“ startet', 1971], ['„Super Mario Bros.“ erscheint', 1985],
  ['Deutschland führt fünfstellige Postleitzahlen ein', 1993], ['Die erste SMS wird verschickt', 1992], ['Haribo wird gegründet', 1920],
  ['Der Film „Titanic“ kommt in die US-Kinos', 1997], ['Die erste E-Mail wird verschickt', 1971],
];

// „Wer würde am ehesten …?“ – nur harmlose Fragen
const WHO = [
  'beim Wichteln heimlich das eigene Geschenk zurückwollen?',
  'als Erstes auf der Tanzfläche stehen?',
  'den Weihnachtsbaum schon im Oktober aufstellen?',
  'beim Plätzchenbacken mehr Teig naschen als backen?',
  'die Lichterkette im Juli noch hängen haben?',
  'ein Weihnachtslied falsch mitsingen und es nicht merken?',
  'beim Schrottwichteln das beste Teil abräumen?',
  'das Rentier-Kostüm ganz ohne Wette anziehen?',
  'Geschenke am 24. um 15 Uhr an der Tankstelle kaufen?',
  'die Karaoke-Maschine nicht mehr hergeben?',
  'im Meeting den Weihnachtspulli tragen?',
  'die Reste vom Buffet für die ganze Woche einpacken?',
];

// Zufallsereignisse zwischen den Runden
const EVENTS = [
  { k: 'double', e: '✨', t: 'Doppelte Punkte!', d: 'Die nächste Runde zählt doppelt.' },
  { k: 'underdog', e: '🐶', t: 'Aufholjagd', d: 'Die untere Hälfte der Rangliste bekommt 150 Punkte geschenkt.' },
  { k: 'gift', e: '🎁', t: 'Geschenk vom Showmaster', d: 'Alle bekommen 50 Punkte.' },
  { k: 'luck', e: '🥠', t: 'Glückskekse', d: 'Drei zufällige Personen bekommen je 200 Punkte.' },
  { k: 'dance', e: '🕺', t: 'Tanzeinlage!', d: 'Die Band legt los: Alle stehen auf und tanzen mit. Fürs Mitmachen gibt’s 25 Punkte für alle.' },
];

const QUIPS_LEAD = [
  '{lead} führt – aber Hochmut kommt vor dem Glatteis.',
  '{lead} vorne. {second} ist dicht dran und plant still das Comeback.',
  '{lead} spielt wie ein frisch geölter Nussknacker.',
  'Liebe Verfolger von {lead}: Das Christkind sieht alles. Auch diesen Punktestand.',
  '{lead} hat das goldene Mikro. Noch.',
];
const QUIPS_TIE = ['Gleichstand an der Spitze! Spannender wird’s nur beim Wichteln.'];

const AVATARS = ['⭐', '🌲', '🦌', '⛄', '🍪', '🔔', '🎅', '🧦', '🍷', '❄️', '🔥', '🎁', '🕯️', '🧁', '🐧', '🦊'];

// Melodien für „Die Band spielt …“ – nur gemeinfreie Lieder. Format: MIDI-Note:Schläge
const MELODIES = [
  { s: 'Jingle Bells', c: 'Weihnachten', bpm: 170, n: '64:1 64:1 64:2 64:1 64:1 64:2 64:1 67:1 60:1.5 62:.5 64:4 65:1 65:1 65:1.5 65:.5 65:1 64:1 64:1 64:.5 64:.5 64:1 62:1 62:1 64:1 62:2 67:2' },
  { s: 'Stille Nacht, heilige Nacht', c: 'Weihnachten', bpm: 220, n: '67:3 69:1 67:2 64:6 67:3 69:1 67:2 64:6 74:4 74:2 71:6 72:4 72:2 67:6' },
  { s: 'O Tannenbaum', c: 'Weihnachten', bpm: 100, n: '67:1 72:.75 72:.25 72:1.5 74:.5 76:.75 76:.25 76:1.5 76:.5 74:.5 76:.5 77:1 71:1 74:1 72:1.5' },
  { s: 'Morgen kommt der Weihnachtsmann', c: 'Weihnachten', bpm: 130, n: '60:1 60:1 67:1 67:1 69:1 69:1 67:2 65:1 65:1 64:1 64:1 62:1 62:1 60:2' },
  { s: 'We Wish You a Merry Christmas', c: 'Weihnachten', bpm: 170, n: '67:1 72:1 72:.5 74:.5 72:.5 71:.5 69:1 69:1 69:1 74:1 74:.5 76:.5 74:.5 72:.5 71:1 67:1 67:1 76:1 76:.5 77:.5 76:.5 74:.5 72:1 69:1 67:.5 67:.5 69:1 74:1 71:1 72:3' },
  { s: 'Freue dich, Welt (Joy to the World)', c: 'Weihnachten', bpm: 100, n: '72:1 71:.75 69:.25 67:1.5 65:.5 64:1 62:1 60:2' },
  { s: 'Deck the Halls', c: 'Weihnachten', bpm: 140, n: '67:1.5 65:.5 64:1 62:1 60:1 62:1 64:1 60:1 62:.5 64:.5 65:.5 62:.5 64:1.5 62:.5 60:1 59:1 60:2' },
  { s: 'Ode an die Freude', c: 'Klassik', bpm: 140, n: '64:1 64:1 65:1 67:1 67:1 65:1 64:1 62:1 60:1 60:1 62:1 64:1 64:1.5 62:.5 62:2' },
  { s: 'Für Elise', c: 'Klassik', bpm: 120, n: '76:.5 75:.5 76:.5 75:.5 76:.5 71:.5 74:.5 72:.5 69:1.5 60:.5 64:.5 69:.5 71:1.5 64:.5 68:.5 71:.5 72:1.5' },
  { s: 'Alle meine Entchen', c: 'Kinderlied', bpm: 150, n: '60:1 62:1 64:1 65:1 67:2 67:2 69:1 69:1 69:1 69:1 67:4 69:1 69:1 69:1 69:1 67:4 65:1 65:1 65:1 65:1 64:2 64:2 62:1 62:1 62:1 62:1 60:4' },
  { s: 'Hänschen klein', c: 'Kinderlied', bpm: 140, n: '67:1 64:1 64:2 65:1 62:1 62:2 60:1 62:1 64:1 65:1 67:1 67:1 67:2' },
  { s: 'Zum Geburtstag viel Glück', c: 'Party', bpm: 120, n: '67:.75 67:.25 69:1 67:1 72:1 71:2 67:.75 67:.25 69:1 67:1 74:1 72:2 67:.75 67:.25 79:1 76:1 72:1 71:1 69:1 77:.75 77:.25 76:1 72:1 74:1 72:2' },
  { s: 'Die Tetris-Melodie (Korobeiniki)', c: 'Videospiel', bpm: 150, n: '76:1 71:.5 72:.5 74:1 72:.5 71:.5 69:1 69:.5 72:.5 76:1 74:.5 72:.5 71:1.5 72:.5 74:1 76:1 72:1 69:1 69:2' },
];
const BAND = [{ i: 'drums', e: '🥁' }, { i: 'bass', e: '🎸' }, { i: 'keys', e: '🎹' }, { i: 'horn', e: '🎺' }];
