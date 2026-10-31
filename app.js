const $ = id => document.getElementById(id);
let currentScenes = [];
let voiceList = [];

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  voiceList = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function splitStory(text) {
  return text.replace(/\r/g, "")
    .split(/(?<=[.!?।])\s+|\n+/)
    .map(s => s.trim()).filter(Boolean);
}

function makeScenes() {
  const story = $("story").value.trim();
  if (!story) return alert("আগে গল্প লিখুন।");

  const parts = splitStory(story);
  const minutes = Number($("duration").value);
  const count = Math.max(3, Math.min(12, parts.length));

  currentScenes = Array.from({length: count}, (_, i) => {
    const start = Math.floor(i * parts.length / count);
    const end = Math.max(start + 1, Math.floor((i + 1) * parts.length / count));
    return {
      title: `দৃশ্য ${i + 1}`,
      text: parts.slice(start, end).join(" "),
      style: $("style").value,
      seconds: Math.round(minutes * 60 / count)
    };
  });

  render();
  showSceneImages();
}

function render() {
  $("results").hidden = false;
  $("scenes").innerHTML = "";

  currentScenes.forEach((scene, i) => {
    const card = document.createElement("article");
    card.className = "scene";

    const title = document.createElement("h3");
    title.textContent = `${scene.title} · ${scene.seconds} সেকেন্ড`;

    const text = document.createElement("p");
    text.textContent = scene.text;

    const style = document.createElement("p");
    style.textContent = `স্টাইল: ${scene.style}`;

    const play = document.createElement("button");
    play.textContent = "এই দৃশ্য শুনুন";
    play.onclick = () => speak(scene.text);

    card.append(title, text, style, play);
    $("scenes").append(card);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return alert("আপনার ব্রাউজারে ভয়েস সুবিধা নেই।");
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = $("lang").value;

  utterance.lang = lang === "bn" ? "bn-BD" :
                   lang === "hi" ? "hi-IN" : "en-US";

  const wanted = $("voice").value;
  const matching = voiceList.filter(v =>
    v.lang.toLowerCase().startsWith(lang)
  );

  const chosen = matching.find(v =>
    wanted === "male"
      ? /male|man|boy/i.test(v.name)
      : /female|woman|girl/i.test(v.name)
  ) || matching[0];

  if (chosen) utterance.voice = chosen;
  speechSynthesis.speak(utterance);
}


function speakAll() {
  if (!currentScenes.length) {
    alert("আগে দৃশ্য তৈরি করুন।");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("এই ব্রাউজারে ভয়েস সুবিধা নেই।");
    return;
  }

  speechSynthesis.cancel();

  let index = 0;

  function playNext() {
    if (index >= currentScenes.length) return;

    const utterance = new SpeechSynthesisUtterance(
      currentScenes[index].text
    );

    const lang = $("lang").value;

    utterance.lang = lang === "bn" ? "bn-BD" :
                     lang === "hi" ? "hi-IN" : "en-US";

    utterance.rate = 0.9;

    utterance.onend = () => {
      index++;
      playNext();
    };

    utterance.onerror = (event) => {
      alert("ভয়েস চালাতে সমস্যা হচ্ছে: " + event.error);
    };

    speechSynthesis.speak(utterance);
  }

  playNext();
}


$("make").addEventListener("click", makeScenes);

$("clear").addEventListener("click", () => {
  $("story").value = "";
  $("results").hidden = true;
  currentScenes = [];
  speechSynthesis.cancel();
});

$("download").addEventListener("click", () => {
  const content = currentScenes.map(s =>
    `${s.title}\n${s.text}\nসময়: ${s.seconds} সেকেন্ড\nস্টাইল: ${s.style}`
  ).join("\n\n");

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "story-scenes.txt";
  link.click();
  URL.revokeObjectURL(link.href);
});

loadVoices();
function showSceneImages() {
  const container = document.getElementById("video-images");

  if (!container || !currentScenes.length) return;

  container.innerHTML = "<h2>দৃশ্য অনুযায়ী ছবির বর্ণনা</h2>";

  currentScenes.forEach((scene, index) => {
    const card = document.createElement("div");
    card.className = "scene-card";

    const title = document.createElement("h3");
    title.textContent = "দৃশ্য " + (index + 1);

    const prompt = document.createElement("p");

    const styleMap = {
      "সিনেমাটিক": "cinematic, dramatic lighting, movie scene, high detail",
      "কার্টুন": "colorful cartoon illustration, expressive characters",
      "অ্যানিমে": "anime art style, detailed background, beautiful colors",
      "বাস্তবধর্মী": "photorealistic, realistic lighting, highly detailed",
      "ফ্যান্টাসি": "fantasy art, magical atmosphere, beautiful scenery"
    };

    const stylePrompt = styleMap[scene.style] || "beautiful detailed illustration";

    prompt.textContent =
      stylePrompt + ". Create an image showing: " +
      scene.text +
      ". Consistent characters, 16:9 landscape composition, no text.";

    const copy = document.createElement("button");
    copy.textContent = "ছবির বর্ণনা কপি করুন";

    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(prompt.textContent);
        alert("ছবির বর্ণনা কপি হয়েছে!");
      } catch (error) {
        alert("কপি হয়নি। বর্ণনাটি হাতে কপি করুন।");
      }
    };

    card.append(title, prompt, copy);
    container.appendChild(card);
  });
}
const videoButton = document.getElementById("create-video");

if (videoButton) {
  videoButton.addEventListener("click", async () => {
    const status = document.getElementById("video-status");

    if (!currentScenes.length) {
      alert("আগে দৃশ্য তৈরি করুন।");
      return;
    }

    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      status.textContent = "এই ব্রাউজারে ভিডিও তৈরি সমর্থিত নয়।";
      return;
    }

    videoButton.disabled = true;
    status.textContent = "ভিডিও তৈরি হচ্ছে...";

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;

    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(24);

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm"
    });

    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "my-story-video.webm";
      link.click();

      URL.revokeObjectURL(url);
      status.textContent = "ভিডিও ডাউনলোড হয়েছে!";
      videoButton.disabled = false;
      stream.getTracks().forEach(track => track.stop());
    };

    recorder.start();

    for (let i = 0; i < currentScenes.length; i++) {
      const scene = currentScenes[i];

      ctx.fillStyle = "#101322";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText("দৃশ্য " + (i + 1), 640, 250);

      ctx.font = "30px sans-serif";
      ctx.fillText("AI Story Studio", 640, 330);

      ctx.font = "24px sans-serif";
      const words = scene.text.split(" ");
      let line = "";
      let y = 410;

      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > 1050) {
          ctx.fillText(line, 640, y);
          line = word + " ";
          y += 42;
        } else {
          line = test;
        }
      }

      ctx.fillText(line, 640, y);

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    recorder.stop();
  });
}
