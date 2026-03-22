import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, or } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // 1. Fetch claims where the user is either the finder or the claimer
  const q = query(
    collection(db, "claims"), 
    or(
      where("finderId", "==", user.uid),
      where("claimerId", "==", user.uid)
    )
  );
  
  try {
    const querySnapshot = await getDocs(q);
    listContainer.innerHTML = "";

    if (querySnapshot.empty) {
      listContainer.innerHTML = "<p class='empty'>No notifications yet.</p>";
      return;
    }

    for (const claimDoc of querySnapshot.docs) {
      const claim = claimDoc.data();
      const claimId = claimDoc.id;
      const isFinder = claim.finderId === user.uid;

      const claimDiv = document.createElement("div");
      claimDiv.className = "details-box"; 
      claimDiv.style.marginBottom = "20px";
      claimDiv.style.borderLeft = isFinder ? "5px solid #2e5e2e" : "5px solid #4285F4";

      let cardContent = "";
      
      if (isFinder) {
        // --- FINDER VIEW ---
        cardContent = `
          <p><strong>Incoming Request for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>From:</strong> ${claim.claimerName}</p>
          <p><strong>Answer:</strong> <span style="color: #b22222; font-weight: bold;">${claim.answer}</span></p>
          <p><strong>Contact:</strong> <span style="color: #2e5e2e; font-weight: bold;">${claim.claimerContact || "Not provided"}</span></p>
          <p><strong>Status:</strong> ${claim.status}</p>
          <div id="actions-${claimId}">
            ${claim.status !== "Approved" ? 
              `<button onclick="approveClaim('${claimId}', '${claim.itemId}')" class="recover-btn">Approve & Share Details</button>` : 
              `<p style="color: green;"><strong>Approved!</strong> Item marked as Recovered.</p>`
            }
          </div>
        `;
      } else {
        // --- CLAIMER VIEW ---
        cardContent = `
          <p><strong>Your Claim for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>Status:</strong> <span style="font-weight:bold; color:${claim.status === 'Approved' ? 'green' : 'orange'}">${claim.status}</span></p>
          ${claim.status === "Approved" ? 
            `<div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top:10px;">
              <p><strong>✅ Claim Approved!</strong></p>
              <p><strong>Finder's Email:</strong> ${claim.finderEmail}</p>
              <p><strong>Finder's Contact:</strong> ${claim.finderDetails || "Check original post"}</p>
             </div>` : 
            `<p>The finder is reviewing your security answer...</p>`
          }
        `;
      }

      claimDiv.innerHTML = `<div style="padding: 15px;">${cardContent}</div>`;
      listContainer.appendChild(claimDiv);

      // Fetch Item Title
      const itemRef = doc(db, "items", claim.itemId);
      getDoc(itemRef).then(itemSnap => {
        if (itemSnap.exists()) {
          document.getElementById(`title-${claimId}`).innerText = itemSnap.data().title;
        }
      });

      // 2. MARK AS SEEN: This clears the red bubble on the Home page
      if (isFinder && claim.status === "Pending") {
        updateDoc(doc(db, "claims", claimId), { status: "Seen" });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    listContainer.innerHTML = "<p>Error loading notifications.</p>";
  }
});

// 3. AUTOMATED APPROVAL & RECOVERY
window.approveClaim = async (claimId, itemId) => {
  if (confirm("Approve this claim? This will share your details and mark the item as Recovered automatically.")) {
    try {
      // Get finder's contact details from the item
      const itemRef = doc(db, "items", itemId);
      const itemSnap = await getDoc(itemRef);
      const finderContact = itemSnap.exists() ? itemSnap.data().contact : "Not provided";

      // Update Claim document
      const claimRef = doc(db, "claims", claimId);
      await updateDoc(claimRef, { 
        status: "Approved",
        finderEmail: auth.currentUser.email,
        finderDetails: finderContact 
      });

      // Update Item document to RECOVERED
      await updateDoc(itemRef, { 
        status: "Recovered",
        recoveredAt: Date.now() // Used for the 5-day auto-delete rule
      });

      alert("Success! Claim approved and item marked as recovered.");
      location.reload();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Error processing approval.");
    }
  }
};