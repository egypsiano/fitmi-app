const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

dotenv.config();

const app = express();
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// ==================== OCR FUNCTIONS ====================

// Enhanced image preprocessing
async function preprocessImage(imagePath) {
    try {
        const outputPath = imagePath.replace(/\.[^.]+$/, '-processed.jpg');
        await sharp(imagePath)
            .normalize()
            .sharpen({ sigma: 2 })
            .toFormat('jpeg', { quality: 95 })
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error('Image preprocessing error:', error);
        return imagePath;
    }
}

// OCR extraction
async function extractTextFromImage(imagePath) {
    try {
        const processedPath = await preprocessImage(imagePath);
        const { data: { text } } = await Tesseract.recognize(processedPath, 'eng');
        return text;
    } catch (error) {
        console.error('OCR error:', error);
        throw new Error('Failed to extract text from image');
    }
}

// Parse InBody data from OCR text
function parseInBodyData(text) {
    const data = {};
    const textLower = text.toLowerCase();
    
    // Weight
    const weightMatch = text.match(/weight[:\s]+(\d+\.?\d*)\s*kg/i);
    data.weight_kg = weightMatch ? parseFloat(weightMatch[1]) : null;
    
    // Body Fat %
    const bodyFatMatch = text.match(/body\s*fat[:\s]+(\d+\.?\d*)\s*%/i);
    data.body_fat_percent = bodyFatMatch ? parseFloat(bodyFatMatch[1]) : null;
    
    // BMI
    const bmiMatch = text.match(/bmi[:\s]+(\d+\.?\d*)/i);
    data.bmi = bmiMatch ? parseFloat(bmiMatch[1]) : null;
    
    // Skeletal Muscle %
    const muscleMatch = text.match(/skeletal\s*muscle[:\s]+(\d+\.?\d*)\s*%/i);
    data.skeletal_muscle_percent = muscleMatch ? parseFloat(muscleMatch[1]) : null;
    
    // Muscle Mass (kg)
    const muscleMassMatch = text.match(/muscle\s*mass[:\s]+(\d+\.?\d*)\s*kg/i);
    data.muscle_mass_kg = muscleMassMatch ? parseFloat(muscleMassMatch[1]) : null;
    
    // Protein %
    const proteinMatch = text.match(/protein[:\s]+(\d+\.?\d*)\s*%/i);
    data.protein_percent = proteinMatch ? parseFloat(proteinMatch[1]) : null;
    
    // BMR (kcal)
    const bmrMatch = text.match(/bmr[:\s]+(\d+)\s*kcal/i);
    data.bmr_kcal = bmrMatch ? parseInt(bmrMatch[1]) : null;
    
    // Fat-free body weight
    const ffbwMatch = text.match(/fat[\s-]*free\s*body\s*weight[:\s]+(\d+\.?\d*)\s*kg/i);
    data.fat_free_body_weight_kg = ffbwMatch ? parseFloat(ffbwMatch[1]) : null;
    
    // Subcutaneous Fat %
    const subFatMatch = text.match(/subcutaneous\s*fat[:\s]+(\d+\.?\d*)\s*%/i);
    data.subcutaneous_fat_percent = subFatMatch ? parseFloat(subFatMatch[1]) : null;
    
    // Visceral Fat
    const viscFatMatch = text.match(/visceral\s*fat[:\s]+(\d+)/i);
    data.visceral_fat = viscFatMatch ? parseInt(viscFatMatch[1]) : null;
    
    // Body Water %
    const waterMatch = text.match(/body\s*water[:\s]+(\d+\.?\d*)\s*%/i);
    data.body_water_percent = waterMatch ? parseFloat(waterMatch[1]) : null;
    
    // Bone Mass (kg)
    const boneMatch = text.match(/bone\s*mass[:\s]+(\d+\.?\d*)\s*kg/i);
    data.bone_mass_kg = boneMatch ? parseFloat(boneMatch[1]) : null;
    
    // Metabolic Age
    const ageMatch = text.match(/metabolic\s*age[:\s]+(\d+)/i);
    data.metabolic_age = ageMatch ? parseInt(ageMatch[1]) : null;
    
    return data;
}

// Parse Glucose data from OCR text
function parseGlucoseData(text) {
    const data = {};
    
    // Fasting glucose
    const fastingMatch = text.match(/fasting[:\s]+(\d+)\s*mg\/dl/i);
    data.fasting_mg_dl = fastingMatch ? parseInt(fastingMatch[1]) : null;
    
    // Random glucose
    const randomMatch = text.match(/random[:\s]+(\d+)\s*mg\/dl/i);
    data.random_mg_dl = randomMatch ? parseInt(randomMatch[1]) : null;
    
    // Before meal
    const beforeMatch = text.match(/before\s*meal[:\s]+(\d+)\s*mg\/dl/i);
    data.before_meal_mg_dl = beforeMatch ? parseInt(beforeMatch[1]) : null;
    
    // After meal
    const afterMatch = text.match(/after\s*meal[:\s]+(\d+)\s*mg\/dl/i);
    data.after_meal_mg_dl = afterMatch ? parseInt(afterMatch[1]) : null;
    
    // A1C
    const a1cMatch = text.match(/a1c[:\s]+(\d+\.?\d*)\s*%/i);
    data.a1c_percent = a1cMatch ? parseFloat(a1cMatch[1]) : null;
    
    return data;
}

// Auto-detect measurement type
function detectMeasurementType(text) {
    const textLower = text.toLowerCase();
    
    const inbodyKeywords = ['weight', 'body fat', 'bmi', 'muscle mass', 'visceral fat', 'metabolic age'];
    const glucoseKeywords = ['glucose', 'fasting', 'a1c', 'mg/dl'];
    
    const inbodyCount = inbodyKeywords.filter(k => textLower.includes(k)).length;
    const glucoseCount = glucoseKeywords.filter(k => textLower.includes(k)).length;
    
    return inbodyCount > glucoseCount ? 'inbody' : 'glucose';
}

// ==================== OCR ENDPOINTS ====================

// Auto-detect and extract
app.post('/api/ocr/auto', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const text = await extractTextFromImage(req.file.path);
        const type = detectMeasurementType(text);
        
        let extractedData;
        if (type === 'inbody') {
            extractedData = parseInBodyData(text);
        } else {
            extractedData = parseGlucoseData(text);
        }

        res.json({
            success: true,
            type,
            ocrText: text,
            extractedData,
            imagePath: req.file.filename,
            confidence: 'medium'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Extract InBody specifically
app.post('/api/ocr/inbody', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const text = await extractTextFromImage(req.file.path);
        const extractedData = parseInBodyData(text);

        res.json({
            success: true,
            type: 'inbody',
            ocrText: text,
            extractedData,
            imagePath: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Extract Glucose specifically
app.post('/api/ocr/glucose', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const text = await extractTextFromImage(req.file.path);
        const extractedData = parseGlucoseData(text);

        res.json({
            success: true,
            type: 'glucose',
            ocrText: text,
            extractedData,
            imagePath: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== INBODY ENDPOINTS ====================

// Save InBody record
app.post('/api/inbody/save', async (req, res) => {
    try {
        const {
            user_id = 1,
            record_date,
            weight_kg,
            body_fat_percent,
            bmi,
            skeletal_muscle_percent,
            muscle_mass_kg,
            protein_percent,
            bmr_kcal,
            fat_free_body_weight_kg,
            subcutaneous_fat_percent,
            visceral_fat,
            body_water_percent,
            bone_mass_kg,
            body_type,
            metabolic_age,
            image_path
        } = req.body;

        const result = await pool.query(
            `INSERT INTO inbody_records (
                user_id, record_date, weight_kg, body_fat_percent, bmi, 
                skeletal_muscle_percent, muscle_mass_kg, protein_percent, 
                bmr_kcal, fat_free_body_weight_kg, subcutaneous_fat_percent, 
                visceral_fat, body_water_percent, bone_mass_kg, body_type, 
                metabolic_age, image_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
                user_id, record_date, weight_kg, body_fat_percent, bmi,
                skeletal_muscle_percent, muscle_mass_kg, protein_percent,
                bmr_kcal, fat_free_body_weight_kg, subcutaneous_fat_percent,
                visceral_fat, body_water_percent, bone_mass_kg, body_type,
                metabolic_age, image_path
            ]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get InBody records
app.get('/api/inbody/:startDate/:endDate', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM inbody_records 
             WHERE record_date BETWEEN $1 AND $2 
             ORDER BY record_date DESC`,
            [req.params.startDate, req.params.endDate]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== GLUCOSE ENDPOINTS ====================

// Save Glucose record
app.post('/api/glucose/save', async (req, res) => {
    try {
        const {
            user_id = 1,
            record_date,
            reading_time,
            fasting_mg_dl,
            random_mg_dl,
            before_meal_mg_dl,
            after_meal_mg_dl,
            a1c_percent,
            reading_type,
            image_path
        } = req.body;

        const result = await pool.query(
            `INSERT INTO glucose_records (
                user_id, record_date, reading_time, fasting_mg_dl, 
                random_mg_dl, before_meal_mg_dl, after_meal_mg_dl, 
                a1c_percent, reading_type, image_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                user_id, record_date, reading_time, fasting_mg_dl,
                random_mg_dl, before_meal_mg_dl, after_meal_mg_dl,
                a1c_percent, reading_type, image_path
            ]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Glucose records
app.get('/api/glucose/:startDate/:endDate', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM glucose_records 
             WHERE record_date BETWEEN $1 AND $2 
             ORDER BY record_date DESC`,
            [req.params.startDate, req.params.endDate]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== COMPARISON ENDPOINTS ====================

// Compare InBody changes
app.get('/api/inbody/compare/:startDate/:endDate', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                id, record_date, weight_kg, body_fat_percent, bmi,
                muscle_mass_kg, visceral_fat,
                LAG(weight_kg) OVER (ORDER BY record_date) as prev_weight,
                LAG(body_fat_percent) OVER (ORDER BY record_date) as prev_body_fat,
                LAG(bmi) OVER (ORDER BY record_date) as prev_bmi,
                LAG(muscle_mass_kg) OVER (ORDER BY record_date) as prev_muscle_mass,
                LAG(visceral_fat) OVER (ORDER BY record_date) as prev_visceral_fat
            FROM inbody_records
            WHERE record_date BETWEEN $1 AND $2
            ORDER BY record_date`,
            [req.params.startDate, req.params.endDate]
        );

        const comparison = result.rows.map(row => ({
            ...row,
            weight_change: row.prev_weight ? row.weight_kg - row.prev_weight : null,
            body_fat_change: row.prev_body_fat ? row.body_fat_percent - row.prev_body_fat : null,
            bmi_change: row.prev_bmi ? row.bmi - row.prev_bmi : null,
            muscle_mass_change: row.prev_muscle_mass ? row.muscle_mass_kg - row.prev_muscle_mass : null,
            visceral_fat_change: row.prev_visceral_fat ? row.visceral_fat - row.prev_visceral_fat : null
        }));

        res.json(comparison);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FitMi Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
