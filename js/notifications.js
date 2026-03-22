import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // 1. Fetch ALL claims sent to this finder, regardless of status
  const q = query(collection(db, "claims"), where("finderId", "==", user.uid));
  
  try {
    const querySnapshot = await getDocs(q);
    listContainer.innerHTML = "";

    if (querySnapshot.empty) {
      listContainer.innerHTML = "<p class='empty'>No claim requests yet.</p>";
      return;
    }

    // 2. Display each claim
    for (const claimDoc of querySnapshot.docs) {
      const claim = claimDoc.data();
      const claimId = claimDoc.id;

      const claimDiv = document.createElement("div");
      claimDiv.className = "details-box"; 
      claimDiv.style.marginBottom = "20px";
      claimDiv.style.border = "1px solid #ddd";

      // Template for the claim card
      claimDiv.innerHTML = `
        <div style="padding: 15px;">
          <p><strong>Item Name:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>Claimer:</strong> ${claim.claimerName}</p>
          <p><strong>Security Answer:</strong> <span style="color: #b22222; font-weight: bold;">${claim.answer}</span></p>
          <p><strong>Status:</strong> ${claim.status}</p>
          <div id="actions-${claimId}" style="margin-top: 10px;">
            ${claim.status !== "Approved" ? 
              `<button onclick="approveClaim('${claimId}', '${claim.claimerEmail}')" class="recover-btn">Approve & Share Contact</button>` : 
              `<p style="color: green;"><strong>Approved!</strong> Contact the user at: ${claim.claimerEmail}</p>`
            }
          </div>
        </div>
      `;
      listContainer.appendChild(claimDiv);

      // 3. Fetch the Item Title separately to show which item was claimed
      const itemRef = doc(db, "items", claim.itemId);
      getDoc(itemRef).then(itemSnap => {
        if (itemSnap.exists()) {
          document.getElementById(`title-${claimId}`).innerText = itemSnap.data().title;
        }
      });

      // 4. Mark the notification as "Seen" so the bell badge on the Home page clears
      if (claim.status === "Pending") {
        updateDoc(doc(db, "claims", claimId), { status: "Seen" });
      }
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    listContainer.innerHTML = "<p>Error loading requests. Please refresh.</p>";
  }
});

// Approve Function
window.approveClaim = async (id, email) => {
  if (confirm("Confirming this owner? They will receive your contact details.")) {
    try {
      const ref = doc(db, "claims", id);
      await updateDoc(ref, { status: "Approved" });
      alert("Claim approved! Please reach out to: " + email);
      location.reload();
    } catch (error) {
      alert("Error approving claim.");
    }
  }
};