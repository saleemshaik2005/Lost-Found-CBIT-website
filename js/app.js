import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const dropdownMenu = document.getElementById("dropdownMenu");

/* ============================= */
/* 🔹 DROPDOWN LOGIC */
/* ============================= */

// Function to show/hide the profile menu
function toggleDropdown() {
  if (dropdownMenu) {
    dropdownMenu.classList.toggle("show");
  }
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('#userAvatar')) {
    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
    }
  }
}

/* ============================= */
/* 🔹 AUTHENTICATION & NOTIFICATIONS */
/* ============================= */

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    userProfile.style.display = "flex";
    userAvatar.src = user.photoURL;
    localStorage.setItem("userUID", user.uid);

    // 🔔 Incoming claims for you as a Finder
    const incomingClaimsQuery = query(
      collection(db, "claims"), 
      where("finderId", "==", user.uid),
      where("status", "==", "Pending")
    );

    // 🔔 Approved claims for you as a Claimer
    const approvedClaimsQuery = query(
      collection(db, "claims"),
      where("claimerId", "==", user.uid),
      where("status", "==", "Approved")
    );

    let incomingCount = 0;
    let approvedCount = 0;

    const updateBell = () => {
      const total = incomingCount + approvedCount;
      if (total > 0) {
        notifCount.innerText = total;
        notifCount.style.display = "block";
      } else {
        notifCount.style.display = "none";
      }
    };

    onSnapshot(incomingClaimsQuery, (snapshot) => {
      incomingCount = snapshot.size;
      updateBell();
    });

    onSnapshot(approvedClaimsQuery, (snapshot) => {
      approvedCount = snapshot.size;
      updateBell();
    });

    if (notifBell) {
      notifBell.onclick = () => {
        window.location.href = "notifications.html";
      };
    }

  } else {
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
/* 🔹 LOAD ITEMS & AUTO-DELETE LOGIC */
/* ============================= */

async function loadItems() {
  const querySnapshot = await getDocs(collection(db, "items"));
  items = [];
  const deletePromises = [];

  querySnapshot.forEach((document) => {
    const data = document.data();
    const docId = document.id; 
    const ageInDays = (now - data.createdAt) / (1000 * 60 * 60 * 24);

    let shouldDelete = false;

    if (data.status !== "Recovered" && ageInDays >= 10) {
      shouldDelete = true;
    }

    if (data.status === "Recovered" && data.recoveredAt) {
      const recoveredAge = (now - data.recoveredAt) / (1000 * 60 * 60 * 24);
      if (recoveredAge >= 5) {
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      deletePromises.push(deleteDoc(doc(db, "items", docId)));
    } else {
      items.push({ ...data, docId }); 
    }
  });

  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  displayItems(items);
}

/* ============================= */
/* 🔹 DISPLAY ITEMS */
/* ============================= */

function displayItems(data) {
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `<div class="empty"><h3>No items found</h3><p>Try changing your filters</p></div>`;
    return;
  }

  data.forEach(item => {
    const isNew = (now - item.createdAt) < (24 * 60 * 60 * 1000);
    
    const image = (item.images && item.images.length > 0) 
      ? item.images[0] 
      : "images/placeholder.jpg"; 

    const card = `
      <div class="card" data-id="${item.docId}">
        <img src="${image}" alt="${item.title}" onerror="this.src='images/placeholder.png'">
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

  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const docId = card.getAttribute("data-id");
      openDetails(docId);
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

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);

/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

function openDetails(docId) {
  localStorage.setItem("selectedItemId", docId);
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
window.toggleDropdown = toggleDropdown;