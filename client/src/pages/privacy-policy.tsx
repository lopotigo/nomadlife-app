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
            <h2 className="text-xl font-semibold mb-3">1. Quali dati raccogliamo</h2>
            <p className="text-muted-foreground leading-relaxed">
              nomad-life.app raccoglie esclusivamente l'indirizzo email e la posizione GPS dell'utente al solo scopo 
              di far funzionare il social network. L'email serve per la registrazione, il login e le comunicazioni 
              di servizio (come il recupero della password). La posizione GPS viene utilizzata per mostrare la tua 
              posizione sulla mappa, trovare spot e nomadi nelle vicinanze, e personalizzare i contenuti in base 
              alla tua area geografica. La posizione GPS viene condivisa solo con il tuo consenso esplicito e puoi 
              disattivarla in qualsiasi momento dalle impostazioni di privacy del tuo profilo (modalità Shadow).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Come utilizziamo i dati</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">I tuoi dati vengono utilizzati esclusivamente per:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Creare e gestire il tuo account sulla piattaforma.</li>
              <li>Mostrare la tua posizione sulla mappa (solo se lo consenti).</li>
              <li>Fornirti suggerimenti personalizzati di viaggio, coworking e alloggi nelle vicinanze.</li>
              <li>Inviarti email di servizio strettamente necessarie (recupero password, notifiche importanti).</li>
              <li>Generare guide e consigli di viaggio tramite intelligenza artificiale (OpenAI).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. I tuoi dati non vengono venduti</h2>
            <p className="text-muted-foreground leading-relaxed">
              I tuoi dati personali non vengono venduti a terzi in nessun caso. Non vendiamo, affittiamo o 
              scambiamo le tue informazioni personali con nessuna azienda o individuo esterno per scopi commerciali, 
              pubblicitari o di marketing. I dati restano sulla nostra piattaforma e vengono utilizzati 
              unicamente per fornirti il servizio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Servizi di terze parti</h2>
            <p className="text-muted-foreground leading-relaxed">
              Per il funzionamento della piattaforma ci avvaliamo di alcuni servizi esterni: 
              OpenAI per le funzionalità AI del chatbot e delle guide, SendGrid per l'invio di email transazionali, 
              e Google reCAPTCHA per la protezione dallo spam. Questi servizi ricevono solo i dati strettamente 
              necessari al loro funzionamento e sono vincolati dalle rispettive politiche sulla privacy. 
              I link affiliati (hotel, voli, coworking) rimandano a siti esterni la cui gestione dei dati 
              è regolata dalle loro politiche.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cancellazione dell'account</h2>
            <p className="text-muted-foreground leading-relaxed">
              Puoi cancellarti quando vuoi. Per richiedere la cancellazione del tuo account e di tutti i dati 
              associati, scrivi a privacy@nomad-life.app. I tuoi dati personali verranno eliminati entro 30 giorni 
              dalla richiesta. Dopo la cancellazione, i contenuti pubblici (post, commenti) potranno essere 
              anonimizzati ma non saranno più associati alla tua identità.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. I tuoi diritti (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">In conformità al Regolamento UE 2016/679 (GDPR), hai diritto a:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Accesso:</strong> sapere quali dati abbiamo su di te.</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti.</li>
              <li><strong>Cancellazione:</strong> richiedere l'eliminazione dei tuoi dati.</li>
              <li><strong>Portabilità:</strong> ricevere i tuoi dati in un formato leggibile.</li>
              <li><strong>Opposizione:</strong> opporti al trattamento in qualsiasi momento.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Per esercitare questi diritti, scrivi a privacy@nomad-life.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookie</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizziamo solo cookie tecnici necessari per il funzionamento del servizio (sessione di login). 
              Non utilizziamo cookie di profilazione o pubblicitari.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Sicurezza</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le password sono criptate con bcrypt. Tutte le comunicazioni avvengono tramite connessione sicura HTTPS/TLS. 
              Adottiamo misure tecniche adeguate per proteggere i tuoi dati.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Modifiche</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questa informativa può essere aggiornata. Le modifiche saranno comunicate tramite la piattaforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contatti</h2>
            <p className="text-muted-foreground leading-relaxed">
              Per qualsiasi domanda sulla privacy:<br />
              Email: privacy@nomad-life.app<br />
              Sito: nomad-life.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
