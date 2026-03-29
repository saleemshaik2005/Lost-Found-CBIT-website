import { db, auth } from "./firebase.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================= */
/* 🔹 CONFIGURATION */
/* ============================= */
const DAILY_POST_LIMIT = 2; 
const CLOUD_NAME = "dq17ske9m";
const UPLOAD_PRESET = "cbitlostandfound_preset";

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
    if (formContainer) formContainer.style.display = "block";
    if (loadingMsg) loadingMsg.style.display = "none";
  } else {
    alert("You must be logged in to post an item.");
    window.location.href = "index.html";
  }
});

/* ============================= */
/* 🔹 IMAGE PREVIEW LOGIC */
/* ============================= */
imageInput.addEventListener("change", () => {
  previewContainer.innerHTML = "";
  const files = Array.from(imageInput.files).slice(0, 4);

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.createElement("img");
      previewImg.src = e.target.result;
      previewImg.style = "width:75px; height:75px; object-fit:cover; border-radius:8px; margin-right:10px;";
      previewContainer.appendChild(previewImg);
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
      securityLabel.innerHTML = "<strong>Security Question (for the finder)</strong><br><small>Ask a detail only the finder would see.</small>";
    } else {
      securityLabel.innerHTML = "<strong>Security Question (for the owner)</strong><br><small>Ask a detail only the real owner would know.</small>";
    }
  } else {
    securitySection.style.display = "none";
  }
});

/* ============================= */
/* 🔹 FORM SUBMISSION (CLOUDINARY) */
/* ============================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!agreeCheckbox.checked) {
    alert("Please agree to the community guidelines.");
    return;
  }

  const user = auth.currentUser;
  if (!user) return alert("Session expired. Please log in again.");

  // 1. Daily Limit Check
  try {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "items"),
      where("userId", "==", user.uid),
      where("createdAt", ">=", twentyFourHoursAgo)
    );

    const snapshot = await getDocs(q);
    if (snapshot.size >= DAILY_POST_LIMIT) {
      alert(`Daily limit reached! You can only post ${DAILY_POST_LIMIT} items every 24 hours.`);
      return; 
    }
  } catch (err) {
    console.error("Limit check error:", err);
  }

  const files = Array.from(imageInput.files).slice(0, 4);
  if (typeSelect.value === "Found" && files.length === 0) {
    alert("Please upload at least one image for FOUND items.");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = "Uploading to Cloud...";

  try {
    // 2. Upload Images to Cloudinary
    const uploadedUrls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.secure_url) {
        uploadedUrls.push(data.secure_url);
      } else {
        throw new Error("Cloudinary upload failed");
      }
    }

    // 3. Prepare Final Data
    const itemData = {
      userId: user.uid,
      userEmail: user.email,
      username: user.displayName || "CBIT Student", 
      title: document.getElementById("title").value.trim(),
      category: document.getElementById("category").value || "Other",
      type: typeSelect.value,
      description: document.getElementById("description").value.trim(),
      location: document.getElementById("location").value.trim(),
      date: document.getElementById("date").value,
      images: uploadedUrls,
      // Backup contact info, only used for approved private chats
      contact: document.getElementById("contact").value.trim() || "Not provided",
      securityQuestion: document.getElementById("securityQuestion").value.trim() || "",
      securityAnswer: document.getElementById("securityAnswer").value.trim() || "",
      status: "Open",
      createdAt: Date.now()
    };

    // 4. Save to Firestore
    await addDoc(collection(db, "items"), itemData);
    alert("Item posted successfully! Check your notifications regularly for claim requests.");
    window.location.href = "index.html"; 
  } catch (error) {
    console.error("Error posting item:", error);
    alert("Failed to post. Please check your connection.");
    submitBtn.disabled = false;
    submitBtn.innerText = "Post Item";
  }
});