const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const levelDisplay = document.getElementById("levelDisplay");
const skorDisplay = document.getElementById("skorDisplay");
const missDisplay = document.getElementById("missDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const controlsDisplay = document.getElementById("controls");
const finalScoreDisplay = document.getElementById("finalScore");

const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnRestart = document.getElementById("btnRestart");
const btnMainLagi = document.getElementById("btnMainLagi");
const btnSound = document.getElementById("btnSound");

// --- VARIABEL GAME ---
let highScore = parseInt(localStorage.getItem("skorTertinggiBuahBali")) || 0;
let skor = 0;
let miss = 0;
let level = 1;
let isGameOver = false;
let isPaused = false;      
let gameInterval;          
let animationId;           
let daftarObjek = []; 

// --- VARIABEL AUDIO ---
let audioCtx;
let isSoundEnabled = true;

const MAKSIMAL_LEVEL = 10; 
const KECEPATAN_AWAL = 3;  
const emojiBuah = ['🍌', '🍊', '🥭', '🍍', '🥥'];

const keranjang = {
    x: 160,       
    y: 520,       
    lebar: 80,    
    tinggi: 60,
    kecepatan: 6,
    bergerakKiri: false,
    bergerakKanan: false
};

// --- FUNGSI AUDIO ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(jenis) {
    if (!isSoundEnabled || !audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain(); 

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (jenis === 'tangkap') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    } else if (jenis === 'lewat') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    } else if (jenis === 'bom') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } else if (jenis === 'gameover') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(300, now + 0.2);
        oscillator.frequency.setValueAtTime(200, now + 0.4);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
    }
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    btnSound.innerText = isSoundEnabled ? "🔊 ON" : "🔇 OFF";
}

// --- Kontrol Keyboard ---
document.addEventListener("keydown", function(event) {
    if (event.key === "ArrowLeft" || event.key === "a") keranjang.bergerakKiri = true;
    if (event.key === "ArrowRight" || event.key === "d") keranjang.bergerakKanan = true;
});

document.addEventListener("keyup", function(event) {
    if (event.key === "ArrowLeft" || event.key === "a") keranjang.bergerakKiri = false;
    if (event.key === "ArrowRight" || event.key === "d") keranjang.bergerakKanan = false;
});

// --- Fungsi Memunculkan Objek ---
function tambahObjek() {
    if (isGameOver || isPaused) return; 

    const ukuranObjek = 45; // Sedikit dibesarkan agar visualnya lebih mantap
    const posisiXAcak = Math.random() * (canvas.width - ukuranObjek);
    const peluangBom = Math.random();
    let jenisObjek = "buah";
    let ikonEmoji = "";

    if (peluangBom < 0.2) {
        jenisObjek = "bom";
        ikonEmoji = '💣';
    } else {
        const indexAcak = Math.floor(Math.random() * emojiBuah.length);
        ikonEmoji = emojiBuah[indexAcak];
    }
    
    const kecepatanObjekSaatIni = KECEPATAN_AWAL + (level * 0.5);

    daftarObjek.push({
        x: posisiXAcak,
        y: -45, 
        ukuran: ukuranObjek,
        kecepatan: kecepatanObjekSaatIni, 
        jenis: jenisObjek,
        ikon: ikonEmoji
    });
}

// --- Fungsi Utama Game Loop ---
function updateGame() {
    if (isGameOver || isPaused) return; 

    if (keranjang.bergerakKiri && keranjang.x > 0) keranjang.x -= keranjang.kecepatan;
    if (keranjang.bergerakKanan && keranjang.x + keranjang.lebar < canvas.width) keranjang.x += keranjang.kecepatan;

    for (let i = 0; i < daftarObjek.length; i++) {
        let objek = daftarObjek[i];
        objek.y += objek.kecepatan;
        let titikTengahObjekX = objek.x + (objek.ukuran / 2);

        // 1. Deteksi Tabrakan
        if (
            objek.y + objek.ukuran >= keranjang.y &&
            objek.y <= keranjang.y + keranjang.tinggi && 
            titikTengahObjekX >= keranjang.x &&
            titikTengahObjekX <= keranjang.x + keranjang.lebar
        ) {
            if (objek.jenis === "buah") {
                skor += 10;
                playSound('tangkap'); 
                cekKenaikanLevel(); 
            } else if (objek.jenis === "bom") {
                playSound('bom'); 
                akhiriGame(); 
                return; 
            }
            
            updateHUD();
            daftarObjek.splice(i, 1);
            i--;
            continue; 
        }

        // 2. Deteksi Terlewat
        if (objek.y > canvas.height) {
            if (objek.jenis === "buah") {
                skor -= 5;
                if (skor < 0) skor = 0; 
                miss += 1; 
                playSound('lewat'); 
                cekKenaikanLevel(); 

                if (miss >= 10) {
                    playSound('gameover'); 
                    akhiriGame();
                    return;
                }
            }
            
            updateHUD();
            daftarObjek.splice(i, 1);
            i--;
        }
    }

    gambarSemua();
    animationId = requestAnimationFrame(updateGame);
}

// --- Logika Kenaikan Level ---
function cekKenaikanLevel() {
    let hitungLevel = Math.floor(skor / 100) + 1;
    if (hitungLevel < 1) hitungLevel = 1;
    if (hitungLevel > MAKSIMAL_LEVEL) hitungLevel = MAKSIMAL_LEVEL;
    level = hitungLevel;
}

function updateHUD() {
    levelDisplay.innerText = "Level: " + level;
    skorDisplay.innerText = "Skor: " + skor;
    missDisplay.innerText = "Miss: " + miss + "/10";
    highScoreDisplay.innerText = highScore; 
}

// --- FUNGSI KONTROL GAME ---
function mulaiGame() {
    initAudio(); 

    skor = 0;
    miss = 0;
    level = 1; 
    isGameOver = false;
    isPaused = false;
    daftarObjek = [];
    keranjang.x = 160;
    keranjang.bergerakKiri = false;
    keranjang.bergerakKanan = false;
    
    updateHUD(); 

    btnPause.innerText = "Pause"; 
    startScreen.style.display = "none"; 
    gameOverScreen.style.display = "none"; 
    controlsDisplay.style.display = "flex"; 
    
    if (gameInterval) clearInterval(gameInterval);
    if (animationId) cancelAnimationFrame(animationId);
    
    gameInterval = setInterval(tambahObjek, 1000); 
    updateGame();
}

function togglePause() {
    if (isGameOver) return; 
    isPaused = !isPaused; 
    
    if (isPaused) {
        btnPause.innerText = "Lanjutkan";
        clearInterval(gameInterval); 
        keranjang.bergerakKiri = false;
        keranjang.bergerakKanan = false;
    } else {
        btnPause.innerText = "Pause";
        gameInterval = setInterval(tambahObjek, 1000); 
        updateGame(); 
    }
}

function akhiriGame() {
    isGameOver = true;
    clearInterval(gameInterval); 
    controlsDisplay.style.display = "none"; 
    
    if (skor > highScore) {
        highScore = skor; 
        localStorage.setItem("skorTertinggiBuahBali", highScore);
    }

    finalScoreDisplay.innerText = skor; 
    updateHUD(); 
    gameOverScreen.style.display = "block"; 
}

// --- Mendaftarkan Event Tombol ---
btnStart.addEventListener("click", mulaiGame);
btnMainLagi.addEventListener("click", mulaiGame);
btnRestart.addEventListener("click", mulaiGame); 
btnPause.addEventListener("click", togglePause);
btnSound.addEventListener("click", toggleSound); 

// --- Fungsi Menggambar ---
function gambarSemua() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // === TAMBAHAN VISUAL POLISHING: Bayangan Objek (Shadows) ===
    // Membuat emoji terlihat 3D dan lebih menonjol di latar belakang
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 5;
    
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Gambar Keranjang
    ctx.font = "70px Arial"; 
    ctx.fillText("🧺", keranjang.x, keranjang.y - 10);

    // Gambar Objek Buah / Bom
    for (let i = 0; i < daftarObjek.length; i++) {
        let objek = daftarObjek[i];
        ctx.font = objek.ukuran + "px Arial";
        ctx.fillText(objek.ikon, objek.x, objek.y);
    }
    
    // Matikan shadow untuk teks sistem (PAUSED) agar tetap bersih
    ctx.shadowColor = "transparent";
    
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }
}

updateHUD();
gambarSemua();