/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const container = document.getElementById("itemsContainer");


/* ============================= */
/* 🔹 LOAD & PREPARE DATA */
/* ============================= */

// Load items from localStorage
let items = JSON.parse(localStorage.getItem("items")) || [];

const now = Date.now();

// Remove expired items (older than 14 days)
items = items.filter(item => {
  const days = (now - item.createdAt) / (1000 * 60 * 60 * 24);
  return days <= 14;
});

// Save cleaned data back
localStorage.setItem("items", JSON.stringify(items));

// Sort items (latest first)
items.sort((a, b) => b.createdAt - a.createdAt);


/* ============================= */
/* 🔹 DISPLAY ITEMS */
/* ============================= */

function displayItems(data) {
  container.innerHTML = "";

  // Empty state
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <h3>No items found</h3>
        <p>Try changing your search or filters</p>
      </div>
    `;
    return;
  }

  // Render items
  data.forEach(item => {

    const isNew = (now - item.createdAt) < (24 * 60 * 60 * 1000);

    const image = (item.images && item.images.length > 0)
      ? item.images[0]
      : "https://via.placeholder.com/300";

    const card = `
      <div class="card" onclick="openDetails(${item.id})">
        
        <img src="${image}" alt="${item.title}">

        <div class="card-content">

          <!-- Type -->
          <span class="tag ${item.type.toLowerCase()}">${item.type}</span>

          <!-- Status -->
          ${item.status === "Recovered"
            ? '<span class="tag recovered">Recovered</span>'
            : ''
          }

          <!-- New badge -->
          ${isNew
            ? '<span class="tag" style="background: orange; color: white;">NEW</span>'
            : ''
          }

          <h3>${item.title}</h3>
          <p>${item.location}</p>
          <p>${getTimeAgo(item.createdAt)}</p>

        </div>

      </div>
    `;

    container.innerHTML += card;
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

  // Search filter
  if (searchValue) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(searchValue) ||
      item.description.toLowerCase().includes(searchValue) ||
      item.location.toLowerCase().includes(searchValue)
    );
  }

  // Category filter
  if (categoryValue) {
    filtered = filtered.filter(item =>
      item.category === categoryValue
    );
  }

  // Type filter
  if (typeValue) {
    filtered = filtered.filter(item =>
      item.type === typeValue
    );
  }

  displayItems(filtered);
}


/* ============================= */
/* 🔹 EVENT LISTENERS */
/* ============================= */

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);


/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

// Open details page
function openDetails(id) {
  localStorage.setItem("selectedItemId", id);
  window.location.href = "details.html";
}

// Reset filters
function resetFilters() {
  searchInput.value = "";
  categoryFilter.value = "";
  typeFilter.value = "";

  displayItems(items);
}


/* ============================= */
/* 🔹 TIME FORMAT */
/* ============================= */

function getTimeAgo(time) {
  const seconds = Math.floor((Date.now() - time) / 1000);

  const intervals = [
    { label: "day", value: 86400 },
    { label: "hour", value: 3600 },
    { label: "minute", value: 60 }
  ];

  for (let i of intervals) {
    const count = Math.floor(seconds / i.value);
    if (count > 0) {
      return `Posted ${count} ${i.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}


/* ============================= */
/* 🔹 INITIAL LOAD */
/* ============================= */

displayItems(items);
applyFilters();