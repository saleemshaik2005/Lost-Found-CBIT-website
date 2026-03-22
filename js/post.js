import { db, auth } from "./firebase.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================= */
/* 🔹 CONFIGURATION */
/* ============================= */
const DAILY_POST_LIMIT = 2; 

/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */
const form = document.getElementById("postForm");
const imageInput = document.getElementById("images");
const previewContainer = document.getElementById("imagePreview");
const typeSelect = document.getElementById("type");
const securitySection = document.getElementById("securitySection");
const formContainer = document.getElementById("postFormContainer");
const loadingMsg = document.getElementById("loadingMsg");
const agreeCheckbox = document.getElementById("guidelineAgree");

/* ============================= */
/* 🔹 AUTH CHECK */
/* ============================= */
onAuthStateChanged(auth, (user) => {
  if (user) {
    formContainer.style.display = "block";
    loadingMsg.style.display = "none";
  } else {
    alert("You must be logged in to post an item.");
    window.location.href = "index.html";
  }
});

/* ============================= */
/* 🔹 IMAGE HANDLING */
/* ============================= */
let imageDataArray = [];
imageInput.addEventListener("change", () => {
  previewContainer.innerHTML = "";
  imageDataArray = [];
  const files = Array.from(imageInput.files).slice(0, 4);

  files.forEach(file => {
    if (file.size > 500 * 1024) {
      alert(`Image "${file.name}" is too large. Please use a smaller photo (under 500KB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      imageDataArray.push(e.target.result);
      const img = document.createElement("img");
      img.src = e.target.result;
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

/* ============================= */
/* 🔹 SECURITY TOGGLE */
/* ============================= */
typeSelect.addEventListener("change", () => {
  const value = typeSelect.value;
  const securityLabel = securitySection.querySelector('p');
  if (value === "Found" || value === "Lost") {
    securitySection.style.display = "block";
    if (value === "Lost") {
      securityLabel.innerHTML = "<strong>Set a Security Question (for the finder)</strong><br><small style='color: gray;'>Ask about a detail only the finder would see.</small>";
    } else {
      securityLabel.innerHTML = "<strong>Set a Security Question (for the owner)</strong><br><small style='color: gray;'>Ask something only the real owner would know.</small>";
    }
  } else {
    securitySection.style.display = "none";
  }
});

/* ============================= */
/* 🔹 FORM SUBMISSION (STRICT) */
/* ============================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!agreeCheckbox.checked) {
    alert("Please agree to the community guidelines.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Please log in again.");
    return;
  }

  // --- 🛑 STEP 1: STRICT LIMIT CHECK ---
  try {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "items"),
      where("userId", "==", user.uid),
      where("createdAt", ">=", twentyFourHoursAgo)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.size >= DAILY_POST_LIMIT) {
      alert(`Limit reached! You can only post ${DAILY_POST_LIMIT} items every 24 hours.`);
      return; 
    }
  } catch (err) {
    console.error("Security Check Error:", err);
    // Blocks post if ad-blocker or indexing prevents the check
    alert("Security check failed. Please ensure no ad-blockers are active and try again.");
    return; 
  }

  // --- ✅ STEP 2: PREPARE DATA ---
  const type = typeSelect.value;
  if (type === "Found" && imageDataArray.length === 0) {
    alert("Please upload at least one image for FOUND items.");
    return;
  }

  const itemData = {
    userId: user.uid,
    userEmail: user.email,
    username: user.displayName || document.getElementById("username").value || "Anonymous",
    title: document.getElementById("title").value,
    category: document.getElementById("category").value || "Other",
    type: type,
    description: document.getElementById("description").value,
    location: document.getElementById("location").value,
    date: document.getElementById("date").value,
    images: imageDataArray,
    contact: document.getElementById("contact").value || "Not provided",
    securityQuestion: document.getElementById("securityQuestion").value || "",
    securityAnswer: document.getElementById("securityAnswer").value || "",
    status: "Open",
    createdAt: Date.now()
  };

  // --- 🚀 STEP 3: SAVE & REDIRECT ---
  try {
    const docRef = await addDoc(collection(db, "items"), itemData);
    alert("Item posted successfully!");
    window.location.href = "index.html"; 
  } catch (error) {
    console.error("Error posting item:", error);
    alert("Error posting item. Try smaller images.");
  }
});