/**
 * Client API EcoleDirecte pour Scriptable
 * 
 * Ce script permet d'interagir avec l'API EcoleDirecte depuis l'application Scriptable sur iOS.
 * Il peut être utilisé comme module dans d'autres scripts ou exécuté directement.
 * 
 * @author EcoleDirecte API Documentation
 * @version 1.0.0
 * @see https://github.com/LegatronX/ecoledirecte-api
 */

const API_BASE_URL = "https://api.ecoledirecte.com";
const API_VERSION = "4.75.0";
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * Classe principale du client API EcoleDirecte
 */
class EcoleDirecteClient {
  constructor() {
    this.token = null;
    this.accounts = [];
    this.currentAccount = null;
    this.gtkCookie = null;
  }

  /**
   * Récupère le cookie GTK nécessaire pour la connexion
   * @returns {Promise<string>} Le cookie GTK
   */
  async getGtkCookie() {
    const url = `${API_BASE_URL}/v3/login.awp?gtk=1&v=${API_VERSION}`;
    const request = new Request(url);
    request.method = "GET";
    request.headers = {
      "User-Agent": USER_AGENT
    };
    
    await request.load();
    
    // Extraire le cookie GTK des cookies de réponse
    const cookies = request.response.cookies || [];
    const gtkCookie = cookies.find(c => c.name === "GTK");
    
    if (gtkCookie) {
      this.gtkCookie = gtkCookie.value;
      return this.gtkCookie;
    }
    
    // Fallback: essayer d'extraire depuis les headers
    const setCookie = request.response.headers["Set-Cookie"] || "";
    const match = setCookie.match(/GTK=([^;]+)/);
    if (match) {
      this.gtkCookie = match[1];
      return this.gtkCookie;
    }
    
    throw new Error("Impossible de récupérer le cookie GTK");
  }

  /**
   * Se connecte à EcoleDirecte
   * @param {string} username - Identifiant
   * @param {string} password - Mot de passe
   * @param {Object} fa - Objet de double authentification (optionnel)
   * @returns {Promise<Object>} Les données de connexion
   */
  async login(username, password, fa = null) {
    // Récupérer le cookie GTK si pas déjà fait
    if (!this.gtkCookie) {
      await this.getGtkCookie();
    }

    const url = `${API_BASE_URL}/v3/login.awp?v=${API_VERSION}`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Gtk": this.gtkCookie
    };

    const body = {
      identifiant: username,
      motdepasse: password,
      isRelogin: false,
      uuid: ""
    };

    if (fa) {
      body.fa = [fa];
    }

    request.body = `data=${encodeURIComponent(JSON.stringify(body))}`;
    
    const response = await request.loadJSON();

    if (response.code === 250) {
      // Double authentification requise
      return {
        requiresDoubleAuth: true,
        token: response.token,
        message: response.message
      };
    }

    if (response.code !== 200) {
      throw new Error(response.message || `Erreur de connexion (code ${response.code})`);
    }

    this.token = response.token;
    this.accounts = response.data.accounts || [];
    this.currentAccount = this.accounts[0] || null;

    return {
      success: true,
      token: this.token,
      accounts: this.accounts
    };
  }

  /**
   * Gère la double authentification
   * @returns {Promise<Object>} Question et propositions
   */
  async getDoubleAuthQuestion() {
    const url = `${API_BASE_URL}/v3/connexion/doubleauth.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = "data={}";

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération du QCM");
    }

    const question = this.decodeBase64(response.data.question);
    const propositions = response.data.propositions.map(p => ({
      encoded: p,
      decoded: this.decodeBase64(p)
    }));

    return { question, propositions };
  }

  /**
   * Répond au QCM de double authentification
   * @param {string} answerEncoded - Réponse encodée en Base64
   * @returns {Promise<Object>} cn et cv pour le login
   */
  async answerDoubleAuth(answerEncoded) {
    const url = `${API_BASE_URL}/v3/connexion/doubleauth.awp?verbe=post`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = `data=${encodeURIComponent(JSON.stringify({ choix: answerEncoded }))}`;

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Réponse incorrecte au QCM");
    }

    return {
      cn: response.data.cn,
      cv: response.data.cv
    };
  }

  /**
   * Récupère l'emploi du temps
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Liste des cours
   */
  async getSchedule(startDate, endDate) {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/E/${this.currentAccount.id}/emploidutemps.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = `data=${encodeURIComponent(JSON.stringify({
      dateDebut: startDate,
      dateFin: endDate,
      avecTrous: false
    }))}`;

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération de l'emploi du temps");
    }

    this.token = response.token; // Mettre à jour le token
    return response.data || [];
  }

  /**
   * Récupère le cahier de texte
   * @returns {Promise<Object>} Devoirs par date
   */
  async getHomework() {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/Eleves/${this.currentAccount.id}/cahierdetexte.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = "data={}";

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération des devoirs");
    }

    this.token = response.token;
    return response.data || {};
  }

  /**
   * Récupère les détails d'un jour du cahier de texte
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} Détails du jour
   */
  async getHomeworkDetails(date) {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/Eleves/${this.currentAccount.id}/cahierdetexte/${date}.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = "data={}";

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération des détails");
    }

    this.token = response.token;
    return response.data || {};
  }

  /**
   * Récupère les notes
   * @param {string} schoolYear - Année scolaire (optionnel, ex: "2023-2024")
   * @returns {Promise<Object>} Notes et périodes
   */
  async getGrades(schoolYear = "") {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/eleves/${this.currentAccount.id}/notes.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = `data=${encodeURIComponent(JSON.stringify({ anneeScolaire: schoolYear }))}`;

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération des notes");
    }

    this.token = response.token;
    return response.data || {};
  }

  /**
   * Récupère la vie scolaire (absences, retards, sanctions)
   * @returns {Promise<Object>} Données de vie scolaire
   */
  async getSchoolLife() {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/eleves/${this.currentAccount.id}/viescolaire.awp?verbe=get`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = "data={}";

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la récupération de la vie scolaire");
    }

    this.token = response.token;
    return response.data || {};
  }

  /**
   * Marque des devoirs comme effectués ou non
   * @param {number[]} done - IDs des devoirs effectués
   * @param {number[]} notDone - IDs des devoirs non effectués
   * @returns {Promise<void>}
   */
  async markHomework(done = [], notDone = []) {
    if (!this.currentAccount) {
      throw new Error("Non connecté");
    }

    const url = `${API_BASE_URL}/v3/Eleves/${this.currentAccount.id}/cahierdetexte.awp?verbe=put`;
    const request = new Request(url);
    request.method = "POST";
    request.headers = {
      "User-Agent": USER_AGENT,
      "X-Token": this.token,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    request.body = `data=${encodeURIComponent(JSON.stringify({
      idDevoirsEffectues: done,
      idDevoirsNonEffectues: notDone
    }))}`;

    const response = await request.loadJSON();

    if (response.code !== 200) {
      throw new Error(response.message || "Erreur lors de la mise à jour des devoirs");
    }

    this.token = response.token;
  }

  /**
   * Décode une chaîne Base64
   * @param {string} str - Chaîne encodée
   * @returns {string} Chaîne décodée
   */
  decodeBase64(str) {
    return Data.fromBase64String(str).toRawString();
  }

  /**
   * Encode une chaîne en Base64
   * @param {string} str - Chaîne à encoder
   * @returns {string} Chaîne encodée
   */
  encodeBase64(str) {
    return Data.fromString(str).toBase64String();
  }

  /**
   * Sauvegarde les credentials
   * @returns {Promise<void>}
   */
  async saveCredentials() {
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), "ecoledirecte_credentials.json");
    
    const data = {
      token: this.token,
      eleveId: this.currentAccount?.id,
      lastUpdate: new Date().toISOString()
    };

    fm.writeString(path, JSON.stringify(data, null, 2));
  }

  /**
   * Charge les credentials sauvegardés
   * @returns {Promise<boolean>} True si les credentials existent
   */
  async loadCredentials() {
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), "ecoledirecte_credentials.json");

    if (!fm.fileExists(path)) {
      return false;
    }

    try {
      const data = JSON.parse(fm.readString(path));
      this.token = data.token;
      this.currentAccount = { id: data.eleveId };
      return true;
    } catch {
      return false;
    }
  }
}

// Export pour utilisation comme module
module.exports = EcoleDirecteClient;

// Exécution directe pour test
if (config.runsInApp) {
  const main = async () => {
    const client = new EcoleDirecteClient();
    
    // Essayer de charger les credentials existants
    const hasCredentials = await client.loadCredentials();
    
    if (hasCredentials) {
      console.log("Credentials chargés");
      
      // Tester la connexion
      try {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const schedule = await client.getSchedule(today, nextWeek);
        console.log(`${schedule.length} cours récupérés`);
      } catch (error) {
        console.log("Token expiré, reconnexion nécessaire");
      }
    } else {
      console.log("Aucun credential trouvé. Utilisez le raccourci de connexion.");
    }
  };

  main();
}
