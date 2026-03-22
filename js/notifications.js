import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, or } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // 1. Fetch claims where user is either the original Poster (Finder) or the Respondent (Claimer)
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

    // Sort notifications by newest first
    const docs = querySnapshot.docs.sort((a, b) => b.data().timestamp - a.data().timestamp);

    for (const claimDoc of docs) {
      const claim = claimDoc.data();
      const claimId = claimDoc.id;
      const isPoster = claim.finderId === user.uid; // You are the one who created the item post

      const claimDiv = document.createElement("div");
      claimDiv.className = "details-box"; 
      claimDiv.style.marginBottom = "20px";
      claimDiv.style.borderLeft = isPoster ? "5px solid #2e5e2e" : "5px solid #4285F4";

      let cardContent = "";
      
      if (isPoster) {
        // --- VIEW FOR THE PERSON WHO POSTED THE ITEM ---
        cardContent = `
          <p style="font-size: 0.8rem; color: gray;">${new Date(claim.timestamp).toLocaleString()}</p>
          <p><strong>Incoming Request for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>From:</strong> ${claim.claimerName}</p>
          <p><strong>Answer Provided:</strong> <span style="color: #b22222; font-weight: bold;">${claim.answer}</span></p>
          <p><strong>Contact shared:</strong> <span style="color: #2e5e2e; font-weight: bold;">${claim.claimerContact || "Not provided"}</span></p>
          <p><strong>Current Status:</strong> ${claim.status}</p>
          <div id="actions-${claimId}" style="margin-top: 10px;">
            ${claim.status !== "Approved" ? 
              `<button onclick="approveClaim('${claimId}', '${claim.itemId}')" class="recover-btn">Approve & Exchange Contact</button>` : 
              `<p style="color: green;"><strong>Approved!</strong> Item is marked as Recovered.</p>`
            }
          </div>
        `;
      } else {
        // --- VIEW FOR THE PERSON RESPONDING TO A POST ---
        cardContent = `
          <p style="font-size: 0.8rem; color: gray;">${new Date(claim.timestamp).toLocaleString()}</p>
          <p><strong>Your Response for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>Status:</strong> <span style="font-weight:bold; color:${claim.status === 'Approved' ? 'green' : 'orange'}">${claim.status}</span></p>
          ${claim.status === "Approved" ? 
            `<div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top:10px; border: 1px solid #c8e6c9;">
              <p style="margin-bottom: 5px;"><strong>✅ Request Approved!</strong></p>
              <p><strong>Poster's Email:</strong> ${claim.finderEmail}</p>
              <p><strong>Poster's Contact Details:</strong> ${claim.finderDetails || "Please check the original post"}</p>
             </div>` : 
            `<p style="color: #666;">Waiting for the poster to verify your answer...</p>`
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

      // Mark AS SEEN if user is the Poster receiving a new request (Clears home badge)
      if (isPoster && claim.status === "Pending") {
        updateDoc(doc(db, "claims", claimId), { status: "Seen" });
      }
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    listContainer.innerHTML = "<p>Error loading notifications. Please refresh.</p>";
  }
});

// APPROVAL LOGIC
window.approveClaim = async (claimId, itemId) => {
  if (confirm("Approve this request? This will mark the item as Recovered and share your contact details.")) {
    try {
      // 1. Get poster's contact info from the original item
      const itemRef = doc(db, "items", itemId);
      const itemSnap = await getDoc(itemRef);
      const myContact = itemSnap.exists() ? itemSnap.data().contact : "Not provided";

      // 2. Update Claim document to 'Approved' and store contact for the respondent
      const claimRef = doc(db, "claims", claimId);
      await updateDoc(claimRef, { 
        status: "Approved",
        finderEmail: auth.currentUser.email,
        finderDetails: myContact 
      });

      // 3. AUTOMATICALLY mark the Item as Recovered (Triggers 5-day auto-delete)
      await updateDoc(itemRef, { 
        status: "Recovered",
        recoveredAt: Date.now() 
      });

      alert("Success! The item is now recovered and details have been shared.");
      location.reload();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Something went wrong with the approval.");
    }
  }
};