import { db, auth } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

/* ============================= */
/* 🔹 AUTH CHECK */
/* ============================= */

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Show form once user is verified
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
/* 🔹 SECURITY SECTION TOGGLE */
/* ============================= */

// Only show security questions if the item is "Found"
typeSelect.addEventListener("change", () => {
  if (typeSelect.value === "Found") {
    securitySection.style.display = "block";
  } else {
    securitySection.style.display = "none";
  }
});

/* ============================= */
/* 🔹 FORM SUBMISSION */
/* ============================= */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Please log in again.");
    return;
  }

  const type = typeSelect.value;

  if (type === "Found" && imageDataArray.length === 0) {
    alert("Please upload at least one image for FOUND items.");
    return;
  }

  // Create item object with Security Question data
  const item = {
    id: Date.now(),
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
    
    // Security fields for the Claim System
    securityQuestion: document.getElementById("securityQuestion").value || "",
    securityAnswer: document.getElementById("securityAnswer").value || "",
    
    status: "Open",
    createdAt: Date.now()
  };

  addDoc(collection(db, "items"), item)
  .then(() => {
    alert("Item posted successfully!");
    window.location.href = "index.html";
  })
  .catch(error => {
    console.error("Error posting item:", error);
    alert("Error posting item. Ensure your images are small (under 1MB total).");
  });
});