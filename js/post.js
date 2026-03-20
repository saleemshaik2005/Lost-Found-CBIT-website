import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================= */
/* 🔹 DOM ELEMENTS */
/* ============================= */

const form = document.getElementById("postForm");
const imageInput = document.getElementById("images");
const previewContainer = document.getElementById("imagePreview");


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
  const type = document.getElementById("type").value;

  // Validate image requirement
  if (type === "Found" && imageDataArray.length === 0) {
    alert("Please upload at least one image for FOUND items.");
    return;
  }

  // Create item object
  const item = {
    id: Date.now(),
    title: document.getElementById("title").value,
    category: document.getElementById("category").value || "Other",
    type: type,
    description: document.getElementById("description").value,
    location: document.getElementById("location").value,
    date: document.getElementById("date").value,
    images: imageDataArray,
    username: document.getElementById("username").value || "Anonymous",
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
    console.error(error);
    alert("Error posting item");
  });

});