import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const App = () => {
  const [vaultPath, setVaultPath] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');

  const handleSelectVault = async () => {
    const path = await window.api.selectVault();
    if (path) {
      setVaultPath(path);
      setFiles(await window.api.listFiles());
    }
  };

  const openFile = async (file) => {
    setCurrentFile(file);
    setContent(await window.api.readFile(file));
  };

  const saveFile = () => {
    if (currentFile) window.api.writeFile(currentFile, content);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {!vaultPath ? (
        <button onClick={handleSelectVault}>Select Vault</button>
      ) : (
        <>
          <div style={{ width: '200px' }}>
            <ul>
              {files.map(f => <li key={f} onClick={() => openFile(f)}>{f}</li>)}
            </ul>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{ flex: 1 }} />
            <ReactMarkdown style={{ flex: 1 }}>{content}</ReactMarkdown>
          </div>
          <button onClick={saveFile}>Save</button>
        </>
      )}
    </div>
  );
};

export default App;