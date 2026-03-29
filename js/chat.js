import { db, auth } from "./firebase.js";
import { doc, onSnapshot, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("id");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if (!chatId) {
        chatMessages.innerHTML = "<p>Invalid Chat ID.</p>";
        return;
    }

    // 🟢 Real-time listener for messages
    onSnapshot(doc(db, "chats", chatId), (snapshot) => {
        if (!snapshot.exists()) {
            chatMessages.innerHTML = "<p>Chat room not found or not yet approved.</p>";
            return;
        }

        const data = snapshot.data();
        document.getElementById("chatHeaderTitle").innerText = data.itemTitle || "Item Chat";
        
        displayMessages(data.messages || []);
    });
});

function displayMessages(messages) {
    chatMessages.innerHTML = "";
    if (messages.length === 0) {
        chatMessages.innerHTML = "<p style='text-align:center; color:gray; margin-top:20px;'>No messages yet. Start the conversation!</p>";
    }

    messages.forEach(msg => {
        const isMine = msg.senderId === auth.currentUser.uid;
        const msgDiv = document.createElement("div");
        
        // Dynamic Styling for Bubbles
        msgDiv.style.alignSelf = isMine ? "flex-end" : "flex-start";
        msgDiv.style.background = isMine ? "#2e5e2e" : "#eee";
        msgDiv.style.color = isMine ? "white" : "#333";
        msgDiv.style.padding = "10px 15px";
        msgDiv.style.borderRadius = isMine ? "15px 15px 2px 15px" : "15px 15px 15px 2px";
        msgDiv.style.maxWidth = "80%";
        msgDiv.style.fontSize = "14px";
        msgDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        
        msgDiv.innerText = msg.text;
        chatMessages.appendChild(msgDiv);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = ""; // Clear input immediately for better feel

    try {
        await updateDoc(doc(db, "chats", chatId), {
            messages: arrayUnion({
                senderId: auth.currentUser.uid,
                text: text,
                timestamp: Date.now()
            })
        });
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. You might not have permission.");
    }
}

sendBtn.onclick = sendMessage;
messageInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };