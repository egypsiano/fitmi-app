import React, { useState } from 'react';
import './App.css';
import OCRUploader from './components/OCRUploader';
import RecordDisplay from './components/RecordDisplay';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [records, setRecords] = useState([]);
  const [lastRecord, setLastRecord] = useState(null);

  const handleRecordSaved = (newRecord) => {
    setRecords([newRecord, ...records]);
    setLastRecord(newRecord);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>💪 FitMi Health Tracker</h1>
        <p>Automatic health data collection from screenshots</p>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          📸 Upload & Extract
        </button>
        <button 
          className={activeTab === 'records' ? 'active' : ''}
          onClick={() => setActiveTab('records')}
        >
          📊 My Records
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'upload' && (
          <OCRUploader onRecordSaved={handleRecordSaved} />
        )}
        {activeTab === 'records' && (
          <RecordDisplay records={records} lastRecord={lastRecord} />
        )}
      </main>
    </div>
  );
}

export default App;
