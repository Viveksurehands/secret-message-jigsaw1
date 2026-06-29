document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById("generate-btn");
    const secretMessageInput = document.getElementById("secret-message");
    const imageUploadInput = document.getElementById("image-upload");
    const pieceCountSelect = document.getElementById("piece-count");
    const shareableLinkInput = document.getElementById("shareable-link");
    const linkOutputContainer = document.getElementById("link-output-container");
    
    let selectedPreset = null;

    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
            imageUploadInput.value = ""; 
            selectedPreset = e.target.getAttribute("data-preset");
            e.target.classList.add("active");
        });
    });

    imageUploadInput.addEventListener("change", () => {
        document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
        selectedPreset = null;
    });

    generateBtn.addEventListener("click", () => {
        const text = secretMessageInput.value.trim();
        const file = imageUploadInput.files[0];
        const pieceCount = parseInt(pieceCountSelect.value, 10);

        if (!text) { alert("Please input a secret message first."); return; }
        if (!file && !selectedPreset) { alert("Please upload an image or choose a challenge preset."); return; }

        if (selectedPreset) {
            const presetImgData = generatePresetImageData(selectedPreset);
            createLinkPayload(text, presetImgData, pieceCount);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    const maxUrlCanvas = document.createElement("canvas");
                    maxUrlCanvas.width = 300; maxUrlCanvas.height = 225;
                    const ctx = maxUrlCanvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 300, 225);
                    createLinkPayload(text, maxUrlCanvas.toDataURL("image/jpeg", 0.3), pieceCount);
                };
            };
            reader.readAsDataURL(file);
        }
    });

    function generatePresetImageData(presetType) {
        const canvas = document.createElement("canvas");
        canvas.width = 300; canvas.height = 225;
        const ctx = canvas.getContext("2d");
        if (presetType === "white") {
            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 300, 225);
        } else if (presetType === "black") {
            ctx.fillStyle = "#111111"; ctx.fillRect(0, 0, 300, 225);
        } else if (presetType === "illusion") {
            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 300, 225);
            ctx.fillStyle = "#000000";
            for (let i = 0; i < 300; i += 15) { ctx.fillRect(i, 0, 7, 225); }
        }
        return canvas.toDataURL("image/jpeg", 0.4);
    }

    function createLinkPayload(msg, imgData, pieces) {
        const payload = { msg: msg, img: imgData, count: pieces };
        const encodedData = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
        
        // Dynamic directory resolver that works flawlessly on local host networks and live web deployments
        const currentPath = window.location.pathname;
        const baseDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        const gameUrl = `${window.location.origin}${baseDir}play.html?p=${encodedData}`;

        // Set up the UI components immediately to show a loading state
        shareableLinkInput.value = "Shortening link...";
        linkOutputContainer.classList.remove("hidden");

        const visitBtn = document.getElementById("visit-btn");
        if (visitBtn) {
            visitBtn.style.display = "none"; // Hide until short link is ready
        }


        // --- INSTANT DIRECT SHORTENER API ---

    
        fetch(`https://api.tinyurl.com/create`, {
   
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer g78h9jKLaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890' 
  
            },
  
  
            body: JSON.stringify({   
                url: gameUrl,   
                domain: "tinyurl.com"
   
            })

        })

        .then(response => {  
            if (!response.ok) throw new Error("Shortener response issue");    
            return response.json();

        })

        .then(data => {
            if (data && data.data && data.data.tiny_url) {     
                const shortUrl = data.data.tiny_url;      
                shareableLinkInput.value = shortUrl;
        
       
                if (visitBtn) {         
                    visitBtn.href = shortUrl;          
                    visitBtn.style.display = "inline-block"; 
       
                }
   
            } else {     
                throw new Error("Invalid data structure received");
  
            }

        })

        .catch(error => {  
            console.error("Shortener failed, falling back to long URL:", error);    
            shareableLinkInput.value = gameUrl;    
            if (visitBtn) {   
                visitBtn.href = gameUrl;
                visitBtn.style.display = "inline-block";
    
            }

        });
    }

    document.getElementById("copy-btn").addEventListener("click", () => {
        shareableLinkInput.select();
        document.execCommand("copy");
        alert("Challenge Link Copied!");
    });

    // --- DARK MODE THEME SWITCH MANAGER ---
    const themeCheckbox = document.getElementById("dark-mode-checkbox");

    // 1. Check if dark mode was previously enabled by the user
    if (localStorage.getItem("dark-mode") === "enabled") {
        document.body.classList.add("dark-mode");
        if (themeCheckbox) themeCheckbox.checked = true;
    }

    // 2. Add Event Listener to catch toggle interactions
    if (themeCheckbox) {
        themeCheckbox.addEventListener("change", () => {
            if (themeCheckbox.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("dark-mode", "enabled");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("dark-mode", "disabled");
            }
        });
    }
});