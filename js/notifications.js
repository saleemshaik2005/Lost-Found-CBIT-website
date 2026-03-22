import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, or } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // 1. Query for claims where user is FINDER or CLAIMER
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
          <p><strong>Their Answer:</strong> <span style="color: #b22222; font-weight: bold;">${claim.answer}</span></p>
          <p><strong>Their Contact:</strong> <span style="color: #2e5e2e; font-weight: bold;">${claim.claimerContact || "Not provided"}</span></p>
          <p><strong>Status:</strong> ${claim.status}</p>
          <div id="actions-${claimId}">
            ${claim.status !== "Approved" ? 
              `<button onclick="approveClaim('${claimId}', '${claim.itemId}')" class="recover-btn">Approve & Share My Contact</button>` : 
              `<p style="color: green;"><strong>Approved!</strong> You shared your details with them.</p>`
            }
          </div>
        `;
      } else {
        // --- CLAIMER VIEW ---
        cardContent = `
          <p><strong>Your Claim for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>Status:</strong> <span style="font-weight:bold; color:${claim.status === 'Approved' ? 'green' : 'orange'}">${claim.status}</span></p>
          ${claim.status === "Approved" ? 
            `<div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top:10px;">
              <p><strong>Finder's Contact Info:</strong></p>
              <p>Email: ${claim.finderEmail}</p>
              <p>Additional Details: ${claim.finderDetails || "No additional details provided."}</p>
             </div>` : 
            `<p>Waiting for the finder to approve your request...</p>`
          }
        `;
      }

      claimDiv.innerHTML = `<div style="padding: 15px;">${cardContent}</div>`;
      listContainer.appendChild(claimDiv);

      // Fetch the Item Title
      const itemRef = doc(db, "items", claim.itemId);
      getDoc(itemRef).then(itemSnap => {
        if (itemSnap.exists()) {
          document.getElementById(`title-${claimId}`).innerText = itemSnap.data().title;
        }
      });

      // Mark AS SEEN if user is FINDER receiving a new request
      if (isFinder && claim.status === "Pending") {
        updateDoc(doc(db, "claims", claimId), { status: "Seen" });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    listContainer.innerHTML = "<p>Error loading notifications.</p>";
  }
});

// Updated Approve function to share finder details
window.approveClaim = async (claimId, itemId) => {
  if (confirm("Approve this claim? Your contact details will be shared with the claimer.")) {
    try {
      // Fetch the original item to get finder's contact info
      const itemSnap = await getDoc(doc(db, "items", itemId));
      const finderContact = itemSnap.exists() ? itemSnap.data().contact : "Check original post";

      const ref = doc(db, "claims", claimId);
      await updateDoc(ref, { 
        status: "Approved",
        finderEmail: auth.currentUser.email,
        finderDetails: finderContact // Directly sharing the info from the post
      });

      alert("Approved! The claimer can now see your contact information.");
      location.reload();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Error approving claim.");
    }
  }
};