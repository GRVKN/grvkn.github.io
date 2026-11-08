export const privacyTranslations={
 nl:{title:'Alice · Zo werkt je assistent',heading:'Alice en je gegevens',back:'← Naar de GRVKN-app',language:'Taal',footer:['Algemene privacyinformatie','Contact en colofon'],
  headings:['Privégesprekken','Vrijwillig persoonlijk geheugen','Lange gesprekken','Dicteren en voorlezen','Opgeslagen websites','Verwijderen en kostenregistratie','Voorstellen en goedkeuringen'],
  paragraphs:[
   'Alice is de AI-assistent van GRVKN. De afgebeelde figuur is met AI gegenereerd. Haar antwoorden kunnen fouten bevatten. Controleer belangrijke uitspraken, bedrijfsgegevens en videovoorstellen.',
   'De vrije chat is bedoeld voor ingelogde, bevestigde accounts met een goedgekeurd aanbiedersprofiel. Het gesprek en het bronmateriaal worden aan je account en de geselecteerde aanbieder gekoppeld. Andere gebruikers hebben daar geen toegang toe.',
   'Voor een AI-antwoord worden je bericht, een beperkt deel van je gespreksgeschiedenis, passende GRVKN-hulpinformatie en eventueel geselecteerde gegevens uit je concept en opgeslagen websitemateriaal aan OpenAI doorgegeven. De API-aanvraag gebruikt <code>store: false</code>. Dit is geen garantie dat de dienst geen technische registraties bijhoudt.',
   'Het geheugen dat over verschillende gesprekken heen werkt, staat aanvankelijk uit. Je schakelt het vrijwillig in en bevestigt elke herinnering afzonderlijk. Je kunt de herinneringen bekijken, afzonderlijk of volledig verwijderen en het gebruik ervan op elk moment uitschakelen. Een chat verwijderen wist afzonderlijk bevestigde herinneringen niet automatisch. Na uitschakeling worden ze niet meer als persoonlijke herinneringen aan het model meegegeven.',
   'De volledige geschiedenis blijft per pagina leesbaar. Voor een antwoord worden de laatste acht gesprekswisselingen en compacte originele fragmenten uit oudere gebruikersberichten gebruikt. De opgeslagen samenvatting wordt samen met de chat verwijderd.',
   'Spraakinvoer begint alleen via je microfoonknop en de toestemming van je apparaat. De herkende tekst blijft vóór het verzenden bewerkbaar. Spraakuitvoer leest het werkelijke antwoord voor en kan worden gestopt of gepauzeerd. Beide functies gebruiken in eerste instantie de stem en spraakherkenning van je browser of besturingssysteem. Afhankelijk van het apparaat kunnen audio voor herkenning of voor te lezen teksten naar de apparaataanbieder worden verzonden, bijvoorbeeld Google of Microsoft. GRVKN slaat geen ruwe audio-opname op en activeert geen betaalde audiodienst. De waarneembare sessietijd wordt op de server beperkt en apart geregistreerd voor spraakinvoer en spraakuitvoer. Het gaat om begrensde apparaatsessies, niet om een door de audiodienst bevestigde factureringsduur.',
   "Vóór een analyse bevestig je dat je hiervoor toestemming hebt. De browser legt openbare, bereikbare pagina's van de goedgekeurde website vast. Hij scrolt voor nagehaalde inhoud en slaat begrensde kopieën op van HTML, leesbare tekst, pagina-adressen en afbeeldingsbronnen. Er wordt niet ingelogd op andere accounts, er worden geen formulieren verzonden en er worden geen afgeschermde gedeelten omzeild. Een rapport toont vastgelegde en ontdekte pagina's, beperkingen en fouten. Een volledige kopie of een kopie van 99 procent wordt niet gegarandeerd.",
   'In het Alice-venster kun je je eigen chatgeschiedenis en opgeslagen website-inhoud verwijderen. Technische kostenregistraties, bericht-ID’s, tijdstippen en koppelingen die nodig zijn voor toegangscontrole, blijven bewaard voor facturering en foutonderzoek. Teksten die al in een eigen Studio-concept zijn overgenomen, worden niet uit dat concept verwijderd wanneer je een chat verwijdert.',
   'Alice kan je door GRVKN leiden en video-ideeën voorbereiden. Een voorstel overnemen start geen betaalde videoproductie en publiceert niets. Deze stappen controleer en bevestig je apart in de Studio.'
  ]},
 en:{title:'Alice · How your assistant works',heading:'Alice and your data',back:'← Back to the GRVKN app',language:'Language',footer:['General privacy information','Contact and legal notice'],
  headings:['Private conversations','Optional personal memory','Long conversations','Dictation and reading aloud','Saved websites','Deletion and cost records','Suggestions and approvals'],
  paragraphs:[
   'Alice is GRVKN’s AI assistant. The character shown is AI-generated. Her answers may contain mistakes. Check important statements, business information and video suggestions.',
   'General chat is intended for signed-in, confirmed accounts with an approved provider profile. Conversations and source material are linked to your account and the selected provider. Other users cannot access them.',
   'For an AI answer, your message, a limited part of your conversation history, relevant GRVKN guidance and, where applicable, selected information from your draft and saved website material are sent to OpenAI. The API request sets <code>store: false</code>. This does not guarantee that the service keeps no technical records.',
   'Memory across conversations is initially switched off. You enable it voluntarily and confirm each memory individually. You can view memories, delete them individually or altogether and disable their use at any time. Deleting a chat does not automatically delete separately confirmed memories. When disabled, they are no longer supplied to the model as personal memories.',
   'The complete history remains readable page by page. Answers use the last eight conversation exchanges and compact original excerpts from older user messages. The saved summary is deleted with the chat.',
   'Speech input only starts through your microphone button and device permission. Recognised text remains editable before sending. Speech output reads the actual answer and can be stopped or paused. Both features initially use the voice and recognition of your browser or operating system. Depending on the device, audio for recognition or text to be read aloud may be sent to its provider, such as Google or Microsoft. GRVKN does not store raw audio recordings or activate a paid audio provider. Observable session time is limited on the server and recorded separately for speech input and output. These are bounded device sessions, not billing durations confirmed by an audio provider.',
   'Before an analysis, you confirm your authorisation. The browser captures public, accessible pages of the approved website. It scrolls for dynamically loaded content and saves limited copies of HTML, readable text, page addresses and image sources. It does not use other accounts’ logins, submit forms or bypass restricted areas. A report shows captured and discovered pages, limitations and errors. A complete or 99-percent copy is not guaranteed.',
   'In the Alice window, you can delete your own chat histories and saved website content. Technical cost records, message IDs, timestamps and links needed for access control are retained for accounting and troubleshooting. Text already transferred to your own Studio draft is not removed from that draft when you delete a chat.',
   'Alice can guide you through GRVKN and prepare video ideas. Transferring a suggestion does not start a paid video production or publish anything. You review and confirm those steps separately in Studio.'
  ]}
};

if(typeof document!=='undefined'){
 const language=new URLSearchParams(location.search).get('lang'),copy=Object.hasOwn(privacyTranslations,language)?privacyTranslations[language]:null;
 if(copy){
  document.documentElement.lang=language;document.title=copy.title;
  document.querySelector('h1').textContent=copy.heading;
  document.querySelector('#privacy-back').textContent=copy.back;
  document.querySelector('#privacy-language').setAttribute('aria-label',copy.language);
  document.querySelectorAll('[data-privacy-heading]').forEach((heading,index)=>heading.textContent=copy.headings[index]);
  document.querySelectorAll('[data-privacy-copy]').forEach((paragraph,index)=>paragraph.innerHTML=copy.paragraphs[index]);
  document.querySelectorAll('#privacy-footer a').forEach((link,index)=>link.textContent=copy.footer[index]);
 }
}
