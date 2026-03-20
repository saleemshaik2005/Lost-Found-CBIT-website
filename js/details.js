import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================= */
/* 🔹 DOM */
/* ============================= */

const container = document.getElementById("detailsContainer");
const selectedId = localStorage.getItem("selectedItemId");

/* ============================= */
/* 🔹 LOAD ITEM FROM FIREBASE */
/* ============================= */

async function loadItem() {
  const querySnapshot = await getDocs(collection(db, "items"));

  let foundItem = null;
  let docId = null;

  querySnapshot.forEach((document) => {
    const data = document.data();

    if (data.id == selectedId) {
      foundItem = data;
      docId = document.id; // 🔥 important for update
    }
  });

  if (!foundItem) {
    container.innerHTML = "<p>Item not found.</p>";
    return;
  }

  renderItem(foundItem, docId);
}

/* ============================= */
/* 🔹 RENDER */
/* ============================= */

function renderItem(item, docId) {

  const imagesHTML = (item.images && item.images.length > 0)
    ? item.images.map(img =>
        `<img src="${img}" onclick="openImage('${img}')">`
      ).join("")
    : `<img src="https://via.placeholder.com/300">`;

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

      <button class="reveal-btn" onclick="revealContact()">Reveal Contact</button>
      <p id="contactInfo" style="display:none;">${item.contact}</p>

      ${
        item.status === "Open"
          ? `<button class="recover-btn" onclick="markRecovered('${docId}')">Mark as Recovered</button>`
          : `<p style="color: green;"><strong>Item Recovered</strong></p>`
      }

    </div>
  `;
}

/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

function revealContact() {
  document.getElementById("contactInfo").style.display = "block";
}

// 🔥 Update in Firebase
async function markRecovered(docId) {
  if (!confirm("Mark this item as recovered?")) return;

  const ref = doc(db, "items", docId);

  await updateDoc(ref, {
    status: "Recovered"
  });

  alert("Item marked as recovered!");
  location.reload();
}

/* ============================= */
/* 🔹 IMAGE MODAL */
/* ============================= */

function openImage(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");

  modal.style.display = "flex";
  modalImg.src = src;
}

function closeImage() {
  document.getElementById("imageModal").style.display = "none";
}

/* ============================= */
/* 🔹 INIT */
/* ============================= */

loadItem();
window.revealContact = revealContact;
window.markRecovered = markRecovered;
window.openImage = openImage;
window.closeImage = closeImage;