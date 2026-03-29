import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, or, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const listContainer = document.getElementById("claimsList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

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
      listContainer.innerHTML = "<p class='empty' style='text-align:center; padding:20px;'>No notifications yet.</p>";
      return;
    }

    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const timeA = a.data().timestamp || 0;
      const timeB = b.data().timestamp || 0;
      return timeB - timeA; 
    });

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
          <p><strong>Incoming Request for:</strong> <span id="title-${claimId}" style="font-weight:bold; color:#2e5e2e;">Loading...</span></p>
          <p><strong>From:</strong> ${claim.claimerName}</p>
          
          <div style="background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; margin: 10px 0;">
            <p style="margin-bottom: 5px;"><strong>Security Answer:</strong> <span style="color: #b22222;">${claim.answer}</span></p>
            <p style="margin-top: 10px; border-top: 1px solid #eee; pt-5px;"><strong>Message:</strong></p>
            <p style="font-style: italic; color: #555; background: #fdfdfd; padding: 8px; border-radius: 4px;">"${claim.message || "No additional message provided."}"</p>
          </div>

          <div id="actions-${claimId}" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
            ${(!isApproved && !isRejected) ? 
              `<div style="display:flex; gap:10px;">
                <button onclick="approveClaim('${claimId}', '${claim.itemId}')" class="recover-btn" style="flex:1;">Approve & Chat</button>
                <button onclick="rejectClaim('${claimId}')" class="recover-btn" style="background: #b22222; flex:1;">Reject</button>
               </div>` : 
              (isApproved ? 
                `<button onclick="window.location.href='chat.html?id=${claim.chatId}'" class="recover-btn" style="width:100%; background:#4285F4;">
                  <i class="fas fa-comments"></i> Open Chat Room
                </button>` : 
                `<p style="color: red; font-weight: bold; border: 1px solid; padding: 5px 10px; border-radius: 4px; width: 100%; text-align: center;">✘ Request Rejected</p>`)
            }
          </div>
        `;
      } else {
        cardContent = `
          <p style="font-size: 0.8rem; color: gray;">${claim.timestamp ? new Date(claim.timestamp).toLocaleString() : 'Date unknown'}</p>
          <p><strong>Your Response for:</strong> <span id="title-${claimId}" style="font-weight:bold; color:#4285F4;">Loading...</span></p>
          <p><strong>Status:</strong> <span style="font-weight:bold; color:${isApproved ? 'green' : (isRejected ? 'red' : 'orange')}">${isApproved ? 'Approved ✅' : (isRejected ? 'Rejected ❌' : 'Pending Verification ⏳')}</span></p>
          
          ${isApproved ? 
            `<div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
              <div style="background: #e8f5e9; padding: 10px; border-radius: 8px; border: 1px solid #c8e6c9; font-size:13px;">
                <p style="color: #2e5e2e; margin:0;"><strong>Request Approved!</strong> You can now chat securely with the finder.</p>
              </div>
              <button onclick="window.location.href='chat.html?id=${claim.chatId}'" class="recover-btn" style="width:100%; background:#4285F4;">
                <i class="fas fa-comments"></i> Open Chat Room
              </button>
             </div>` : 
            (isRejected ? `<p style="margin-top:10px; color: #b22222; background: #ffebee; padding: 10px; border-radius: 4px;">The owner declined this claim.</p>` : 
            `<p style="margin-top:10px; color: #666; font-style: italic;">The owner is reviewing your answer. You will be able to chat once approved.</p>`)
          }
        `;
      }

      claimDiv.innerHTML = `<div style="padding: 15px;">${cardContent}</div>`;
      listContainer.appendChild(claimDiv);

      const itemRef = doc(db, "items", claim.itemId);
      getDoc(itemRef).then(itemSnap => {
        const titleEl = document.getElementById(`title-${claimId}`);
        if (itemSnap.exists()) {
          titleEl.innerText = itemSnap.data().title;
        } else {
          titleEl.innerText = "Deleted Item";
          titleEl.style.textDecoration = "line-through";
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
    listContainer.innerHTML = "<p style='text-align:center;'>Error loading notifications.</p>";
  }
});

/* ============================= */
/* 🛠️ ACTIONS */
/* ============================= */

window.approveClaim = async (claimId, itemId) => {
  if (confirm("Approve this claim? This will open a private chat room with the user.")) {
    try {
      const claimSnap = await getDoc(doc(db, "claims", claimId));
      const claimData = claimSnap.data();
      const itemSnap = await getDoc(doc(db, "items", itemId));
      const itemTitle = itemSnap.exists() ? itemSnap.data().title : "Item Chat";

      // 1. Create a unique Chat Room ID
      const chatId = `chat_${itemId}_${claimData.claimerId}`;

      // 2. Initialize the chat document in Firestore
      await setDoc(doc(db, "chats", chatId), {
        itemId: itemId,
        itemTitle: itemTitle,
        user1: auth.currentUser.uid, // Finder
        user2: claimData.claimerId,   // Claimer
        createdAt: Date.now(),
        messages: []
      });

      // 3. Update the claim with the chatId
      await updateDoc(doc(db, "claims", claimId), { 
        status: "Approved", 
        chatId: chatId 
      });
      
      // 4. Mark item as recovered
      await updateDoc(doc(db, "items", itemId), { 
        status: "Recovered", 
        recoveredAt: Date.now() 
      });
      
      alert("Success! Chat room created.");
      location.reload();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Error initializing chat.");
    }
  }
};

window.rejectClaim = async (claimId) => {
  if (confirm("Reject this request?")) {
    await updateDoc(doc(db, "claims", claimId), { status: "Rejected" });
    location.reload();
  }
};