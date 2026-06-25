import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
setDoc,
collection,
addDoc,
getDocs,
deleteDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ================= FIREBASE =================

const firebaseConfig = {
apiKey: "AIzaSyBOhJwsdtFCMuYXbGe8Wny3yqxj_5Yw3Q4",
authDomain: "nallundai.firebaseapp.com",
projectId: "nallundai",
storageBucket: "nallundai.firebasestorage.app",
messagingSenderId: "329650534635",
appId: "1:329650534635:web:19002810daacf372f3e6ae",
measurementId: "G-2KP7K0G3VF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= DATA =================

const passwords = {
"Pääministeri": "7986",
"Poliisi": "8234",
"Kierrättäjä": "3456",
"Puolustusministeri": "9765",
"Rajavartija": "9088",
"Kirjastonhoitaja": "3537",
"Pankkiiri": "8474",
"Lääkäri": "9967",
"Valtio": "1111",
"VEPOHO-YHTYMÄ": "1234",
"OSARYHTYMÄ": "5678"
};

const defaultBalances = {
"Pääministeri": 50000,
"Puolustusministeri": 40000,
"Pankkiiri": 30000,
"Poliisi": 20000,
"Lääkäri": 20000,
"Kierrättäjä": 15000,
"Kirjastonhoitaja": 10000,
"Rajavartija": 20000,
"Valtio": 20951000,
"VEPOHO-YHTYMÄ": 50000,
"OSARYHTYMÄ": 50000
};

let currentRole = "";

// ================= BALANCE =================

async function getBalance(role) {
const ref = doc(db, "balances", role);
const snap = await getDoc(ref);

if (!snap.exists()) {
await setDoc(ref, { balance: defaultBalances[role] || 0 });
return defaultBalances[role] || 0;
}

return snap.data().balance;
}

async function setBalance(role, amount) {
await setDoc(doc(db, "balances", role), { balance: amount });
}

// ================= LOGIN =================

window.login = function () {
const role = document.getElementById("role").value;
const pass = document.getElementById("password").value;

if (passwords[role] !== pass) return alert("Väärä salasana!");

sessionStorage.setItem("loggedInRole", role);
location.reload();
};

// ================= LOAD =================

window.onload = async function () {
const savedRole = sessionStorage.getItem("loggedInRole");
const savedPage = sessionStorage.getItem("activePage") || "home";

if (savedRole) {
currentRole = savedRole;

document.getElementById("loginPage").style.display = "none";
document.getElementById("dashboard").style.display = "block";

const bal = await getBalance(currentRole);
document.getElementById("userBalance").textContent =
parseInt(bal).toLocaleString("fi-FI");

show(savedPage);
showNotifications();
renderShop();
renderSuggestions();
}
};

// ================= NAV =================

window.show = function (pageId) {
sessionStorage.setItem("activePage", pageId);

document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
document.getElementById(pageId).classList.add("active");

if (pageId === "shopping") renderShop();
if (pageId === "admin-panel") showAdminPanel();
};

// ================= TRANSACTIONS =================

window.processTransaction = async function (multiplier) {
const reason = document.getElementById("transactionReason").value;
const target = document.getElementById("targetRole").value;
const amount = parseInt(document.getElementById("globalAmount").value);

if (!reason || isNaN(amount) || amount <= 0)
return alert("Täytä tiedot!");

let bal = await getBalance(target);

if (multiplier === 1) {
await setBalance(target, bal + amount);
} else {
if (bal < amount) return alert("Ei varoja!");
await setBalance(target, bal - amount);
}

alert("Valmis!");
};

// ================= SHOP =================

window.addProduct = async function () {
if (currentRole !== "Valtio") return alert("Vain Valtio!");

await addDoc(collection(db, "shopItems"), {
name: itemName.value,
desc: itemDesc.value,
price: parseInt(itemPrice.value),
category: itemCategory.value,
isSoldOut: false
});

renderShop();
};

window.renderShop = async function () {
const container = document.getElementById("shop-items-container");
if (!container) return;

const snap = await getDocs(collection(db, "shopItems"));

container.innerHTML = "";

snap.forEach(docSnap => {
const item = docSnap.data();

container.innerHTML += `
<div style="background:#1e293b;padding:10px;margin:10px;">
<strong>${item.name}</strong> - ${item.price}€
<p>${item.desc}</p>

<button onclick="buy('${docSnap.id}', ${item.price}, '${item.name}')">
Osta
</button>
</div>`;
});
};

// ================= BUY =================

window.buy = async function (id, price, name) {
let bal = await getBalance(currentRole);

if (bal < price) return alert("Ei varoja!");

await setBalance(currentRole, bal - price);

await addDoc(collection(db, "pendingRequests"), {
role: currentRole,
item: name,
price
});

alert("Ostopyyntö lähetetty!");
};

// ================= ADMIN =================

window.showAdminPanel = async function () {
if (currentRole !== "Valtio") {
alert("Vain Valtio");
return;
}

const balC = document.getElementById("all-balances");
balC.innerHTML = "<h3>Saldot</h3>";

for (let r in passwords) {
const b = await getBalance(r);
balC.innerHTML += `<div>${r}: ${b}€</div>`;
}

const reqSnap = await getDocs(collection(db, "pendingRequests"));

const shopC = document.getElementById("request-list");
shopC.innerHTML = "<h4>Ostopyynnöt</h4>";

reqSnap.forEach(docSnap => {
const r = docSnap.data();

shopC.innerHTML += `
<div>
${r.role}: ${r.item} (${r.price}€)
<button onclick="approveShop('${docSnap.id}', '${r.role}', ${r.price})">✔</button>
</div>`;
});
};

// ================= APPROVE =================

window.approveShop = async function (id, role, price) {
let bal = await getBalance(role);
let val = await getBalance("Valtio");

await setBalance(role, bal - price);
await setBalance("Valtio", val + price);

await deleteDoc(doc(db, "pendingRequests", id));

alert("Hyväksytty!");
showAdminPanel();
};

// ================= NOTIFICATIONS =================

window.showNotifications = async function () {
const container = document.getElementById("all-notifications");
if (!container) return;

const snap = await getDocs(collection(db, "notifications"));

container.innerHTML = "";

snap.forEach(d => {
const n = d.data();
if (n.role === currentRole) {
container.innerHTML += `<div>${n.text}</div>`;
}
});
};

// ================= SUGGESTIONS =================

window.submitSuggestion = async function () {
await addDoc(collection(db, "suggestions"), {
from: currentRole,
text: devSuggestion.value,
reply: ""
});

devSuggestion.value = "";
alert("Lähetetty!");
};

window.renderSuggestions = async function () {
const container = document.getElementById("suggestion-responses");
if (!container) return;

const snap = await getDocs(collection(db, "suggestions"));

container.innerHTML = "";

snap.forEach(d => {
const s = d.data();

container.innerHTML += `
<div style="background:#2d3748;padding:10px;margin:10px;">
<strong>${s.from}</strong>: ${s.text}
${s.reply ? `<p>${s.reply}</p>` : ""}
</div>`;
});
};
