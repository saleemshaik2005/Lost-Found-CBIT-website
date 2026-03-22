import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const notifCount = document.getElementById("notifCount");
const notifBell = document.getElementById("notifBell");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const container = document.getElementById("itemsContainer");

/* ============================= */
/* 🔹 AUTHENTICATION & NOTIFICATIONS */
/* ============================= */

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    loginBtn.style.display = "none";
    userProfile.style.display = "flex";
    userAvatar.src = user.photoURL;
    localStorage.setItem("userUID", user.uid);

    // 🔔 REAL-TIME NOTIFICATIONS: Listen for claims sent to this user
    const claimsQuery = query(
      collection(db, "claims"), 
      where("finderId", "==", user.uid),
      where("status", "==", "Pending")
    );

    // Listen for real-time changes in the claims collection
    onSnapshot(claimsQuery, (snapshot) => {
      const count = snapshot.size;
      if (count > 0) {
        notifCount.innerText = count;
        notifCount.style.display = "block";
      } else {
        notifCount.style.display = "none";
      }
    });

    // Make the notification bell clickable
    if (notifBell) {
      notifBell.onclick = () => {
        window.location.href = "notifications.html";
      };
    }

  } else {
    // User is signed out
    loginBtn.style.display = "block";
    userProfile.style.display = "none";
    localStorage.removeItem("userUID");
  }
});

/* ============================= */
/* 🔹 AUTH ACTIONS */
/* ============================= */

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

/* ============================= */
/* 🔹 GLOBAL DATA */
/* ============================= */

let items = [];
const now = Date.now();

/* ============================= */
/* 🔹 LOAD ITEMS FROM FIREBASE */
/* ============================= */

async function loadItems() {
  const querySnapshot = await getDocs(collection(db, "items"));
  items = [];

  querySnapshot.forEach((doc) => {
    items.push(doc.data());
  });

  // Remove expired (14 days)
  items = items.filter(item => {
    const days = (now - item.createdAt) / (1000 * 60 * 60 * 24);
    return days <= 14;
  });

  // Sort latest first
  items.sort((a, b) => b.createdAt - a.createdAt);
  displayItems(items);
}

/* ============================= */
/* 🔹 DISPLAY ITEMS */
/* ============================= */

function displayItems(data) {
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <h3>No items found</h3>
        <p>Try changing your search or filters</p>
      </div>
    `;
    return;
  }

  data.forEach(item => {
    const isNew = (now - item.createdAt) < (24 * 60 * 60 * 1000);
    const image = (item.images && item.images.length > 0)
      ? item.images[0]
      : "https://via.placeholder.com/300";

    const card = `
      <div class="card" data-id="${item.id}">
        <img src="${image}" alt="${item.title}">
        <div class="card-content">
          <span class="tag ${item.type.toLowerCase()}">${item.type}</span>
          ${item.status === "Recovered" ? '<span class="tag recovered">Recovered</span>' : ''}
          ${isNew ? '<span class="tag" style="background: orange; color: white;">NEW</span>' : ''}
          <h3>${item.title}</h3>
          <p>${item.location}</p>
          <p>${getTimeAgo(item.createdAt)}</p>
        </div>
      </div>
    `;

    container.innerHTML += card;
  });

  // Re-attach listeners to new cards
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      openDetails(id);
    });
  });
}

/* ============================= */
/* 🔹 FILTER LOGIC */
/* ============================= */

function applyFilters() {
  let filtered = [...items];
  const searchValue = searchInput.value.toLowerCase();
  const categoryValue = categoryFilter.value;
  const typeValue = typeFilter.value;

  if (searchValue) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(searchValue) ||
      item.description.toLowerCase().includes(searchValue) ||
      item.location.toLowerCase().includes(searchValue)
    );
  }

  if (categoryValue) filtered = filtered.filter(item => item.category === categoryValue);
  if (typeValue) filtered = filtered.filter(item => item.type === typeValue);

  displayItems(filtered);
}

/* ============================= */
/* 🔹 EVENTS */
/* ============================= */

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);

/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

function openDetails(id) {
  localStorage.setItem("selectedItemId", id);
  window.location.href = "details.html";
}

function resetFilters() {
  searchInput.value = "";
  categoryFilter.value = "";
  typeFilter.value = "";
  displayItems(items);
}

function getTimeAgo(time) {
  const seconds = Math.floor((Date.now() - time) / 1000);
  const intervals = [
    { label: "day", value: 86400 },
    { label: "hour", value: 3600 },
    { label: "minute", value: 60 }
  ];

  for (let i of intervals) {
    const count = Math.floor(seconds / i.value);
    if (count > 0) return `Posted ${count} ${i.label}${count > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

/* ============================= */
/* 🔹 INITIAL LOAD */
/* ============================= */

loadItems();
window.resetFilters = resetFilters;