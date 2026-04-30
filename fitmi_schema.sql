-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- InBody Records table
CREATE TABLE inbody_records (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    body_fat_percent DECIMAL(5,2),
    bmi DECIMAL(5,2),
    skeletal_muscle_percent DECIMAL(5,2),
    muscle_mass_kg DECIMAL(5,2),
    protein_percent DECIMAL(5,2),
    bmr_kcal INT,
    fat_free_body_weight_kg DECIMAL(5,2),
    subcutaneous_fat_percent DECIMAL(5,2),
    visceral_fat INT,
    body_water_percent DECIMAL(5,2),
    bone_mass_kg DECIMAL(5,2),
    body_type VARCHAR(50),
    metabolic_age INT,
    image_path VARCHAR(255),
    ocr_confidence DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, record_date)
);

-- Glucose Records table
CREATE TABLE glucose_records (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    reading_time TIME,
    fasting_mg_dl INT,
    random_mg_dl INT,
    before_meal_mg_dl INT,
    after_meal_mg_dl INT,
    a1c_percent DECIMAL(4,2),
    reading_type VARCHAR(50),
    image_path VARCHAR(255),
    ocr_confidence DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_inbody_user_date ON inbody_records(user_id, record_date DESC);
CREATE INDEX idx_glucose_user_date ON glucose_records(user_id, record_date DESC);
CREATE INDEX idx_inbody_date ON inbody_records(record_date DESC);
CREATE INDEX idx_glucose_date ON glucose_records(record_date DESC);

-- Create comparison view for InBody
CREATE VIEW inbody_comparison AS
SELECT 
    current.id,
    current.record_date,
    current.weight_kg,
    LAG(current.weight_kg) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as prev_weight_kg,
    current.weight_kg - LAG(current.weight_kg) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as weight_change,
    current.body_fat_percent,
    LAG(current.body_fat_percent) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as prev_body_fat_percent,
    current.body_fat_percent - LAG(current.body_fat_percent) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as body_fat_change,
    current.bmi,
    LAG(current.bmi) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as prev_bmi,
    current.bmi - LAG(current.bmi) OVER (PARTITION BY current.user_id ORDER BY current.record_date) as bmi_change
FROM inbody_records current;
