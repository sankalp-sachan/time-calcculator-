const API_BASE = "http://localhost:5000/api"; // adjust if needed

// ===== DOM references =====
const qs = (s) => document.querySelector(s);
const showLogin = qs("#show-login");
const showSignup = qs("#show-signup");
const authArea = qs("#auth-area");
const userArea = qs("#user-area");
const userLabel = qs("#user-label");
const logoutBtn = qs("#logout");
const authCard = qs("#auth-card");
const tabLogin = qs("#tab-login");
const tabSignup = qs("#tab-signup");
const fieldUsername = qs("#field-username");
const signupName = qs("#signup-name");
const authForm = qs("#auth-form");
const authEmail = qs("#auth-email");
const authPassword = qs("#auth-password");

const dashboard = qs("#dashboard");
const profile = qs("#profile");
const about = qs("#about");
const navDashboard = qs("#nav-dashboard");
const navProfile = qs("#nav-profile");
const navAbout = qs("#nav-about");
const personNameInput = qs("#person-name");
const setPersonBtn = qs("#set-person");
const personDisplay = qs("#person-display");
const timeForm = qs("#time-form");
const hoursInput = qs("#hours");
const minutesInput = qs("#minutes");
const timeList = qs("#time-list");
const totalTimeEl = qs("#total-time");
const errorMessage = qs("#error-message");
const btnReset = qs("#btn-reset");
const userMini = qs("#user-mini");
const profileName = qs("#profile-name");
const profileEmail = qs("#profile-email");
const deleteAccountBtn = qs("#delete-account");
const searchInput = qs("#search");
const themeToggle = qs("#theme-toggle");
const savePersonBtn = document.getElementById("save-person");
const savedPersonsList = document.getElementById("saved-persons-list");

// ===== Helper: Get storage key for person =====
function getPersonKey() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.email ? "tc_person_" + user.email : "tc_person_guest";
}

// ===== Tabs (Login / Signup) =====
let isSignup = false;
tabLogin.onclick = () => {
  isSignup = false;
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  fieldUsername.classList.add("hidden");
};
tabSignup.onclick = () => {
  isSignup = true;
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  fieldUsername.classList.remove("hidden");
};

// ===== Signup / Login =====
authForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value.trim();
  const username = signupName.value.trim() || email.split("@")[0];
  const endpoint = isSignup ? "/signup" : "/login";
  if (!email || !password) return alert("Email and password required");

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isSignup ? { username, email, password } : { email, password }
      ),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Authentication failed");
    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify({ username: data.username, email: data.email })
    );
    bootstrapAuth();
    authForm.reset();
  } catch (err) {
    alert(err.message);
  }
};

// ===== Show auth card =====
showLogin.onclick = () => {
  authCard.classList.remove("hidden");
  isSignup = false;
  tabLogin.click();
};
showSignup.onclick = () => {
  authCard.classList.remove("hidden");
  isSignup = true;
  tabSignup.click();
};

// ===== Logout =====
logoutBtn.onclick = () => {
  if (confirm("Logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.reload();
  }
};

// ===== Initialize user session =====
function bootstrapAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token || !user.email) return;

  authArea.classList.add("hidden");
  userArea.classList.remove("hidden");
  userLabel.textContent = user.username || user.email;
  userMini.textContent = "Signed in as " + (user.username || user.email);
  profileName.value = user.username;
  profileEmail.value = user.email;
  authCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  profile.classList.add("hidden");
  about.classList.add("hidden");

  const pn = localStorage.getItem(getPersonKey());
  if (pn) {
    personNameInput.value = pn;
    personDisplay.textContent = pn;
  } else {
    personDisplay.textContent = "No person selected";
  }
  renderEntries();
}

// ===== Set person name =====
setPersonBtn.onclick = () => {
  const pn = personNameInput.value.trim();
  if (!pn) return alert("Enter a name");
  localStorage.setItem(getPersonKey(), pn);
  personDisplay.textContent = pn;
  renderEntries();
};

// ===== Fetch & render entries =====
async function renderEntries(filter = "") {
  const token = localStorage.getItem("token");
  const personName = localStorage.getItem(getPersonKey());
  if (!token || !personName) return;

  try {
    const res = await fetch(
      `${API_BASE}/entries?personName=${encodeURIComponent(personName)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const entries = await res.json();
    if (!Array.isArray(entries)) return;

    timeList.innerHTML = "";
    let totalMinutes = 0;
    const q = filter.trim().toLowerCase();

    entries
      .slice()
      .reverse()
      .forEach((e) => {
        if (q && !e.personName.toLowerCase().includes(q)) return;
        const li = document.createElement("li");
        li.className = "time-item";
        li.innerHTML = `
          <div>
            <div><strong>${e.hours}h ${e.minutes}m</strong></div>
            <div class="time-meta">${new Date(
              e.createdAt
            ).toLocaleString()}</div>
          </div>
          <div><button class="btn-ghost" data-id="${
            e._id
          }" title="Delete">✖</button></div>`;
        li.querySelector("button").onclick = () => deleteEntry(e._id);
        timeList.appendChild(li);
        totalMinutes += e.hours * 60 + e.minutes;
      });

    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    totalTimeEl.textContent = `${hrs}h ${mins}m`;
  } catch (err) {
    console.error(err);
  }
}

// ===== Add new entry =====
timeForm.onsubmit = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) return alert("Please login");

  const personName = localStorage.getItem(getPersonKey());
  if (!personName) return alert("Set person name first");

  const hours = parseInt(hoursInput.value) || 0;
  const minutes = parseInt(minutesInput.value) || 0;
  if (minutes < 0 || minutes > 59) {
    errorMessage.style.display = "block";
    errorMessage.textContent = "Minutes must be between 0–59";
    return;
  }
  errorMessage.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ personName, hours, minutes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add entry");
    hoursInput.value = "";
    minutesInput.value = "";
    renderEntries();
  } catch (err) {
    alert(err.message);
  }
};

// ===== Delete entries (reset person) =====
async function deleteEntry(entryId) {
  const token = localStorage.getItem("token");
  if (!token) return;
  if (!confirm("Delete this entry?")) return;

  const personName = localStorage.getItem(getPersonKey());
  try {
    await fetch(
      `${API_BASE}/entries?personName=${encodeURIComponent(personName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    renderEntries();
  } catch (err) {
    console.error(err);
  }
}

// ===== Reset person data =====
btnReset.onclick = async () => {
  const token = localStorage.getItem("token");
  const personName = localStorage.getItem(getPersonKey());
  if (!token || !personName) return;
  if (!confirm("Reset all entries for this person?")) return;
  try {
    await fetch(
      `${API_BASE}/entries?personName=${encodeURIComponent(personName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    localStorage.removeItem(getPersonKey());
    personNameInput.value = "";
    personDisplay.textContent = "No person selected";
    renderEntries();
  } catch (err) {
    console.error(err);
  }
};

// ===== Save person data to MongoDB =====
savePersonBtn.onclick = async () => {
  const personName = localStorage.getItem(getPersonKey());
  if (!personName) return alert("Set person name first");

  const entries = await getEntriesFromServer(personName);
  if (!entries || entries.length === 0) {
    alert("No entries to save");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/save-person`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ personName, entries }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save person data");
    alert(`Saved data for ${personName}`);
    renderSavedPersons();
  } catch (err) {
    alert(err.message);
  }
};

// === Fetch entries directly from backend ===
async function getEntriesFromServer(personName) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(
      `${API_BASE}/entries?personName=${encodeURIComponent(personName)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

// === Fetch saved persons from backend ===
async function getSavedPersonsFromServer() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/saved-persons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}

// === Render "About" section (MongoDB data) ===
async function renderSavedPersons() {
  const saved = await getSavedPersonsFromServer();
  if (!savedPersonsList) return;
  savedPersonsList.innerHTML = "";

  if (!saved || saved.length === 0) {
    savedPersonsList.innerHTML = "<p>No saved persons yet.</p>";
    return;
  }

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";

  saved.forEach((item) => {
    let totalMins = item.entries.reduce(
      (acc, e) => acc + (e.hours * 60 + e.minutes),
      0
    );
    const li = document.createElement("li");
    li.style.padding = "6px 0";
    li.innerHTML = `<strong>${item.personName}</strong> — Total: ${Math.floor(
      totalMins / 60
    )}h ${totalMins % 60}m`;
    ul.appendChild(li);
  });

  savedPersonsList.appendChild(ul);
}

// ===== Search/filter =====
searchInput.oninput = () => renderEntries(searchInput.value);

// ===== Theme toggle =====
themeToggle.onclick = () => {
  document.documentElement.classList.toggle("dark");
  themeToggle.textContent = document.documentElement.classList.contains("dark")
    ? "☀️"
    : "🌙";
};

// ===== Navigation =====
navDashboard.onclick = () => showSection("dashboard");
navProfile.onclick = () => showSection("profile");
navAbout.onclick = async () => {
  showSection("about");
  await renderSavedPersons();
};

function showSection(id) {
  ["dashboard", "profile", "about"].forEach((s) =>
    qs("#" + s).classList.add("hidden")
  );
  qs("#" + id).classList.remove("hidden");
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  if (id === "dashboard") navDashboard.classList.add("active");
  if (id === "profile") navProfile.classList.add("active");
  if (id === "about") navAbout.classList.add("active");
}

// ===== Init =====
window.addEventListener("load", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (token && user.email) bootstrapAuth();
  else authCard.classList.remove("hidden");

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") searchInput.value = "";
    renderEntries();
  });
});
