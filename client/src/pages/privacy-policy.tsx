import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/auth">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-auth">
            <ArrowLeft className="w-4 h-4" />
            Torna al login
          </button>
        </Link>

        <h1 className="text-3xl font-bold mb-2" data-testid="text-privacy-title">Informativa sulla Privacy</h1>
        <p className="text-muted-foreground mb-8">Ultimo aggiornamento: 27 Febbraio 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Titolare del Trattamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Il titolare del trattamento dei dati personali è NomadLife, raggiungibile all'indirizzo email privacy@nomad-life.app. 
              Il trattamento dei dati avviene nel rispetto del Regolamento UE 2016/679 (GDPR) e della normativa italiana vigente in materia di protezione dei dati personali.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dati Raccolti</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Raccogliamo le seguenti categorie di dati personali:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Dati di registrazione:</strong> nome, cognome, username, indirizzo email, password (criptata), città e paese di residenza.</li>
              <li><strong>Dati di profilo:</strong> biografia, avatar, professione, competenze, interessi, statistiche di viaggio.</li>
              <li><strong>Dati di localizzazione:</strong> coordinate GPS (solo se autorizzate dall'utente), città visitate, percorsi di viaggio.</li>
              <li><strong>Contenuti generati:</strong> post, commenti, foto, video, messaggi, recensioni, guide e diari di viaggio.</li>
              <li><strong>Dati di utilizzo:</strong> log di accesso, preferenze dell'app, interazioni con i contenuti, cronologia di navigazione interna.</li>
              <li><strong>Dati di pagamento:</strong> informazioni relative agli abbonamenti premium (gestiti tramite provider di pagamento esterni).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalità del Trattamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">I dati personali sono trattati per le seguenti finalità:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Creazione e gestione dell'account utente.</li>
              <li>Fornitura dei servizi della piattaforma (social network, messaggistica, prenotazioni, marketplace).</li>
              <li>Personalizzazione dell'esperienza utente tramite algoritmi di raccomandazione e intelligenza artificiale.</li>
              <li>Generazione di guide turistiche e suggerimenti di viaggio tramite AI (OpenAI GPT-4o).</li>
              <li>Invio di notifiche push relative ad attività sulla piattaforma.</li>
              <li>Analisi statistiche aggregate e anonimizzate per il miglioramento del servizio.</li>
              <li>Gestione degli abbonamenti premium e delle transazioni.</li>
              <li>Adempimento di obblighi legali e fiscali.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base Giuridica del Trattamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Il trattamento dei dati è basato su: (a) il consenso dell'utente al momento della registrazione; 
              (b) l'esecuzione del contratto di servizio; (c) il legittimo interesse del titolare per il miglioramento del servizio; 
              (d) l'adempimento di obblighi legali.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Condivisione dei Dati</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">I dati personali possono essere condivisi con:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Altri utenti:</strong> le informazioni del profilo pubblico, i post e i viaggi sono visibili agli altri utenti della piattaforma (in base alle impostazioni di privacy scelte).</li>
              <li><strong>Provider di servizi:</strong> OpenAI (per funzionalità AI), SendGrid (per email transazionali), Google (per reCAPTCHA e Analytics), Travelpayouts (per link affiliati).</li>
              <li><strong>Autorità competenti:</strong> quando richiesto dalla legge o per proteggere i diritti della piattaforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Utilizzo dell'Intelligenza Artificiale</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife utilizza servizi di intelligenza artificiale (OpenAI GPT-4o) per generare guide turistiche, suggerimenti di viaggio, 
              raccomandazioni personalizzate e risposte del chatbot NomadBot. I dati inviati ai servizi AI includono le richieste dell'utente 
              e il contesto necessario per fornire risposte pertinenti. Non vengono condivisi dati sensibili con i provider AI senza il consenso esplicito dell'utente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Conservazione dei Dati</h2>
            <p className="text-muted-foreground leading-relaxed">
              I dati personali sono conservati per tutta la durata dell'account. In caso di cancellazione dell'account, 
              i dati personali vengono eliminati entro 30 giorni, ad eccezione dei dati necessari per adempiere ad obblighi legali 
              che possono essere conservati per il periodo previsto dalla legge. I contenuti pubblici (post, commenti) possono essere 
              anonimizzati e conservati per finalità statistiche.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Diritti dell'Utente</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">In conformità al GDPR, l'utente ha diritto a:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Accesso:</strong> ottenere conferma del trattamento e copia dei propri dati.</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti.</li>
              <li><strong>Cancellazione:</strong> richiedere la cancellazione dei propri dati ("diritto all'oblio").</li>
              <li><strong>Limitazione:</strong> limitare il trattamento in determinate circostanze.</li>
              <li><strong>Portabilità:</strong> ricevere i propri dati in un formato strutturato e leggibile.</li>
              <li><strong>Opposizione:</strong> opporsi al trattamento per motivi legittimi.</li>
              <li><strong>Revoca del consenso:</strong> revocare il consenso in qualsiasi momento.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Per esercitare questi diritti, contattare privacy@nomad-life.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookie e Tecnologie di Tracciamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife utilizza cookie tecnici necessari per il funzionamento del servizio (sessione di autenticazione) 
              e cookie analitici (Google Analytics) per analisi statistiche aggregate. L'utente può gestire le preferenze 
              sui cookie tramite le impostazioni del proprio browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Sicurezza</h2>
            <p className="text-muted-foreground leading-relaxed">
              Adottiamo misure tecniche e organizzative appropriate per proteggere i dati personali, inclusa la crittografia 
              delle password (bcrypt), la trasmissione sicura dei dati (HTTPS/TLS), il controllo degli accessi e il monitoraggio 
              delle attività sospette.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ci riserviamo il diritto di modificare questa informativa. Le modifiche significative saranno comunicate 
              tramite notifica nella piattaforma e/o via email. L'utilizzo continuato del servizio dopo la pubblicazione 
              delle modifiche costituisce accettazione delle stesse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contatti</h2>
            <p className="text-muted-foreground leading-relaxed">
              Per qualsiasi domanda relativa al trattamento dei dati personali, contattare:<br />
              Email: privacy@nomad-life.app<br />
              Sito: nomad-life.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
