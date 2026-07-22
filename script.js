window.toggleMenu = function() {
    const nav = document.querySelector('.mobile-nav');
    nav.classList.toggle('is-open');
};

// Initialisation de Supabase
// Use global 'supabase' if window.supabaseClient is not set, or check global scope
const supabaseInstance = window.supabase || supabase;
if (!window.supabaseClient && supabaseInstance) {
  window.supabaseClient = supabaseInstance.createClient("https://xgyxmumkgxcangelvrri.supabase.co", "sb_publishable_iCPhtt12seUCDeWNbpmcLw_29nVb1WM");
}
var supabase = window.supabaseClient;


const STORAGE_KEY = "nexera-profile-v1";
const ACTIVE_USER_KEY = "nexera-active-user-v1";

// Nouvelles fonctions Supabase
async function fetchProfileFromSupabase(uid) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) throw error;
    // Remapping snake_case to camelCase
    return {
        ...data,
        challengeDays: data.challenge_days,
        completedChallenges: data.completed_challenges,
        lastChallengeDate: data.last_challenge_date
    };
  } catch (error) {
    console.warn("Supabase fetch failed, using local fallback:", error);
    return null;
  }
}

async function saveProfileToSupabase(uid, profile) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: uid, 
        name: profile.name,
        email: profile.email,
        progress: profile.progress,
        challenge_days: profile.challengeDays,
        completed_challenges: profile.completedChallenges,
        streak: profile.streak,
        last_challenge_date: profile.lastChallengeDate,
        journal: profile.journal
      });
    if (error) throw error;
  } catch (error) {
    console.error("Supabase save failed:", error);
    if (error && typeof error === 'object') {
        console.error("Error details:", JSON.stringify(error, null, 2));
    }
  }
}

const defaultProfile = {
  progress: 12,
  challengeDays: 0,
  completedChallenges: 0,
  streak: 0,
  lastChallengeDate: ""
};

async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    try {
      return { ...defaultProfile, ...JSON.parse(localStorage.getItem(getProfileKey()) || "{}") };
    } catch {
      return { ...defaultProfile };
    }
  }

  const dbProfile = await fetchProfileFromSupabase(user.id);
  return dbProfile ? { ...defaultProfile, ...dbProfile } : { ...defaultProfile };
}

async function saveProfile(profile) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await saveProfileToSupabase(user.id, profile);
  }
  localStorage.setItem(getProfileKey(), JSON.stringify(profile));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || "null"); } catch { return null; }
}

function getProfileKey() {
  const user = getCurrentUser();
  return user ? `${STORAGE_KEY}-${user.email}` : STORAGE_KEY;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setWidth(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.width = `${value}%`;
}

async function updateInterface() {
  const profile = await getProfile();
  // ... (code existant)

  // Statistiques communautaires réelles
  fetchAndSetCommunityStats();

  // ... (suite du code existant)
}

async function fetchAndSetCommunityStats() {
    const { count: membersCount, error: membersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    
    const { count: journalsCount, error: journalsError } = await supabase
        .from('journals')
        .select('*', { count: 'exact', head: true });

    if (!membersError) setText("totalMembers", (membersCount || 0).toLocaleString("fr-FR"));
    if (!journalsError) {
        setText("totalChallenges", (journalsCount || 0).toLocaleString("fr-FR"));
        setText("totalLearningHours", Math.floor((journalsCount || 0) * 0.75).toLocaleString("fr-FR")); // Estimation arbitraire pour l'exemple
    }
}
  setText("dashboardGreeting", currentUser ? `Bonjour, ${currentUser.name}.` : "Bonjour, bâtisseur.");
  setText("levelLabel", level === 1 ? "Explorateur" : "En progression");
  setText("dashboardProgress", `${profile.progress}%`);
  setText("dashboardPercent", `${profile.progress} %`);
  setText("completedChallenges", profile.completedChallenges);
  setText("streakValue", `${profile.streak} j`);
  setText("dashboardChallengeText", `${profile.challengeDays} jour${profile.challengeDays > 1 ? "s" : ""} validé${profile.challengeDays > 1 ? "s" : ""} sur 7`);
  setWidth("dashboardProgressBar", profile.progress);

  const journal = document.getElementById("quickJournal");
  if (journal && !journal.value) journal.value = profile.journal;
}

async function completeChallenge() {
  const profile = await getProfile();
  const today = new Date().toISOString().slice(0, 10);

  if (profile.lastChallengeDate === today) {
    setText("gameResult", "Ta journée est déjà validée. Reviens demain pour continuer ta série !");
    return;
  }

  if (profile.challengeDays < 7) {
    profile.challengeDays += 1;
    profile.progress = Math.min(100, profile.progress + 4);
    profile.streak += 1;
    profile.lastChallengeDate = today;
    if (profile.challengeDays === 7) profile.completedChallenges += 1;
    await saveProfile(profile);
  }

  setText("progress", `${profile.challengeDays}/7`);
  setText("gameResult", profile.challengeDays === 7 ? "Défi terminé : superbe régularité !" : "Journée validée. Continue demain !");
  await updateInterface();
}

async function addLearningProgress() {
  const profile = await getProfile();
  profile.progress = Math.min(100, profile.progress + 8);
  await saveProfile(profile);
  await updateInterface();
}

async function saveQuickJournal() {
  const input = document.getElementById("quickJournal");
  if (!input) return;
  const profile = await getProfile();
  profile.journal = input.value.trim();
  await saveProfile(profile);
  setText("journalSaved", profile.journal ? "Réflexion enregistrée." : "Écris une réflexion avant d’enregistrer.");
}

function lifeChoice(choice) {
  setText("gameResult", choice === "retry" ? "Mentalité forte. Tu évolues." : "Abandonner est aussi une réponse, mais pas une croissance.");
}

async function saveJournal() {
  const input = document.getElementById("journalInput");
  if (!input) return;
  const profile = await getProfile();
  profile.journal = input.value;
  await saveProfile(profile);
  setText("journalDisplay", "Sauvegardé.");
}

async function loadJournal() {
  const profile = await getProfile();
  const input = document.getElementById("journalInput");
  if (input) input.value = profile.journal;
  setText("journalDisplay", profile.journal || "Aucun texte enregistré.");
}

const questions = [
  "Qu'est-ce que tu évites en ce moment ?",
  "Qu'est-ce qui te bloque vraiment ?",
  "Qui veux-tu devenir ?",
  "Est-ce que tu vis ou tu existes ?"
];

function newQuestion() {
  setText("questionBox", questions[Math.floor(Math.random() * questions.length)]);
}

function setDailyQuote() {
  const quotes = [
    ["La constance transforme les petites actions en grandes évolutions.", "— NeXera"],
    ["Tu n’as pas besoin d’être parfait. Tu as besoin d’être présent.", "— NeXera"],
    ["Le changement commence lorsque tes choix deviennent plus forts que tes excuses.", "— NeXera"],
    ["Chaque journée est une occasion silencieuse de te rapprocher de toi-même.", "— NeXera"]
  ];
  const quote = quotes[new Date().getDate() % quotes.length];
  setText("dailyQuote", quote[0]);
  setText("quoteAuthor", quote[1]);
}

function showAuthForm(formName) {
  console.log(`showAuthForm: Appelée avec formName = ${formName}`);
  const isLogin = formName === "login";
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  console.log("showAuthForm: Éléments trouvés:", { loginForm, signupForm, loginTab, signupTab });

  if (!loginForm || !signupForm || !loginTab || !signupTab) {
    console.error("showAuthForm: Un ou plusieurs éléments d'authentification sont introuvables.");
    return;
  }
  loginForm.classList.toggle("is-hidden", !isLogin);
  signupForm.classList.toggle("is-hidden", isLogin);
  loginTab.classList.toggle("is-active", isLogin);
  signupTab.classList.toggle("is-active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  signupTab.setAttribute("aria-selected", String(!isLogin));
  setText("authMessage", "");
  console.log("showAuthForm: Basculement des formulaires effectué.");
}

function showAuthMessage(message, isError = false) {
  const messageBox = document.getElementById("authMessage");
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.classList.toggle("is-error", isError);
}

async function signUp(event) {
  event.preventDefault();
  console.log("signUp function triggered");
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  console.log("Data:", { name, email, password });

  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    
    // Création automatique du profil dans Supabase
    await supabase.from('profiles').insert([{ id: data.user.id, name, email }]);
    
    console.log("Signup success");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Signup error:", error);
    showAuthMessage(error.message, true);
  }
}

async function login(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = "dashboard.html";
  } catch (error) {
    showAuthMessage("E-mail ou mot de passe incorrect.", true);
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.replace("auth.html");
}

function syncSupabaseSession() {
  supabase.auth.onAuthStateChange((event, session) => {
    const requiresAuth = document.body.dataset.requiresAuth === "true";
    const isAuthPage = window.location.pathname.endsWith("auth.html");

    if (session) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify({
        name: session.user.user_metadata.name || session.user.email.split("@")[0],
        email: session.user.email
      }));
      if (isAuthPage) window.location.replace("dashboard.html");
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
      if (requiresAuth && !isAuthPage) window.location.replace("auth.html");
    }
    updateInterface();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setDailyQuote();
  updateInterface();
  syncSupabaseSession();

  // Attachement des événements pour dashboard.html
  const completeChallengeBtn = document.getElementById("completeChallengeBtn");
  if (completeChallengeBtn) completeChallengeBtn.addEventListener("click", completeChallenge);

  const saveJournalBtn = document.getElementById("saveJournalBtn");
  if (saveJournalBtn) saveJournalBtn.addEventListener("click", saveQuickJournal);
  
  const addProgressBtn = document.getElementById("addProgressBtn");
  if (addProgressBtn) addProgressBtn.addEventListener("click", addLearningProgress);
});

// Exposer les fonctions au scope global pour les appels onclick dans le HTML
window.showAuthForm = showAuthForm;
window.login = login;
window.signUp = signUp;
window.logout = logout;
window.completeChallenge = completeChallenge;
window.addLearningProgress = addLearningProgress;
window.saveQuickJournal = saveQuickJournal;
window.saveJournal = saveJournal;
window.loadJournal = loadJournal;
window.newQuestion = newQuestion;
window.setDailyQuote = setDailyQuote;
window.updateInterface = updateInterface;
window.handleSaveJournal = async function handleSaveJournal() {
  const input = document.getElementById("journalInput");
  if (!input || !input.value.trim()) {
    alert("Veuillez écrire quelque chose.");
    return;
  }
  const success = await saveJournalEntry(input.value.trim());
  if (success) {
    input.value = "";
    displayJournalEntries();
  }
};

window.displayJournalEntries = async function displayJournalEntries() {
  const entries = await fetchJournalEntries();
  const list = document.getElementById("journalEntriesList");
  if (!list) return;

  if (entries.length === 0) {
    list.innerHTML = "<p>Aucune entrée.</p>";
    return;
  }

  list.innerHTML = entries.map(entry => `
    <div class="journal-entry">
      <small>${new Date(entry.created_at).toLocaleString()}</small>
      <p>${entry.content}</p>
    </div>
  `).join('');
};

async function saveJournalEntry(content) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Vous devez être connecté pour sauvegarder votre journal.");
    return;
  }

  const { error } = await supabase
    .from('journals')
    .insert([{ user_id: user.id, content: content }]);

  if (error) {
    console.error("Error saving journal entry:", error);
    alert("Erreur lors de la sauvegarde.");
    return;
  }
  return true;
}

window.fetchJournalEntries = async function fetchJournalEntries(limit = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching journal entries:", error);
    return [];
  }
  console.log("Journal entries fetched:", data);
  return data;
};

window.renderJournalEntries = function renderJournalEntries(entries, elementId) {
  const list = document.getElementById(elementId);
  if (!list) return;

  if (entries.length === 0) {
    list.innerHTML = "<p>Aucune entrée.</p>";
    return;
  }

  list.innerHTML = entries.map(entry => `
    <div class="journal-entry">
      <small>${new Date(entry.created_at).toLocaleString()}</small>
      <p>${entry.content}</p>
    </div>
  `).join('');
};

window.displayJournalEntries = async function displayJournalEntries(limit = null, elementId = 'journalEntriesList') {
  const entries = await fetchJournalEntries(limit);
  renderJournalEntries(entries, elementId);
};

window.fetchPosts = async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
  return data;
};

window.addPost = async function addPost(content) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Vous devez être connecté pour publier.");
    return;
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert([{ 
        id: user.id, 
        name: user.user_metadata?.name || user.email.split('@')[0], 
        email: user.email 
    }]);
    
    if (insertError) {
         console.error("Error creating profile:", insertError);
         alert("Erreur lors de la création du profil: " + insertError.message);
         return;
    }
  }

  const { error } = await supabase
    .from('posts')
    .insert([{ user_id: user.id, content }]);

  if (error) {
    console.error("Error adding post:", error);
    alert("Erreur lors de la publication: " + error.message);
  }
};
