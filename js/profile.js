import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const displayRoll = document.getElementById("displayRoll");
const nameInput = document.getElementById("nameInput");
const rollInput = document.getElementById("rollNumberInput");
const editSection = document.getElementById("editSection");
const infoSection = document.getElementById("infoSection");
const itemsContainer = document.getElementById("myItemsContainer");
const postCountBadge = document.getElementById("postCount");

/* ============================= */
/* 🔹 AUTH STATE */
/* ============================= */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ✅ SAFE AVATAR LOGIC: Fallback to initials if Google photo is missing
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2e5e2e&color=fff`;
    profilePic.src = user.photoURL || defaultAvatar;
    profilePic.onerror = function() { this.src = defaultAvatar; };

    profileEmail.innerText = user.email;
    
    // Load recorded data from Firestore (Roll No & Custom Display Name)
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      profileName.innerText = userData.displayName || user.displayName;
      nameInput.value = userData.displayName || user.displayName;
      displayRoll.innerText = userData.rollNumber || "Not Provided";
      rollInput.value = userData.rollNumber || "";
    } else {
      profileName.innerText = user.displayName;
      nameInput.value = user.displayName;
      displayRoll.innerText = "Not Provided";
    }

    // 🔥 Call this to load the user's submissions
    loadUserItems(user.uid);
  } else {
    // Redirect to home if not logged in
    window.location.href = "index.html";
  }
});

/* ============================= */
/* 🔹 TOGGLE EDIT MODE */
/* ============================= */
window.toggleEdit = function(show) {
  if (infoSection && editSection) {
    infoSection.style.display = show ? "none" : "block";
    editSection.style.display = show ? "block" : "none";
  }
};

/* ============================= */
/* 🔹 SAVE DATA */
/* ============================= */
window.saveProfile = async () => {
  const user = auth.currentUser;
  const newName = nameInput.value.trim();
  const newRoll = rollInput.value.trim();
  
  if (!newName) return alert("Display Name cannot be empty.");

  try {
    await setDoc(doc(db, "users", user.uid), {
      displayName: newName,
      rollNumber: newRoll,
      updatedAt: Date.now()
    }, { merge: true });

    // Update the UI immediately without refresh
    profileName.innerText = newName;
    displayRoll.innerText = newRoll || "Not Provided";
    
    alert("Profile Updated Successfully!");
    toggleEdit(false);
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Error saving data. Check your connection.");
  }
};

/* ============================= */
/* 🔹 LOAD & DELETE ITEMS */
/* ============================= */
async function loadUserItems(uid) {
  // Ensure the query matches the exact field name in your Firestore documents (userId)
  const q = query(collection(db, "items"), where("userId", "==", uid));
  
  try {
    const snapshot = await getDocs(q);
    itemsContainer.innerHTML = "";
    
    // Update the badge count
    if (postCountBadge) postCountBadge.innerText = `${snapshot.size} Posts`;

    if (snapshot.empty) {
      itemsContainer.innerHTML = "<p style='text-align:center; color:gray; width:100%; margin-top:20px;'>No active posts found.</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const docId = docSnap.id;
      
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${(item.images && item.images[0]) || 'images/placeholder.jpg'}" onerror="this.src='images/placeholder.png'">
        <div class="card-content">
          <span class="tag ${item.type.toLowerCase()}">${item.type}</span>
          <h3>${item.title}</h3>
          <p>${item.location}</p>
          <button onclick="deleteMyPost('${docId}')" style="background:#b22222; color:white; border:none; padding:10px; border-radius:6px; width:100%; cursor:pointer; margin-top:10px; font-weight:bold;">
            <i class="fas fa-trash"></i> Delete Post
          </button>
        </div>`;
      itemsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching user items:", error);
  }
}

window.deleteMyPost = async (docId) => {
  if (confirm("Permanently delete this post? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "items", docId));
      location.reload(); // Refresh to update list
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed.");
    }
  }
};