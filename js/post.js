import { db, auth } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */

const form = document.getElementById("postForm");
const imageInput = document.getElementById("images");
const previewContainer = document.getElementById("imagePreview");

/* ============================= */
/* 🔹 AUTH CHECK */
/* ============================= */

// Redirect user to home if they are not logged in
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be logged in to post an item.");
    window.location.href = "index.html";
  }
});

/* ============================= */
/* 🔹 IMAGE HANDLING */
/* ============================= */

let imageDataArray = [];

// Preview selected images (max 4)
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
/* 🔹 FORM SUBMISSION */
/* ============================= */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Please log in again.");
    return;
  }

  const type = document.getElementById("type").value;

  // Validate image requirement
  if (type === "Found" && imageDataArray.length === 0) {
    alert("Please upload at least one image for FOUND items.");
    return;
  }

  // Create item object with User Authentication data
  const item = {
    id: Date.now(),
    userId: user.uid, // Track which user owns this post
    userEmail: user.email, // Store email for admin/contact purposes
    username: user.displayName || document.getElementById("username").value || "Anonymous", // Use Google Name by default
    title: document.getElementById("title").value,
    category: document.getElementById("category").value || "Other",
    type: type,
    description: document.getElementById("description").value,
    location: document.getElementById("location").value,
    date: document.getElementById("date").value,
    images: imageDataArray,
    contact: document.getElementById("contact").value || "Not provided",
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
    alert("Error posting item");
  });
});