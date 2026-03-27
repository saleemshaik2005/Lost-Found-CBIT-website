import { db, auth } from "./firebase.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================= */
/* 📧 EMAILJS CONFIGURATION */
/* ============================= */
const EMAILJS_PUBLIC_KEY = "gox8-M_8m00ruwTba"; 
const EMAILJS_SERVICE_ID = "service_ob7fy6p"; 
const EMAILJS_TEMPLATE_ID = "template_ymgde7i"; 

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

const container = document.getElementById("detailsContainer");
const selectedId = localStorage.getItem("selectedItemId");

/* ============================= */
/* 🔹 LOAD ITEM FROM FIREBASE */
/* ============================= */
async function loadItem() {
  if (!selectedId) {
    container.innerHTML = "<p style='text-align:center; padding:20px;'>No item selected. Return to <a href='index.html'>Home</a>.</p>";
    return;
  }

  try {
    const docRef = doc(db, "items", selectedId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      renderItem(data, docSnap.id);
    } else {
      container.innerHTML = "<p style='text-align:center; padding:20px;'>Item not found in database.</p>";
    }
  } catch (error) {
    console.error("Error loading item:", error);
    container.innerHTML = "<p style='text-align:center; padding:20px;'>Error connecting to database.</p>";
  }
}

/* ============================= */
/* 🔹 RENDER */
/* ============================= */
function renderItem(item, docId) {
  const hasImages = item.images && Array.isArray(item.images) && item.images.length > 0;

  const imagesHTML = hasImages
    ? item.images.map(img =>
        `<img src="${img}" class="clickable-img" onclick="openImage('${img}')" style="cursor:zoom-in;" onerror="this.style.display='none'">`
      ).join("")
    : `<img src="images/placeholder.jpg" alt="No image available">`;

  let actionButton = "";
  if (item.status === "Open") {
    const isFoundPost = item.type === "Found";
    const btnText = isFoundPost ? "Claim This Item" : "I Found This";
    const btnColor = isFoundPost ? "#2e5e2e" : "#4285F4"; 
    
    actionButton = `
      <button class="reveal-btn" style="background: ${btnColor}; margin-top: 15px; width: 100%;" 
        onclick="handleClaimClick('${item.securityQuestion}', '${docId}', '${item.userId}', '${item.type}')">
        ${btnText}
      </button>`;
  }

  container.innerHTML = `
    <div class="details-box">
      <div class="details-images">
        ${imagesHTML}
      </div>

      <h2 style="margin-top: 20px;">${item.title}</h2>

      <div style="margin: 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <p><strong>Type:</strong> <span class="tag ${item.type.toLowerCase()}">${item.type}</span></p>
        <p><strong>Status:</strong> <span style="color: ${item.status === 'Recovered' ? 'green' : 'orange'}; font-weight: bold;">${item.status}</span></p>
      </div>

      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Location:</strong> ${item.location}</p>
      <p><strong>Date & Time:</strong> ${new Date(item.date).toLocaleString()}</p>
      <p><strong>Posted By:</strong> ${item.username}</p>

      ${actionButton}
      
      <div style="text-align: center; margin-top: 20px;">
        <button onclick="reportPost('${docId}', '${item.title}')" style="background:none; border:none; color:#b22222; cursor:pointer; text-decoration:underline; font-size:13px; font-weight:bold;">
          <i class="fas fa-flag"></i> Report this post (Fake / Inappropriate)
        </button>
      </div>

      <div id="claimSection" style="display:none; margin-top: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa;">
        <p style="color: #2e5e2e; font-weight: bold; margin-bottom: 10px;">Verification Step</p>
        <p><strong>Question:</strong> <span id="displayQuestion"></span></p>
        <input type="text" id="claimAnswer" placeholder="Your answer here..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
        
        <textarea id="claimMessage" placeholder="Optional: Add a message (e.g., 'I left this right after my lab', 'I really need this for my exam')" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; height: 80px;"></textarea>
        
        <input type="text" id="claimerContact" placeholder="Your Phone / WhatsApp" style="width: 100%; padding: 10px; margin: 5px 0 15px 0; border: 1px solid #ccc; border-radius: 4px;">
        <button id="submitClaimBtn" class="recover-btn" style="width: 100%;" onclick="submitClaim('${docId}', '${item.userId}')">Submit & Notify Finder</button>
      </div>

      ${item.status === "Recovered" ? `
        <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 8px; text-align: center;">
          <p style="color: #444; margin: 0;"><strong>🎉 This item has been successfully recovered!</strong></p>
        </div>
      ` : ""}
    </div>
  `;
}

/* ============================= */
/* 🔹 ACTIONS */
/* ============================= */
function handleClaimClick(question, docId, posterId, type) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to claim items.");
    return;
  }
  
  if (user.uid === posterId) {
    alert("You are the owner of this post.");
    return;
  }

  const defaultMsg = type === "Found" ? "Describe the item accurately to prove ownership." : "Please answer the finder's question to verify.";
  document.getElementById("displayQuestion").innerText = question || defaultMsg;
  document.getElementById("claimSection").style.display = "block";
  document.getElementById("claimSection").scrollIntoView({ behavior: 'smooth' });
}

async function submitClaim(docId, posterId) {
  const answer = document.getElementById("claimAnswer").value.trim();
  const message = document.getElementById("claimMessage").value.trim(); // 🆕 Get message
  const contact = document.getElementById("claimerContact").value.trim();
  const user = auth.currentUser;

  if (!answer || !contact) return alert("Please provide both an answer and your contact info.");

  const btn = document.getElementById("submitClaimBtn");
  btn.disabled = true;
  btn.innerText = "Sending Notification...";

  try {
    // 1. Fetch item owner's email
    const itemSnap = await getDoc(doc(db, "items", docId));
    const itemData = itemSnap.data();

    // 2. Save Claim to Firestore
    await addDoc(collection(db, "claims"), {
      itemId: docId,
      finderId: posterId,
      claimerId: user.uid,
      claimerName: user.displayName || "CBIT User",
      claimerEmail: user.email,
      claimerContact: contact,
      answer: answer,
      message: message, // 🆕 Store message in DB
      status: "Pending",
      timestamp: Date.now()
    });

    // 3. 📧 SEND EMAIL via EmailJS
    const templateParams = {
      finder_name: itemData.username,
      item_title: itemData.title,
      claim_answer: answer,
      claim_message: message || "No additional message provided.", // 🆕 Send in email
      to_email: itemData.userEmail,
      portal_link: "https://cbit-lost-found.web.app", 
      dev_linkedin: "https://www.linkedin.com/in/saleemshaikatcbit/"
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    alert("Your claim request has been sent! The finder has been notified via email.");
    location.reload();
  } catch (error) {
    console.error("Error submitting claim:", error);
    alert("Error sending request.");
    btn.disabled = false;
    btn.innerText = "Submit & Notify Finder";
  }
}

/* ============================= */
/* 🔹 REPORT LOGIC */
/* ============================= */
window.reportPost = async (docId, itemTitle) => {
  const user = auth.currentUser;
  if (!user) return alert("Please log in to report a post.");

  const reason = prompt("Why are you reporting this post?\n(e.g., Fake item, Inappropriate content, already recovered)");
  if (!reason || reason.trim() === "") return;

  try {
    await addDoc(collection(db, "reports"), {
      itemId: docId,
      itemTitle: itemTitle,
      reportedByEmail: user.email,
      reportedById: user.uid,
      reason: reason.trim(),
      status: "Unreviewed",
      timestamp: Date.now()
    });

    alert("The report has been sent to the Admin. Thank you for keeping the CBIT community safe!");
  } catch (error) {
    console.error("Error reporting post:", error);
    alert("Failed to send report. Please check your connection.");
  }
};

/* ============================= */
/* 🔹 IMAGE MODAL */
/* ============================= */
window.openImage = function(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");
  if(modal && modalImg) {
    modal.style.display = "flex";
    modalImg.src = src;
  }
};

window.closeImage = function() {
  const modal = document.getElementById("imageModal");
  if(modal) modal.style.display = "none";
};

/* ============================= */
/* 🔹 INIT */
/* ============================= */
loadItem();
window.handleClaimClick = handleClaimClick;
window.submitClaim = submitClaim;