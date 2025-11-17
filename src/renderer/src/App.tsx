import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

const App: React.FC = () => {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  const handleSelectVault = async () => {
    const path = await (window as any).electronAPI.selectVault();
    if (path) {
      setVaultPath(path);
      const fileList = await (window as any).electronAPI.listFiles();
      setFiles(fileList);
    }
  };

  const openFile = async (file: string) => {
    setCurrentFile(file);
    const data = await (window as any).electronAPI.readFile(file);
    setContent(data || '');
  };

  const saveFile = async () => {
    if (currentFile) {
      await (window as any).electronAPI.writeFile(currentFile, content);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {!vaultPath ? (
        <button onClick={handleSelectVault}>Select Vault Directory</button>
      ) : (
        <>
          <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
            <h3>Files</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {files.map((f) => (
                <li key={f} onClick={() => openFile(f)} style={{ cursor: 'pointer', marginBottom: '5px' }}>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => { /* Logic for new file */ }}>New Note</button>
          </div>
          <div style={{ flex: 1, padding: '10px' }}>
            {currentFile && (
              <>
                <CodeMirror
                  value={content}
                  extensions={[markdown()]}
                  onChange={(value) => setContent(value)}
                  height="100%"
                />
                <button onClick={saveFile} style={{ marginTop: '10px' }}>Save</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;