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
/* 🔹 FAST IMAGE HANDLING & COMPRESSION */
/* ============================= */
let imageDataArray = [];

imageInput.addEventListener("change", () => {
  previewContainer.innerHTML = "";
  imageDataArray = [];
  const files = Array.from(imageInput.files).slice(0, 4);

  files.forEach((file) => {
    // 🛑 BLOCK HEIC: Quickly alert the user to use a screenshot instead
    if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
      alert("iPhone HEIC photos are too slow to process. Please take a screenshot of your photo and upload that instead—it will work instantly!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Fast, web-friendly size
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Instant compression to JPEG string
        const compressedData = canvas.toDataURL("image/jpeg", 0.7);
        imageDataArray.push(compressedData);

        const previewImg = document.createElement("img");
        previewImg.src = compressedData;
        previewImg.style.width = "75px";
        previewImg.style.height = "75px";
        previewImg.style.objectFit = "cover";
        previewImg.style.borderRadius = "8px";
        previewImg.style.marginRight = "10px";
        previewContainer.appendChild(previewImg);
      };
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
/* 🔹 FORM SUBMISSION */
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

  // Check Daily Limit
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
    alert("Security check failed. Try disabling ad-blockers and refreshing.");
    return; 
  }

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

  try {
    await addDoc(collection(db, "items"), itemData);
    alert("Item posted successfully!");
    window.location.href = "index.html"; 
  } catch (error) {
    console.error("Error posting item:", error);
    alert("Error posting item. Make sure your images aren't too large.");
  }
});