import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/auth">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-auth">
            <ArrowLeft className="w-4 h-4" />
            Torna al login
          </button>
        </Link>

        <h1 className="text-3xl font-bold mb-2" data-testid="text-terms-title">Termini di Servizio</h1>
        <p className="text-muted-foreground mb-8">Ultimo aggiornamento: 27 Febbraio 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Accettazione dei Termini</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizzando nomad-life.app ("NomadLife", "il Servizio"), accetti di essere vincolato dai presenti Termini di Servizio. 
              Se non accetti questi termini, non utilizzare il Servizio. La registrazione di un account implica l'accettazione completa 
              di questi termini e dell'Informativa sulla Privacy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrizione del Servizio</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife è una piattaforma social dedicata ai nomadi digitali che permette di condividere esperienze di viaggio, 
              trovare coworking e alloggi, pianificare itinerari, connettersi con altri nomadi e accedere a guide turistiche 
              generate tramite intelligenza artificiale. Il Servizio include funzionalità gratuite e opzioni premium a pagamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Utente</h2>
            <p className="text-muted-foreground leading-relaxed">
              Per utilizzare NomadLife devi creare un account fornendo informazioni accurate e aggiornate. 
              Sei responsabile della sicurezza del tuo account e della tua password. Devi avere almeno 16 anni per registrarti. 
              NomadLife si riserva il diritto di sospendere o eliminare account che violano questi termini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Contenuti dell'Utente</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pubblicando contenuti su NomadLife (post, foto, video, commenti, recensioni), mantieni la proprietà dei tuoi contenuti 
              ma concedi a NomadLife una licenza non esclusiva per visualizzarli, distribuirli e promuoverli all'interno della piattaforma. 
              Sei responsabile dei contenuti che pubblichi e ti impegni a non pubblicare materiale illegale, offensivo, diffamatorio, 
              o che violi i diritti di terzi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Comportamento dell'Utente</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Utilizzando NomadLife, ti impegni a non:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Creare account falsi o utilizzare identità fittizie.</li>
              <li>Inviare spam, messaggi indesiderati o contenuti pubblicitari non autorizzati.</li>
              <li>Molestare, intimidire o discriminare altri utenti.</li>
              <li>Tentare di accedere ad account altrui o ai sistemi della piattaforma.</li>
              <li>Utilizzare il Servizio per attività illegali.</li>
              <li>Manipolare il sistema di recensioni o valutazioni.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Servizi di Terze Parti</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife integra servizi di terze parti come prenotazioni di alloggi, voli e servizi di viaggio tramite partner affiliati (Travelpayouts). 
              Queste prenotazioni sono gestite direttamente dai provider esterni e NomadLife non è responsabile per i servizi forniti da terzi. 
              Le guide AI sono generate tramite OpenAI e hanno scopo informativo: verifica sempre le informazioni prima di prendere decisioni di viaggio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Abbonamenti Premium</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife offre funzionalità premium a pagamento. Gli abbonamenti si rinnovano automaticamente salvo disdetta. 
              Puoi cancellare l'abbonamento in qualsiasi momento dalle impostazioni del tuo profilo. 
              I rimborsi sono gestiti secondo la politica del provider di pagamento utilizzato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Proprietà Intellettuale</h2>
            <p className="text-muted-foreground leading-relaxed">
              Il marchio NomadLife, il logo, il design della piattaforma e il codice sorgente sono di proprietà esclusiva di NomadLife. 
              Non è consentito copiare, modificare, distribuire o creare opere derivate senza autorizzazione scritta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitazione di Responsabilità</h2>
            <p className="text-muted-foreground leading-relaxed">
              NomadLife è fornito "così com'è" senza garanzie di alcun tipo. Non siamo responsabili per danni diretti, indiretti, 
              incidentali o consequenziali derivanti dall'uso del Servizio. Le informazioni nelle guide AI e nei contenuti generati 
              dagli utenti non sostituiscono il parere di professionisti (legali, medici, finanziari).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Cancellazione dell'Account</h2>
            <p className="text-muted-foreground leading-relaxed">
              Puoi cancellare il tuo account in qualsiasi momento contattando privacy@nomad-life.app. 
              Alla cancellazione, i tuoi dati personali saranno eliminati entro 30 giorni. 
              I contenuti pubblici potrebbero essere anonimizzati e conservati. 
              NomadLife può terminare il tuo account in caso di violazione di questi termini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Modifiche ai Termini</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche saranno comunicate 
              tramite la piattaforma. L'uso continuato del Servizio dopo la pubblicazione delle modifiche costituisce accettazione.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Legge Applicabile</h2>
            <p className="text-muted-foreground leading-relaxed">
              I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente 
              il Foro di riferimento del titolare del Servizio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contatti</h2>
            <p className="text-muted-foreground leading-relaxed">
              Per domande sui Termini di Servizio:<br />
              Email: info@nomad-life.app<br />
              Sito: nomad-life.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
