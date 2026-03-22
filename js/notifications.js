import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, or, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  console.log("Fetching notifications for user:", user.uid);

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
      console.log("No claims found in database.");
      listContainer.innerHTML = "<p class='empty'>No notifications yet.</p>";
      return;
    }

    // 🔥 FIXED SORTING: Safer timestamp check
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const timeA = a.data().timestamp || 0;
      const timeB = b.data().timestamp || 0;
      return timeB - timeA; 
    });

    console.log(`Found ${sortedDocs.length} notifications.`);

    for (const claimDoc of sortedDocs) {
      const claim = claimDoc.data();
      const claimId = claimDoc.id;
      const isPoster = claim.finderId === user.uid;

      const claimDiv = document.createElement("div");
      claimDiv.className = "details-box"; 
      claimDiv.style.marginBottom = "20px";
      claimDiv.style.borderLeft = isPoster ? "5px solid #2e5e2e" : "5px solid #4285F4";

      let cardContent = "";
      const isApproved = claim.status === "Approved" || claim.status === "Approved-Seen";
      const isRejected = claim.status === "Rejected";
      
      if (isPoster) {
        cardContent = `
          <p style="font-size: 0.8rem; color: gray;">${claim.timestamp ? new Date(claim.timestamp).toLocaleString() : 'Date unknown'}</p>
          <p><strong>Incoming Request for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>From:</strong> ${claim.claimerName}</p>
          <p><strong>Answer:</strong> <span style="color: #b22222; font-weight: bold;">${claim.answer}</span></p>
          <p><strong>Contact:</strong> <span style="color: #2e5e2e; font-weight: bold;">${claim.claimerContact || "Not provided"}</span></p>
          <div id="actions-${claimId}" style="margin-top: 10px; display: flex; gap: 10px;">
            ${(!isApproved && !isRejected) ? 
              `<button onclick="approveClaim('${claimId}', '${claim.itemId}')" class="recover-btn">Approve</button>
               <button onclick="rejectClaim('${claimId}')" class="recover-btn" style="background: #b22222;">Reject</button>` : 
              `<p style="color: ${isRejected ? 'red' : 'green'}; font-weight: bold;">
                ${isRejected ? '✘ Request Rejected' : '✔ Item Recovered'}
              </p>`
            }
          </div>
        `;
      } else {
        cardContent = `
          <p style="font-size: 0.8rem; color: gray;">${claim.timestamp ? new Date(claim.timestamp).toLocaleString() : 'Date unknown'}</p>
          <p><strong>Your Response for:</strong> <span id="title-${claimId}">Loading...</span></p>
          <p><strong>Status:</strong> <span style="font-weight:bold; color:${isApproved ? 'green' : (isRejected ? 'red' : 'orange')}">${isApproved ? 'Approved' : (isRejected ? 'Rejected' : claim.status)}</span></p>
          ${isApproved ? 
            `<div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top:10px; border: 1px solid #c8e6c9;">
              <p><strong>✅ Approved!</strong></p>
              <p><strong>Finder's Email:</strong> ${claim.finderEmail}</p>
              <p><strong>Finder's Contact:</strong> ${claim.finderDetails || "Check original post"}</p>
             </div>` : 
            (isRejected ? `<p style="color: #b22222;">Declined: Answer was incorrect.</p>` : 
            `<p style="color: #666;">Waiting for verification...</p>`)
          }
        `;
      }

      claimDiv.innerHTML = `<div style="padding: 15px;">${cardContent}</div>`;
      listContainer.appendChild(claimDiv);

      const itemRef = doc(db, "items", claim.itemId);
      getDoc(itemRef).then(itemSnap => {
        if (itemSnap.exists()) {
          document.getElementById(`title-${claimId}`).innerText = itemSnap.data().title;
        } else {
          document.getElementById(`title-${claimId}`).innerText = "Deleted Item";
        }
      });

      if (isPoster && claim.status === "Pending") {
        updateDoc(doc(db, "claims", claimId), { status: "Seen" });
      }
      if (!isPoster && claim.status === "Approved") {
        updateDoc(doc(db, "claims", claimId), { status: "Approved-Seen" });
      }
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    listContainer.innerHTML = "<p>Error loading content. Check console (F12).</p>";
  }
});

// Logic for Approve/Reject buttons
window.approveClaim = async (claimId, itemId) => {
  if (confirm("Confirm approval?")) {
    const itemSnap = await getDoc(doc(db, "items", itemId));
    const contact = itemSnap.exists() ? itemSnap.data().contact : "Not provided";
    await updateDoc(doc(db, "claims", claimId), { status: "Approved", finderEmail: auth.currentUser.email, finderDetails: contact });
    await updateDoc(doc(db, "items", itemId), { status: "Recovered", recoveredAt: Date.now() });
    location.reload();
  }
};

window.rejectClaim = async (claimId) => {
  if (confirm("Reject this request?")) {
    await updateDoc(doc(db, "claims", claimId), { status: "Rejected" });
    location.reload();
  }
};