import { RESPONSIBLE, type LegalPageKind } from './legal'
import LegalLinks from './LegalLinks'

type Props = {
  kind: LegalPageKind
  navigate: (to: string) => void
}

// Privacy page and imprint (SCRUM-28): a full page over the map, reachable without login.
// Keep the privacy text true: a new feature that stores personal data or calls a new service
// (for example Photos, SCRUM-42, or web push, SCRUM-44) must add it here.
export default function LegalPage({ kind, navigate }: Props) {
  return (
    <article className="legal-page">
      <a
        className="place-detail-back"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
      >
        ← Zur Karte
      </a>
      {kind === 'privacy' ? <Privacy /> : <Imprint />}
      <LegalLinks navigate={navigate} className="legal-links-inline" />
    </article>
  )
}

function Address() {
  return (
    <p>
      {RESPONSIBLE.name}
      <br />
      {RESPONSIBLE.street}
      <br />
      {RESPONSIBLE.city}
      <br />
      E-Mail: <a href={`mailto:${RESPONSIBLE.email}`}>{RESPONSIBLE.email}</a>
    </p>
  )
}

function Imprint() {
  return (
    <>
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      <Address />
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{RESPONSIBLE.name}, Anschrift wie oben.</p>
      <h2>Über dieses Projekt</h2>
      <p>
        Squadmeet ist ein nicht kommerzielles Abschlussprojekt einer Weiterbildung. Die Daten zu
        den Plätzen stammen von OpenStreetMap (© OpenStreetMap-Mitwirkende, Lizenz ODbL).
      </p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <h2>Kurz gesagt</h2>
      <ul>
        <li>Wir speichern keine E-Mail-Adresse, keinen echten Namen und keinen Standort deines Geräts.</li>
        <li>Es gibt keine Cookies, keine Werbung und kein Tracking.</li>
        <li>Du kannst dein Konto jederzeit selbst löschen. Dann sind alle Daten dazu sofort weg.</li>
      </ul>

      <h2>Verantwortlich</h2>
      <Address />

      <h2>Was wir speichern, wenn du ein Konto hast</h2>
      <ul>
        <li>
          <strong>Nickname und Avatar.</strong> Andere sehen sie bei deinen Treffen.
        </li>
        <li>
          <strong>Passwort</strong>, nur als Hash (Argon2). Dein Passwort selbst kennen wir nicht.
        </li>
        <li>
          <strong>Wiederherstellungscodes</strong>, nur als Hash, und ob ein Code schon benutzt ist.
        </li>
        <li>
          <strong>Zwei-Faktor-Anmeldung</strong> (wenn du sie einschaltest): den geheimen Schlüssel
          für deine Authenticator-App.
        </li>
        <li>
          <strong>Anmeldungen:</strong> pro angemeldetem Gerät einen Schlüssel (nur als Hash), wann
          die Anmeldung begann und wann sie endet (nach 30 Tagen). Außerdem zählen wir falsche
          Anmeldeversuche, bis du dich wieder richtig anmeldest.
        </li>
        <li>
          <strong>Treffen:</strong> an welchem Platz, Beginn, Ende und wie viele ihr seid. Solange
          ein Treffen läuft, sieht jede Person auf der Karte den Platz, die Zeit, die Gruppengröße
          und deinen Nickname mit Avatar.
        </li>
        <li>
          <strong>Heimatgebiet, Bewertungen und Fotos:</strong> nur, wenn du sie angibst oder
          hochlädst, sobald es diese Funktionen gibt.
        </li>
      </ul>
      <p>
        Wir speichern den Zeitpunkt der Registrierung. Dein Alter speichern wir nicht: Du
        bestätigst nur, dass du 18 Jahre oder älter bist.
      </p>
      <p>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (du nutzt die App mit deinem
        Konto). Für den Schutz vor Missbrauch (Captcha, Begrenzung der Anmeldeversuche) Art. 6
        Abs. 1 lit. f DSGVO: unser berechtigtes Interesse an einer sicheren App.
      </p>
      <p>
        <strong>Wie lange:</strong> bis du dein Konto löschst. Eine abgelaufene Anmeldung gilt
        nicht mehr.
      </p>

      <h2>In deinem Browser</h2>
      <p>
        Wenn du dich anmeldest, legen wir deinen Anmeldeschlüssel im Speicher deines Browsers ab
        (localStorage). Ohne ihn bleibst du nicht angemeldet. Das ist technisch nötig (§ 25 Abs. 2
        Nr. 2 TDDDG). Beim Abmelden löschen wir ihn.
      </p>

      <h2>Server (Amazon Web Services)</h2>
      <p>
        Die App läuft auf einem Server von Amazon Web Services EMEA SARL, 38 Avenue John F.
        Kennedy, L-1855 Luxemburg, in einem Rechenzentrum in Frankfurt am Main. Mit AWS gilt ein
        Vertrag zur Auftragsverarbeitung.
      </p>
      <p>
        Dein Browser sendet bei jedem Aufruf deine IP-Adresse an den Server. Wir benutzen sie nur,
        um zu viele Anmeldeversuche von einer Adresse zu begrenzen. Dafür bleibt sie kurz im
        Arbeitsspeicher. Wir schreiben IP-Adressen nicht in die Datenbank und nicht in Protokolle.
      </p>

      <h2>Captcha (Cloudflare Turnstile)</h2>
      <p>
        Gegen Bots nutzen wir Turnstile von Cloudflare, Inc., 101 Townsend St., San Francisco, CA
        94107, USA. Turnstile erscheint nur bei der Registrierung, beim Zurücksetzen des Passworts
        und bei der Anmeldung nach 3 Fehlversuchen. Nur dann lädt dein Browser das Skript von
        Cloudflare. Wer nur die Karte ansieht, sendet nichts an Cloudflare.
      </p>
      <p>
        Das Skript prüft deinen Browser und erhält dabei unter anderem deine IP-Adresse. Unser
        Server sendet das Ergebnis (ein Token) und deine IP-Adresse zur Prüfung an Cloudflare.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Cloudflare ist nach dem EU-US Data Privacy
        Framework zertifiziert. Mehr:{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
          Datenschutzerklärung von Cloudflare
        </a>
        .
      </p>

      <h2>Karte (OpenStreetMap)</h2>
      <p>
        Die Kartenbilder lädt dein Browser direkt von tile.openstreetmap.org. Betreiber ist die
        OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS,
        Großbritannien. Dabei erhält sie deine IP-Adresse und die Adresse dieser Seite. Für
        Großbritannien gibt es einen Angemessenheitsbeschluss der EU. Rechtsgrundlage: Art. 6 Abs.
        1 lit. f DSGVO (ohne Kartenbilder keine Karte). Mehr:{' '}
        <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">
          Datenschutzerklärung der OpenStreetMap Foundation
        </a>
        .
      </p>

      <h2>Konto löschen</h2>
      <p>
        Angemeldet findest du oben rechts unter „Konto“ den Punkt „Konto löschen“. Wir fragen dein Passwort (und mit
        Zwei-Faktor-Anmeldung einen Code) ab. Dann löschen wir sofort dein Konto mit allen oben
        genannten Daten, auch deine Treffen. Danach ist dein Nickname wieder frei.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Schreib uns dazu an die Adresse
        oben. Du kannst dich auch bei einer Datenschutz-Aufsichtsbehörde beschweren.
      </p>
    </>
  )
}
