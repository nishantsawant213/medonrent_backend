// React Frontend Example - File Retrieval
// Place this in your React components

import React, { useState } from 'react';

const FileViewer = ({ filePath, fileName }) => {
  const [loading, setLoading] = useState(false);

  const downloadFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/uploads/${filePath}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = () => {
    return `http://localhost:8000/api/v1/uploads/${filePath}`;
  };

  const getFileType = () => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  };

  const renderPreview = () => {
    const fileType = getFileType();
    const url = getFileUrl();

    switch (fileType) {
      case 'image':
        return <img src={url} alt={fileName} style={{ maxWidth: '100%' }} />;
      case 'pdf':
        return <iframe src={url} width="100%" height="500px" title={fileName} />;
      default:
        return <a href={url} target="_blank" rel="noopener noreferrer">Open File</a>;
    }
  };

  return (
    <div className="file-viewer">
      <h5>{fileName}</h5>
      <button onClick={downloadFile} disabled={loading}>
        {loading ? 'Downloading...' : 'Download'}
      </button>
      <div className="file-preview">
        {renderPreview()}
      </div>
    </div>
  );
};

// Usage in your component:
const RentSessionDetails = ({ rentSession }) => {
  return (
    <div>
      {rentSession.report?.path && (
        <FileViewer
          filePath={rentSession.report.path}
          fileName="Report.pdf"
        />
      )}
      {rentSession.patientConsentFilePath && (
        <FileViewer
          filePath={rentSession.patientConsentFilePath}
          fileName="Patient_Consent.pdf"
        />
      )}
    </div>
  );
};

export default FileViewer;