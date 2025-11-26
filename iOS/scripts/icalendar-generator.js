/**
 * Générateur de fichiers iCalendar pour EcoleDirecte
 * 
 * Ce script génère des fichiers .ics à partir des données EcoleDirecte
 * pour import dans n'importe quelle application de calendrier.
 * 
 * @author EcoleDirecte API Documentation
 * @version 1.0.0
 * @see https://github.com/LegatronX/ecoledirecte-api
 */

const EcoleDirecteClient = importModule("api-client");

/**
 * Classe de génération de fichiers iCalendar
 */
class ICalendarGenerator {
  constructor() {
    this.events = [];
    this.calendarName = "EcoleDirecte";
  }

  /**
   * Ajoute un événement au calendrier
   * @param {Object} event - Événement à ajouter
   */
  addEvent(event) {
    this.events.push({
      uid: event.uid || this.generateUID(),
      summary: event.summary || "Sans titre",
      description: event.description || "",
      location: event.location || "",
      dtstart: event.start,
      dtend: event.end,
      categories: event.categories || [],
      status: event.cancelled ? "CANCELLED" : "CONFIRMED",
      created: new Date(),
      lastModified: new Date()
    });
  }

  /**
   * Génère un UID unique pour un événement
   * @returns {string} UID
   */
  generateUID() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}@ecoledirecte`;
  }

  /**
   * Formate une date au format iCalendar
   * @param {Date} date - Date à formater
   * @returns {string} Date formatée
   */
  formatDate(date) {
    if (typeof date === 'string') {
      // Format "2021-12-15 08:00" -> Date
      date = new Date(date.replace(' ', 'T'));
    }
    
    const pad = (n) => n.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }

  /**
   * Échappe les caractères spéciaux pour iCalendar
   * @param {string} text - Texte à échapper
   * @returns {string} Texte échappé
   */
  escapeText(text) {
    if (!text) return "";
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Génère le contenu du fichier iCalendar
   * @returns {string} Contenu du fichier .ics
   */
  generate() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EcoleDirecte API//iOS Shortcuts//FR",
      `X-WR-CALNAME:${this.escapeText(this.calendarName)}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    for (const event of this.events) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${event.uid}`);
      lines.push(`DTSTAMP:${this.formatDate(new Date())}`);
      lines.push(`DTSTART:${this.formatDate(event.dtstart)}`);
      lines.push(`DTEND:${this.formatDate(event.dtend)}`);
      lines.push(`SUMMARY:${this.escapeText(event.summary)}`);
      
      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }
      
      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }
      
      if (event.categories && event.categories.length > 0) {
        lines.push(`CATEGORIES:${event.categories.join(',')}`);
      }
      
      lines.push(`STATUS:${event.status}`);
      lines.push(`CREATED:${this.formatDate(event.created)}`);
      lines.push(`LAST-MODIFIED:${this.formatDate(event.lastModified)}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    
    return lines.join("\r\n");
  }

  /**
   * Convertit les cours EcoleDirecte en événements
   * @param {Array} schedule - Emploi du temps depuis l'API
   */
  fromSchedule(schedule) {
    for (const cours of schedule) {
      const description = [];
      
      if (cours.prof) {
        description.push(`Professeur: ${cours.prof}`);
      }
      if (cours.classe) {
        description.push(`Classe: ${cours.classe}`);
      }
      if (cours.groupe) {
        description.push(`Groupe: ${cours.groupe}`);
      }
      
      this.addEvent({
        uid: `ecoledirecte-cours-${cours.id}@ecoledirecte`,
        summary: cours.isAnnule ? `[ANNULÉ] ${cours.text}` : cours.text,
        description: description.join('\n'),
        location: cours.salle,
        start: cours.start_date,
        end: cours.end_date,
        categories: [cours.codeMatiere, cours.typeCours],
        cancelled: cours.isAnnule
      });
    }
  }

  /**
   * Convertit les devoirs en événements
   * @param {Object} homework - Devoirs depuis l'API
   */
  fromHomework(homework) {
    for (const [date, devoirs] of Object.entries(homework)) {
      for (const devoir of devoirs) {
        const summary = devoir.interrogation 
          ? `📝 ${devoir.matiere} - INTERROGATION`
          : `📚 ${devoir.matiere}`;
        
        this.addEvent({
          uid: `ecoledirecte-devoir-${devoir.idDevoir}@ecoledirecte`,
          summary: summary,
          description: `Donné le: ${devoir.donneLe}`,
          start: `${date} 08:00`,
          end: `${date} 08:30`,
          categories: [devoir.codeMatiere, "DEVOIR"]
        });
      }
    }
  }

  /**
   * Sauvegarde le fichier .ics
   * @param {string} filename - Nom du fichier
   * @returns {Promise<string>} Chemin du fichier
   */
  async save(filename = "ecoledirecte.ics") {
    const content = this.generate();
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), filename);
    
    fm.writeString(path, content);
    
    return path;
  }
}

/**
 * Classe pour générer des fichiers de devoirs (Rappels/Todo)
 */
class TodoGenerator {
  constructor() {
    this.todos = [];
    this.listName = "EcoleDirecte";
  }

  /**
   * Ajoute un devoir comme todo
   * @param {Object} todo - Devoir à ajouter
   */
  addTodo(todo) {
    this.todos.push({
      uid: todo.uid || this.generateUID(),
      summary: todo.summary || "Sans titre",
      description: todo.description || "",
      due: todo.due,
      priority: todo.priority || 0,
      completed: todo.completed || false,
      categories: todo.categories || []
    });
  }

  /**
   * Génère un UID unique
   * @returns {string} UID
   */
  generateUID() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}@ecoledirecte`;
  }

  /**
   * Formate une date au format iCalendar (date seulement)
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {string} Date formatée
   */
  formatDate(date) {
    return date.replace(/-/g, '');
  }

  /**
   * Génère le contenu du fichier iCalendar VTODO
   * @returns {string} Contenu du fichier .ics
   */
  generate() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EcoleDirecte API//iOS Shortcuts//FR",
      `X-WR-CALNAME:${this.listName}`,
      "CALSCALE:GREGORIAN"
    ];

    const formatDateTime = (date) => {
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    for (const todo of this.todos) {
      lines.push("BEGIN:VTODO");
      lines.push(`UID:${todo.uid}`);
      lines.push(`DTSTAMP:${formatDateTime()}`);
      lines.push(`SUMMARY:${todo.summary.replace(/,/g, '\\,')}`);
      
      if (todo.description) {
        lines.push(`DESCRIPTION:${todo.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`);
      }
      
      if (todo.due) {
        lines.push(`DUE;VALUE=DATE:${this.formatDate(todo.due)}`);
      }
      
      if (todo.priority > 0) {
        lines.push(`PRIORITY:${todo.priority}`);
      }
      
      if (todo.categories && todo.categories.length > 0) {
        lines.push(`CATEGORIES:${todo.categories.join(',')}`);
      }
      
      lines.push(`STATUS:${todo.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`);
      lines.push("END:VTODO");
    }

    lines.push("END:VCALENDAR");
    
    return lines.join("\r\n");
  }

  /**
   * Convertit les devoirs EcoleDirecte en todos
   * @param {Object} homework - Devoirs depuis l'API
   * @param {Object} details - Détails des devoirs (optionnel)
   */
  fromHomework(homework, details = {}) {
    for (const [date, devoirs] of Object.entries(homework)) {
      for (const devoir of devoirs) {
        if (devoir.effectue) continue; // Ignorer les devoirs déjà faits
        
        const summary = devoir.interrogation 
          ? `📝 ${devoir.matiere} - INTERROGATION`
          : `📚 ${devoir.matiere}`;
        
        const priority = devoir.interrogation ? 1 : 5; // 1 = haute, 5 = normale
        
        let description = `Donné le: ${devoir.donneLe}`;
        
        // Ajouter les détails si disponibles
        if (details[date]) {
          const detail = details[date].matieres?.find(m => 
            m.aFaire?.idDevoir === devoir.idDevoir
          );
          if (detail?.aFaire?.contenu) {
            // Décoder le contenu base64 et retirer le HTML
            try {
              const decoded = Data.fromBase64String(detail.aFaire.contenu).toRawString();
              const cleanText = decoded.replace(/<[^>]+>/g, '').trim();
              description += `\n\n${cleanText}`;
            } catch {
              // Ignorer les erreurs de décodage
            }
          }
        }
        
        this.addTodo({
          uid: `ecoledirecte-devoir-${devoir.idDevoir}@ecoledirecte`,
          summary: summary,
          description: description,
          due: date,
          priority: priority,
          completed: devoir.effectue,
          categories: [devoir.codeMatiere]
        });
      }
    }
  }

  /**
   * Sauvegarde le fichier .ics de todos
   * @param {string} filename - Nom du fichier
   * @returns {Promise<string>} Chemin du fichier
   */
  async save(filename = "ecoledirecte_devoirs.ics") {
    const content = this.generate();
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), filename);
    
    fm.writeString(path, content);
    
    return path;
  }
}

// Export des classes
module.exports = {
  ICalendarGenerator,
  TodoGenerator
};

// Exécution directe
if (config.runsInApp) {
  const main = async () => {
    const client = new EcoleDirecteClient();
    
    // Charger les credentials
    const hasCredentials = await client.loadCredentials();
    
    if (!hasCredentials) {
      const alert = new Alert();
      alert.title = "Non connecté";
      alert.message = "Veuillez d'abord exécuter le raccourci de connexion.";
      alert.addAction("OK");
      await alert.present();
      return;
    }
    
    try {
      // Récupérer l'emploi du temps
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`Récupération de l'emploi du temps du ${startDate} au ${endDate}...`);
      const schedule = await client.getSchedule(startDate, endDate);
      
      // Générer le fichier iCal pour l'emploi du temps
      const calGenerator = new ICalendarGenerator();
      calGenerator.calendarName = "EcoleDirecte - Emploi du temps";
      calGenerator.fromSchedule(schedule);
      
      const calPath = await calGenerator.save("ecoledirecte_emploidutemps.ics");
      console.log(`Emploi du temps exporté: ${calPath}`);
      
      // Récupérer les devoirs
      console.log("Récupération des devoirs...");
      const homework = await client.getHomework();
      
      // Générer le fichier iCal pour les devoirs
      const todoGenerator = new TodoGenerator();
      todoGenerator.listName = "EcoleDirecte - Devoirs";
      todoGenerator.fromHomework(homework);
      
      const todoPath = await todoGenerator.save("ecoledirecte_devoirs.ics");
      console.log(`Devoirs exportés: ${todoPath}`);
      
      // Afficher le résultat
      const alert = new Alert();
      alert.title = "Export réussi";
      alert.message = `${schedule.length} cours et ${todoGenerator.todos.length} devoirs exportés.\n\nFichiers créés dans iCloud Drive/Scriptable.`;
      alert.addAction("Ouvrir l'emploi du temps");
      alert.addAction("Ouvrir les devoirs");
      alert.addCancelAction("Fermer");
      
      const choice = await alert.present();
      
      if (choice === 0) {
        QuickLook.present(calPath);
      } else if (choice === 1) {
        QuickLook.present(todoPath);
      }
      
    } catch (error) {
      const alert = new Alert();
      alert.title = "Erreur";
      alert.message = error.message;
      alert.addAction("OK");
      await alert.present();
    }
  };
  
  main();
}
