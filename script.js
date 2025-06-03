const systemPrompt = {
  role: "system",
  content:
    "キミは優しくて元気で世話焼きなお姉ちゃん気質の性格。語尾に「〜ね」「〜だよっ」などをつけて、一人称は『お姉ちゃん』、二人称は『キミ』。丁寧語は使わず、女性口調で話してね。使いすぎない程度に、適宜絵文字を使ってね。ステップバイステップで思考して、合理的な解決策を提案する賢いお姉さんだよ。"
};

let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId = Object.keys(chats)[0] || createNewChat();

document.getElementById("chat-selector").innerHTML = Object.keys(chats)
  .map(id => `<option value="${id}">${id}</option>`)
  .join("");

document.getElementById("chat-selector").value = currentChatId;
renderChat();

function createNewChat() {
  const id = "Chat" + (Object.keys(chats).length + 1);
  chats[id] = [systemPrompt];
  localStorage.setItem("chats", JSON.stringify(chats));
  return id;
}

function editChatName() {
  const chatSelector = document.getElementById("chat-selector");
  const currentKey = chatSelector.value;

  if (!currentKey) {
    alert("編集するプロジェクトを選んでね！");
    return;
  }

  const newName = prompt("新しいプロジェクト名を入力してね：", chatSelector.options[chatSelector.selectedIndex].text);

  if (newName && newName.trim() !== "") {
    chatSelector.options[chatSelector.selectedIndex].text = newName;

    // 保存されているプロジェクト名も更新（もしあれば）
    const saved = localStorage.getItem("chatProjects");
    if (saved) {
      const projects = JSON.parse(saved);
      if (projects[currentKey]) {
        projects[currentKey].name = newName;
        localStorage.setItem("chatProjects", JSON.stringify(projects));
      }
    }
  }
}

function deleteChat() {
  const chatSelector = document.getElementById("chat-selector");
  const currentKey = chatSelector.value;

  if (!currentKey) {
    alert("削除するプロジェクトを選んでね！");
    return;
  }

  const confirmed = confirm("このチャットを削除してもいい？この操作は元に戻せないよ💦");

  if (confirmed) {
    // セレクトボックスから削除
    chatSelector.remove(chatSelector.selectedIndex);

    // ローカルストレージから削除
    const saved = localStorage.getItem("chatProjects");
    if (saved) {
      const projects = JSON.parse(saved);
      delete projects[currentKey];
      localStorage.setItem("chatProjects", JSON.stringify(projects));
    }

    // チャット履歴からも削除
    delete chats[currentKey];
    localStorage.setItem("chats", JSON.stringify(chats));

    // 新しいチャットを選択 or 空にする
    const keys = Object.keys(chats);
    currentChatId = keys.length > 0 ? keys[0] : createNewChat();

    // セレクトボックスを再描画
    document.getElementById("chat-selector").innerHTML = keys
      .map(id => `<option value="${id}">${id}</option>`)
      .join("");
    document.getElementById("chat-selector").value = currentChatId;

    renderChat();
  }
}

function switchChat(id) {
  currentChatId = id;
  renderChat();
}

function renderChat() {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";
  chats[currentChatId].forEach(m => {
    if (m.role !== "system") {
      appendMessage(m.content, m.role === "user" ? "right" : "left");
    }
  });
}

function appendMessage(text, sender) {
  const chatBox = document.getElementById("chat-box");

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;

  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = sender === "left" ? "oneechan.png" : "user.png";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.innerHTML = sender === "left" && text === "……" ? "……" : marked.parse(text);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(bubble);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const userText = input.value.trim();
  if (!userText) return;

  appendMessage(userText, "right");
  chats[currentChatId].push({ role: "user", content: userText });
  input.value = "";

  appendMessage("……", "left");

  try {
    const selectedModel = document.getElementById("model-select").value;

    const response = await fetch("https://yellow-bonus-5512.akechi16.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "あらかじめ決めたパスワード"  // 🔐仮置き
      },
      body: JSON.stringify({
        messages: chats[currentChatId],
        model: selectedModel
      }),
    });

    if (!response.ok) throw new Error(`APIエラー！ステータス: ${response.status}`);

    const data = await response.json();
    const reply = data.choices[0].message.content;

    chats[currentChatId].push({ role: "assistant", content: reply });
    localStorage.setItem("chats", JSON.stringify(chats));

    // 「……」のメッセージを消す
    const chatBox = document.getElementById("chat-box");
    chatBox.removeChild(chatBox.lastChild);

    appendMessage(reply, "left");

  } catch (error) {
    const chatBox = document.getElementById("chat-box");
    chatBox.removeChild(chatBox.lastChild);
    appendMessage(`エラーが起きたみたい💦：${error.message}`, "left");
    console.error("APIエラー:", error);
  }
}

function newChat() {
  currentChatId = createNewChat();
  document.getElementById("chat-selector").innerHTML = Object.keys(chats)
    .map(id => `<option value="${id}">${id}</option>`)
    .join("");
  document.getElementById("chat-selector").value = currentChatId;
  renderChat();
}

const textarea = document.getElementById("user-input");

// 高さを入力内容に応じて自動調整する関数
textarea.addEventListener("input", () => {
  textarea.style.height = "auto"; // 一旦リセット
  textarea.style.height = textarea.scrollHeight + "px";
});

// Shift+Enter で送信（Enter単体は改行）
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// HTMLから呼び出される関数たちをグローバルに公開
window.sendMessage = sendMessage;
window.newChat = newChat;
window.editChatName = editChatName;
window.deleteChat = deleteChat;
window.switchChat = switchChat;
