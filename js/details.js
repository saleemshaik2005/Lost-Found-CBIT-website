import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
      docId = document.id; 
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

  // Bidirectional Verification Logic:
  // Both 'Lost' and 'Found' types now hide contact info until approved.
  let actionButton = "";
  if (item.status === "Open") {
    const isFoundPost = item.type === "Found";
    const btnText = isFoundPost ? "Claim This Item" : "I Found This";
    const btnColor = isFoundPost ? "#2e5e2e" : "#4285F4"; // Blue for finding a lost item
    
    actionButton = `
      <button class="reveal-btn" style="background: ${btnColor};" 
        onclick="handleClaimClick('${item.securityQuestion}', '${docId}', '${item.userId}', '${item.type}')">
        ${btnText}
      </button>`;
  }

  container.innerHTML = `
    <div class="details-box">

      <div class="details-images">
        ${imagesHTML}
      </div>

      <h2>${item.title}</h2>

      <p><strong>Type:</strong> ${item.type}</p>
      <p><strong>Status:</strong> <span style="color: ${item.status === 'Recovered' ? 'green' : 'orange'}; font-weight: bold;">${item.status}</span></p>
      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Location:</strong> ${item.location}</p>
      <p><strong>Date & Time:</strong> ${new Date(item.date).toLocaleString()}</p>
      <p><strong>Posted By:</strong> ${item.username}</p>

      ${actionButton}
      
      <p id="contactInfo" style="display:none; margin-top: 10px; color: #2e5e2e; font-weight: bold;">
        Contact: ${item.contact}
      </p>

      <div id="claimSection" style="display:none; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p><strong>Verification Question:</strong> <span id="displayQuestion"></span></p>
        
        <input type="text" id="claimAnswer" placeholder="Your answer..." style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;">
        
        <input type="text" id="claimerContact" placeholder="Your Contact (Phone / WhatsApp)" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;">
        
        <button class="recover-btn" onclick="submitClaim('${docId}', '${item.userId}')">Submit & Notify Owner</button>
      </div>

      ${item.status === "Recovered" ? `
        <hr style="margin: 20px 0; opacity: 0.2;">
        <p style="color: green; text-align: center;"><strong>🎉 Item Recovered</strong></p>
      ` : ""}

    </div>
  `;
}

/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */

function handleClaimClick(question, docId, finderId, type) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to proceed.");
    return;
  }
  
  if (user.uid === finderId) {
    alert("This is your own post!");
    return;
  }

  const defaultMsg = type === "Found" ? "No security question set by finder." : "No security question set by owner.";
  document.getElementById("displayQuestion").innerText = question || defaultMsg;
  document.getElementById("claimSection").style.display = "block";
}

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
      claimerContact: contact,
      answer: answer,
      status: "Pending",
      timestamp: Date.now()
    });

    alert("Notification sent! Once the owner approves, you both will receive each other's contact details.");
    location.reload();
  } catch (error) {
    console.error("Error submitting claim:", error);
    alert("Error sending request.");
  }
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
window.openImage = openImage;
window.closeImage = closeImage;
window.handleClaimClick = handleClaimClick;
window.submitClaim = submitClaim;