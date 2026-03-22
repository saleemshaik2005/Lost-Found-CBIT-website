import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

  // Determine if we show "Reveal Contact" (Lost items) or "Claim" (Found items)
  const actionButton = (item.type === "Found") 
    ? `<button class="reveal-btn" style="background: #2e5e2e;" onclick="handleClaimClick('${item.securityQuestion}', '${docId}', '${item.userId}')">Claim This Item</button>`
    : `<button class="reveal-btn" onclick="revealContact()">Reveal Contact</button>`;

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

      ${actionButton}
      
      <p id="contactInfo" style="display:none; margin-top: 10px; color: #2e5e2e; font-weight: bold;">
        Contact: ${item.contact}
      </p>

      <div id="claimSection" style="display:none; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p><strong>Security Question:</strong> <span id="displayQuestion"></span></p>
        
        <input type="text" id="claimAnswer" placeholder="Your answer to the question..." style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;">
        
        <input type="text" id="claimerContact" placeholder="Your Contact (Phone / WhatsApp / Email)" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;">
        
        <button class="recover-btn" onclick="submitClaim('${docId}', '${item.userId}')">Submit Claim & Share Contact</button>
      </div>

      <hr style="margin: 20px 0; opacity: 0.2;">

      ${
        item.status === "Open"
          ? `<button class="recover-btn" style="background: #555;" onclick="markRecovered('${docId}')">Mark as Recovered</button>`
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

function handleClaimClick(question, docId, finderId) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to claim an item.");
    return;
  }
  
  if (user.uid === finderId) {
    alert("You cannot claim your own item!");
    return;
  }

  document.getElementById("displayQuestion").innerText = question || "No security question set by finder.";
  document.getElementById("claimSection").style.display = "block";
}

// Updated to capture claimerContact
async function submitClaim(docId, finderId) {
  const answer = document.getElementById("claimAnswer").value;
  const contact = document.getElementById("claimerContact").value;
  const user = auth.currentUser;

  if (!answer || !contact) {
    return alert("Please provide both an answer and your contact details.");
  }

  try {
    await addDoc(collection(db, "claims"), {
      itemId: docId,
      finderId: finderId,
      claimerId: user.uid,
      claimerName: user.displayName,
      claimerEmail: user.email,
      claimerContact: contact, // Saved for the finder to see
      answer: answer,
      status: "Pending",
      timestamp: Date.now()
    });

    alert("Claim request sent! The finder will be notified and can see your contact info.");
    location.reload();
  } catch (error) {
    console.error("Error submitting claim:", error);
    alert("Error sending claim request.");
  }
}

async function markRecovered(docId) {
  if (!confirm("Mark this item as recovered?")) return;

  const ref = doc(db, "items", docId);
  await updateDoc(ref, { status: "Recovered" });

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
window.handleClaimClick = handleClaimClick;
window.submitClaim = submitClaim;