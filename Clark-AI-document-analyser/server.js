const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises'); // Използваме само при големи файлове
const cluster = require('cluster');
const os = require('os');
const async = require('async');

const app = express();
app.use(express.json());

// --- СТРУКТУРА НА ПАПКИТЕ ---
const BASE_VAULT = path.join(__dirname, 'vault');
const FILES_DIR = path.join(BASE_VAULT, 'files');
const KEYS_DIR = path.join(BASE_VAULT, 'keys');

const clearDirectory = (directory) => {
    if (fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach(file => fs.unlinkSync(path.join(directory, file)));
    } else {
        fs.mkdirSync(directory, { recursive: true });
    }
};

// Инициализация
clearDirectory(FILES_DIR);
clearDirectory(KEYS_DIR);

const MASTER_SECRET = "SuperSecret2026";
const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024; // Лимит: 500 MB

// Cluster support
if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        // Restart worker
        cluster.fork();
    });
} else {
    // Worker process
    console.log(`Worker ${process.pid} started`);

    // File queue
    const uploadQueue = async.queue(async (task, callback) => {
        const { url, fileId } = task;

        try {
            // Първо проверяваме размера чрез HEAD заявка
            const headRes = await axios.head(url);
            const fileSize = parseInt(headRes.headers['content-length'] || "0");
            const sessionKey = crypto.randomBytes(32);
            const iv = crypto.randomBytes(12); // GCM препоръчва 12 байта IV
            const filePath = path.join(FILES_DIR, `${fileId}.dat`);
            let authTag;

            if (fileSize > LARGE_FILE_THRESHOLD) {
                // --- ПЪТ Б: STREAMING (За големи файлове, AES-256-GCM) ---
                console.log(`🌊 Стрийминг режим за голям файл (${(fileSize/1024/1024).toFixed(2)} MB)`);
                const response = await axios.get(url, { responseType: 'stream' });
                const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
                const outStream = fs.createWriteStream(filePath);
                await pipeline(response.data, cipher, outStream);
                authTag = cipher.getAuthTag();
            } else {
                // --- ПЪТ А: СТАБИЛНИЯТ ТИ КОД (За нормални файлове, AES-256-GCM) ---
                console.log(`⚡ Стандартен режим за файл (${(fileSize/1024/1024).toFixed(2)} MB)`);
                const fileRes = await axios.get(url, { responseType: 'arraybuffer' });
                const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
                const encrypted = Buffer.concat([cipher.update(Buffer.from(fileRes.data)), cipher.final()]);
                authTag = cipher.getAuthTag();
                fs.writeFileSync(filePath, encrypted);
            }

            // Запис на ключа и таг-а
            fs.writeFileSync(path.join(KEYS_DIR, `${fileId}.key`), JSON.stringify({
                sessionKey: sessionKey.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                processedBy: fileSize > LARGE_FILE_THRESHOLD ? 'stream' : 'buffer',
                cipher: 'aes-256-gcm'
            }));

            callback(null, fileId);
        } catch (err) {
            callback(err);
        }
    }, os.cpus().length); // Concurrency based on CPU cores


    // --- СТАТУС СТРАНИЦА ЗА GET ---
    app.get('/', (req, res) => {
        // Брой файлове и ключове
        const filesCount = fs.existsSync(FILES_DIR) ? fs.readdirSync(FILES_DIR).length : 0;
        const keysCount = fs.existsSync(KEYS_DIR) ? fs.readdirSync(KEYS_DIR).length : 0;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`
            <html>
            <head>
                <title>Clark Document Analyzer Server</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; color: #222; margin: 0; padding: 0; }
                    .container { max-width: 500px; margin: 60px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px; }
                    h1 { color: #2a6; }
                    .stat { font-size: 1.2em; margin: 12px 0; }
                    .ok { color: #2a6; }
                </style>
                <script>
                    function updateTime() {
                        const now = new Date();
                        document.getElementById('live-time').textContent = now.toLocaleString('bg-BG');
                    }
                    setInterval(updateTime, 1000);
                    window.onload = updateTime;
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>Clark Vault Status</h1>
                    <div class="stat">🗄️ Файлове във vault: <b>${filesCount}</b></div>
                    <div class="stat">🔑 Ключове във vault: <b>${keysCount}</b></div>
                    <div class="stat ok">Сървърът работи! <span id="live-time"></span></div>
                </div>
            </body>
            </html>
        `);
    });

    // --- ГЛАВНА ФУНКЦИЯ ЗА КАЧВАНЕ ---
    app.post('/', async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            if (!authHeader || authHeader !== `Bearer ${MASTER_SECRET}`) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { action, url, fileId, sessionId } = req.body;

            // 1. ДЕЙСТВИЕ: АНАЛИЗ (Твоят работещ код)
            if (action === "analyze") {
                if (!fileId) return res.status(400).json({ error: "Missing fileId" });
                const filePath = path.join(FILES_DIR, `${fileId}.dat`);
                const keyPath = path.join(KEYS_DIR, `${fileId}.key`);

                if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });

                // Cleanup след успех
                fs.unlinkSync(filePath);
                fs.unlinkSync(keyPath);
                return res.json({ success: true, answer: `Анализът на ${fileId} е завършен. Системата изчисти временните данни.` });
            }

            // 2. ДЕЙСТВИЕ: КАЧВАНЕ (Хибридна логика)
            if (action === "upload") {
                if (!url) return res.status(400).json({ error: "Missing URL" });

                const newFileId = `ID-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

                // Add to queue
                uploadQueue.push({ url, fileId: newFileId }, (err, resultFileId) => {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }
                    res.json({ success: true, fileId: resultFileId });
                });
            }

        } catch (err) {
            console.error("❌ ГРЕШКА:", err.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🛡️ Unified Vault Server Worker ${process.pid} running on port ${PORT}`));
}