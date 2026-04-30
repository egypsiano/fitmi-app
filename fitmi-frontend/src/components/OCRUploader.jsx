import React, { useState } from 'react';
import axios from 'axios';
import './OCRUploader.css';

function OCRUploader({ onRecordSaved }) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [measurementType, setMeasurementType] = useState('auto');
  const [formData, setFormData] = useState({});
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleExtract = async () => {
    if (!image) {
      alert('Please select an image');
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append('image', image);

    try {
      const endpoint = measurementType === 'auto' 
        ? '/api/ocr/auto' 
        : `/api/ocr/${measurementType}`;
      
      const response = await axios.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setExtractedData(response.data.extractedData);
      setFormData(response.data.extractedData);
      setMeasurementType(response.data.type);
    } catch (error) {
      alert('Error extracting data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      const endpoint = measurementType === 'inbody' 
        ? '/api/inbody/save' 
        : '/api/glucose/save';

      const payload = {
        ...formData,
        record_date: recordDate,
        image_path: image.name
      };

      const response = await axios.post(endpoint, payload);
      alert('Record saved successfully!');
      onRecordSaved(response.data.data);
      setImage(null);
      setExtractedData(null);
      setFormData({});
    } catch (error) {
      alert('Error saving record: ' + error.message);
    }
  };

  return (
    <div className="ocr-uploader">
      <div className="upload-section">
        <h2>📸 Upload Measurement Screenshot</h2>
        
        <div className="type-selector">
          <label>Measurement Type:</label>
          <select value={measurementType} onChange={(e) => setMeasurementType(e.target.value)}>
            <option value="auto">🤖 Auto-Detect</option>
            <option value="inbody">⚖️ InBody Scale</option>
            <option value="glucose">💉 Glucose Meter</option>
          </select>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange}
          className="file-input"
        />

        {image && <p>Selected: {image.name}</p>}

        <button 
          onClick={handleExtract} 
          disabled={loading}
          className="btn-extract"
        >
          {loading ? 'Processing...' : '🤖 Auto-Detect & Extract'}
        </button>
      </div>

      {extractedData && (
        <div className="form-section">
          <h2>Review Extracted Data</h2>

          <div className="date-input">
            <label>Record Date:</label>
            <input 
              type="date" 
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>

          <div className="form-grid">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="form-group">
                <label>{key.replace(/_/g, ' ')}:</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={value || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder="N/A"
                />
              </div>
            ))}
          </div>

          <button onClick={handleSave} className="btn-save">
            💾 Save to Database
          </button>
        </div>
      )}
    </div>
  );
}

export default OCRUploader;
