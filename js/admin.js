import { db, auth } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔥 SECURITY: Replace this with your actual Google Email
const ADMIN_EMAIL = "saleemshaik2005@gmail.com"; 

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    alert("Access Denied: Admins Only.");
    window.location.href = "index.html";
  } else {
    loadStats();
    switchTab('posts');
  }
});

async function loadStats() {
  const posts = await getDocs(collection(db, "items"));
  const users = await getDocs(collection(db, "users"));
  const claims = await getDocs(collection(db, "claims"));
  
  document.getElementById("totalPosts").innerText = posts.size;
  document.getElementById("totalUsers").innerText = users.size;
  document.getElementById("totalClaims").innerText = claims.size;
}

window.switchTab = async (tab) => {
  const content = document.getElementById("adminContent");
  content.innerHTML = "<p style='text-align:center;'>Fetching data...</p>";

  if (tab === 'posts') {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    let html = `<h3>All Active Posts (${snapshot.size})</h3><table style='width:100%; border-collapse: collapse; margin-top:10px;'>`;
    html += `<tr style='background:#eee; text-align:left;'><th>Title</th><th>User</th><th>Status</th><th>Action</th></tr>`;
    
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      html += `
        <tr style='border-bottom:1px solid #eee;'>
          <td style='padding:10px;'>${item.title}</td>
          <td>${item.username}</td>
          <td>${item.status}</td>
          <td><button onclick="adminDeletePost('${docSnap.id}')" style='color:red; border:none; background:none; cursor:pointer;'><i class='fas fa-trash'></i></button></td>
        </tr>`;
    });
    content.innerHTML = html + "</table>";
  } 
  
  if (tab === 'users') {
    const snapshot = await getDocs(collection(db, "users"));
    let html = `<h3>Registered Students (${snapshot.size})</h3><ul style='list-style:none; padding:0;'>`;
    
    snapshot.forEach(docSnap => {
      const u = docSnap.data();
      html += `
        <li style='padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;'>
          <span><strong>${u.displayName}</strong> (${u.rollNumber || 'No Roll'})</span>
          <span style='color:gray;'>ID: ${docSnap.id}</span>
        </li>`;
    });
    content.innerHTML = html + "</ul>";
  }
};

window.adminDeletePost = async (id) => {
  if (confirm("ADMIN ACTION: Permanently delete this post?")) {
    await deleteDoc(doc(db, "items", id));
    loadStats();
    switchTab('posts');
  }
};