import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================= */
/* 🔹 SECURITY CONFIG */
/* ============================= */
const ADMIN_EMAIL = "saleemshaik2005@gmail.com"; 

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    alert("Access Denied: Admins Only.");
    window.location.href = "index.html";
  } else {
    loadStats();
    switchTab('posts'); // Default view
  }
});

/* ============================= */
/* 🔹 DASHBOARD ANALYTICS */
/* ============================= */
async function loadStats() {
  try {
    const posts = await getDocs(collection(db, "items"));
    const users = await getDocs(collection(db, "users"));
    const reports = await getDocs(collection(db, "reports"));
    
    // Update the metric boxes in admin.html
    if (document.getElementById("totalPosts")) document.getElementById("totalPosts").innerText = posts.size;
    if (document.getElementById("totalUsers")) document.getElementById("totalUsers").innerText = users.size;
    if (document.getElementById("totalClaims")) document.getElementById("totalClaims").innerText = reports.size; 
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}

/* ============================= */
/* 🔹 NAVIGATION & VIEW LOGIC */
/* ============================= */
window.switchTab = async (tab) => {
  const content = document.getElementById("adminContent");
  content.innerHTML = "<p style='text-align:center; padding:20px;'><i class='fas fa-spinner fa-spin'></i> Fetching latest data...</p>";

  try {
    if (tab === 'posts') {
      const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      let html = `<h3>All Active Posts (${snapshot.size})</h3>
                  <table style='width:100%; border-collapse: collapse; margin-top:10px; font-size:14px;'>
                  <tr style='background:#eee; text-align:left;'>
                    <th style='padding:10px;'>Title</th><th>User</th><th>Status</th><th>Action</th>
                  </tr>`;
      
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        html += `
          <tr style='border-bottom:1px solid #eee;'>
            <td style='padding:10px;'>${item.title}</td>
            <td>${item.username || 'Anonymous'}</td>
            <td><span class="tag ${item.status.toLowerCase()}">${item.status}</span></td>
            <td>
              <button onclick="adminDeletePost('${docSnap.id}')" style='color:#b22222; border:none; background:none; cursor:pointer; font-size:16px;'>
                <i class='fas fa-trash'></i>
              </button>
            </td>
          </tr>`;
      });
      content.innerHTML = html + "</table>";
    } 
    
    if (tab === 'users') {
      const snapshot = await getDocs(collection(db, "users"));
      let html = `<h3>Registered Students (${snapshot.size})</h3>
                  <table style='width:100%; border-collapse: collapse; margin-top:10px; font-size:14px;'>
                  <tr style='background:#eee; text-align:left;'>
                    <th style='padding:10px;'>Name</th><th>Email</th><th>Status</th><th>Action</th>
                  </tr>`;
      
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        const isBanned = u.isBanned || false;
        html += `
          <tr style='border-bottom:1px solid #eee;'>
            <td style='padding:10px;'><strong>${u.displayName}</strong><br><small>${u.rollNumber || 'No Roll'}</small></td>
            <td>${u.email}</td>
            <td style="color: ${isBanned ? '#b22222' : '#2e5e2e'}; font-weight: bold;">
              ${isBanned ? 'RESTRICTED' : 'ACTIVE'}
            </td>
            <td>
              <button onclick="toggleBanUser('${docSnap.id}', ${isBanned})" 
                      style="background: ${isBanned ? '#2e5e2e' : '#b22222'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight:bold;">
                ${isBanned ? 'Unban' : 'Ban'}
              </button>
            </td>
          </tr>`;
      });
      content.innerHTML = html + "</table>";
    }

    if (tab === 'reports') {
      const snapshot = await getDocs(query(collection(db, "reports"), orderBy("timestamp", "desc")));
      let html = `<h3>User Reports (${snapshot.size})</h3><ul style='list-style:none; padding:0;'>`;
      
      if (snapshot.empty) {
        html += "<p style='text-align:center; color:gray; padding:20px;'>No reports to review.</p>";
      }

      snapshot.forEach(docSnap => {
        const r = docSnap.data();
        html += `
          <li class="details-box" style='margin-bottom:15px; border-left: 5px solid #b22222; padding: 15px;'>
            <p><strong>Reported Item:</strong> ${r.itemTitle} <br><small style="color:gray;">ID: ${r.itemId}</small></p>
            <p><strong>Reason:</strong> <span style="color:#b22222; font-weight:bold;">${r.reason}</span></p>
            <p style="font-size:0.8rem; color:gray;">Reported by: ${r.reportedByEmail || 'Unknown'} on ${new Date(r.timestamp).toLocaleString()}</p>
            <div style="margin-top:10px; display:flex; gap:10px;">
              <button onclick="adminDeletePost('${r.itemId}', '${docSnap.id}')" class="post-btn" style="background:#b22222; font-size:12px; padding:8px;">Delete Reported Post</button>
              <button onclick="dismissReport('${docSnap.id}')" class="post-btn" style="background:gray; font-size:12px; padding:8px;">Dismiss Report</button>
            </div>
          </li>`;
      });
      content.innerHTML = html + "</ul>";
    }
  } catch (error) {
    console.error("Tab switching error:", error);
    content.innerHTML = "<p style='color:red; text-align:center;'>Error loading data. Check console for details.</p>";
  }
};

/* ============================= */
/* 🔹 MODERATION ACTIONS */
/* ============================= */

window.adminDeletePost = async (itemId, reportId = null) => {
  if (confirm("ADMIN ACTION: Permanently delete this post and all associated data?")) {
    try {
      await deleteDoc(doc(db, "items", itemId));
      // If deleting from reports tab, clean up the report document too
      if (reportId) await deleteDoc(doc(db, "reports", reportId));
      
      alert("Post removed successfully.");
      loadStats();
      switchTab(reportId ? 'reports' : 'posts');
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting post.");
    }
  }
};

window.toggleBanUser = async (uid, currentStatus) => {
  const action = currentStatus ? "UNBAN" : "BAN";
  if (confirm(`Are you sure you want to ${action} this student?`)) {
    try {
      await updateDoc(doc(db, "users", uid), { isBanned: !currentStatus });
      alert(`User access has been ${!currentStatus ? 'restricted' : 'restored'}.`);
      switchTab('users');
    } catch (error) {
      console.error("Ban toggle error:", error);
      alert("Failed to update user status.");
    }
  }
};

window.dismissReport = async (reportId) => {
  if (confirm("Dismiss this report? The post will remain active.")) {
    try {
      await deleteDoc(doc(db, "reports", reportId));
      loadStats();
      switchTab('reports');
    } catch (error) {
      console.error("Dismiss report error:", error);
      alert("Failed to dismiss report.");
    }
  }
};