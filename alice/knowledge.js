export const ALICE_TARGETS = {
 app_feed: {label:'Zum Feed',url:'/app/?alice=feed',hint:'Im Feed entdeckst du regionale Videos. Mit Wischen wechselst du den Beitrag; über die Kontaktbuttons erreichst du den Anbieter.'},
 app_discover: {label:'Entdecken öffnen',url:'/app/?alice=discover',hint:'Unter Entdecken suchst du Betriebe, Jobs und Angebote. Über Ort oder PLZ und den Umkreis bestimmst du deine Umgebung. Kategorien und Bereiche grenzen die Ergebnisse ein.'},
 app_saved: {label:'Gemerktes öffnen',url:'/app/?alice=saved',hint:'Unter Gemerkt findest du deine gespeicherten Beiträge. Zum Speichern und Synchronisieren brauchst du ein angemeldetes Konto.'},
 app_profile: {label:'Profil öffnen',url:'/app/?alice=profile',hint:'Im Profil findest du Anmeldung, Sprache und deinen Anbieterzugang. Ein Anbieterprofil und seine manuelle Freigabe sind getrennte Schritte.'},
 studio_overview: {label:'Studio-Übersicht',url:'/studio/?aliceView=overview',hint:'Die Studio-Übersicht bündelt deine privaten Entwürfe, die Monatsplanung und Freigaben.'},
 studio_create: {label:'Video vorbereiten',url:'/studio/?aliceView=studio',hint:'Beim Erstellen bestätigst du zuerst deinen Anbieter und die Fakten. Danach folgen Videowunsch, Material und Storyboard. Eine kostenpflichtige Produktion bestätigst du gesondert.'},
 studio_upload: {label:'Eigenes Video hochladen',url:'/studio/?aliceView=upload',hint:'Ein bestehendes Video kannst du nach Anbieterfreigabe hochladen. Du ergänzt Titel, Kategorie und Kontakt. KI-Inhalte müssen gekennzeichnet werden. Die Veröffentlichung braucht Moderationsfreigabe.'},
 studio_projects: {label:'Meine Projekte',url:'/studio/?aliceView=projects',hint:'Hier öffnest du gespeicherte Entwürfe und Materialien deines Anbieterzugangs.'},
 studio_campaigns: {label:'Vier-Wochen-Planer',url:'/studio/?aliceView=campaigns',hint:'Die Monatsplanung enthält die Produkte und Wünsche für die einzelnen Wochen. Du prüfst Vorschläge und Freigaben; es wird nichts ungeprüft veröffentlicht.'},
 studio_settings: {label:'Mein Studio',url:'/studio/?aliceView=settings',hint:'Unter Mein Studio prüfst du Website-Nachweis, Anbieterstatus, Verbindung und Kontingent. Die KI-Produktion hat eigene Voraussetzungen.'},
 advertising: {label:'Werbeplätze ansehen',url:'/werbung/',hint:'Ein normaler Upload ist während der Pilotphase kostenlos. Ein Werbepaket bucht zusätzliche gekennzeichnete Plätze für eine Laufzeit. Es enthält keine garantierte Reichweite und keine neue KI-Videoproduktion.'},
};

export const ALICE_GUIDES = [
 {id:'region',title:'Ort, Umkreis und Interessen wählen',target:'app_discover'},
 {id:'upload',title:'Ein eigenes Video veröffentlichen',target:'studio_upload'},
 {id:'prompt',title:'Einen guten Videowunsch formulieren',target:'studio_create'},
 {id:'monthly',title:'Vier Wochen Angebote vorbereiten',target:'studio_campaigns'},
 {id:'advertising',title:'Upload und Werbeplatz unterscheiden',target:'advertising'},
];

export const ALICE_KNOWLEDGE = Object.entries(ALICE_TARGETS).map(([target,v])=>({target,label:v.label,description:v.hint}));
