const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises'); // Използваме само при големи файлове

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
const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024; // Лимит: 50 MB (можеш да го промениш)

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

            // Първо проверяваме размера чрез HEAD заявка
            const headRes = await axios.head(url);
            const fileSize = parseInt(headRes.headers['content-length'] || "0");
            
            const newFileId = `ID-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const sessionKey = crypto.randomBytes(32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', sessionKey, iv);
            const filePath = path.join(FILES_DIR, `${newFileId}.dat`);

            if (fileSize > LARGE_FILE_THRESHOLD) {
                // --- ПЪТ Б: STREAMING (За големи файлове) ---
                console.log(`🌊 Стрийминг режим за голям файл (${(fileSize/1024/1024).toFixed(2)} MB)`);
                const response = await axios.get(url, { responseType: 'stream' });
                await pipeline(response.data, cipher, fs.createWriteStream(filePath));
            } else {
                // --- ПЪТ А: СТАБИЛНИЯТ ТИ КОД (За нормални файлове) ---
                console.log(`⚡ Стандартен режим за файл (${(fileSize/1024/1024).toFixed(2)} MB)`);
                const fileRes = await axios.get(url, { responseType: 'arraybuffer' });
                const encrypted = Buffer.concat([cipher.update(Buffer.from(fileRes.data)), cipher.final()]);
                fs.writeFileSync(filePath, encrypted);
            }

            // Запис на ключа
            fs.writeFileSync(path.join(KEYS_DIR, `${newFileId}.key`), JSON.stringify({
                sessionKey: sessionKey.toString('hex'),
                iv: iv.toString('hex'),
                processedBy: fileSize > LARGE_FILE_THRESHOLD ? 'stream' : 'buffer'
            }));

            return res.json({ success: true, fileId: newFileId });
        }

    } catch (err) {
        console.error("❌ ГРЕШКА:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛡️ Unified Vault Server running on port ${PORT}`));