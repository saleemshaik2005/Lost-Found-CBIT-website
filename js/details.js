/* ============================= */
/* 🔹 DOM & DATA */
/* ============================= */

const container = document.getElementById("detailsContainer");

const id = localStorage.getItem("selectedItemId");
let items = JSON.parse(localStorage.getItem("items")) || [];

// Find selected item
const item = items.find(i => i.id == id);


/* ============================= */
/* 🔹 RENDER ITEM */
/* ============================= */

if (!item) {
  container.innerHTML = "<p>Item not found.</p>";
} else {

  // Prepare images
  const imagesHTML = (item.images && item.images.length > 0)
    ? item.images.map(img =>
        `<img src="${img}" alt="Item Image" onclick="openImage('${img}')">`
      ).join("")
    : `<img src="https://via.placeholder.com/300" alt="No Image">`;

  // Render UI
  container.innerHTML = `
    <div class="details-box">

      <div class="details-images">
        ${imagesHTML}
      </div>

      <h2>${item.title}</h2>

      <p><strong>Type:</strong> ${item.type}</p>
      <p><strong>Status:</strong> ${item.status}</p>
      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Location:</strong> ${item.location}</p>
      <p><strong>Date & Time:</strong> ${new Date(item.date).toLocaleString()}</p>
      <p><strong>Posted By:</strong> ${item.username}</p>

      <!-- Contact -->
      <button class="reveal-btn" onclick="revealContact()">Reveal Contact</button>
      <p id="contactInfo" style="display: none;">
        ${item.contact}
      </p>

      <!-- Status Action -->
      ${
        item.status === "Open"
          ? `<button class="recover-btn" onclick="markRecovered()">Mark as Recovered</button>`
          : `<p style="color: green;"><strong>Item Recovered</strong></p>`
      }

    </div>
  `;
}


/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

// Reveal contact
function revealContact() {
  document.getElementById("contactInfo").style.display = "block";
}


// Mark item as recovered
function markRecovered() {
  if (!confirm("Mark this item as recovered?")) return;

  const index = items.findIndex(i => i.id == id);
  items[index].status = "Recovered";

  localStorage.setItem("items", JSON.stringify(items));

  alert("Item marked as recovered!");

  location.reload();
}


/* ============================= */
/* 🔹 IMAGE MODAL */
/* ============================= */

// Open full-screen image
function openImage(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");

  modal.style.display = "flex";
  modalImg.src = src;
}

// Close image modal
function closeImage() {
  document.getElementById("imageModal").style.display = "none";
}