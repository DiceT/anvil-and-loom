import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';  // Correct package for githubLight

const App: React.FC = () => {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  const handleSelectVault = async () => {
    const path = await (window as any).electronAPI.selectVault();
    if (path) {
      setVaultPath(path);
    }
  };

  const refreshFiles = async () => {
    if (vaultPath) {
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

  const createNewNote = async () => {
    const fileName = prompt('Enter note name (e.g., new-note.md)');
    if (fileName && fileName.endsWith('.md')) {
      await (window as any).electronAPI.writeFile(fileName, '# New Note\nContent here...');
      refreshFiles();
      openFile(fileName);
    } else {
      alert('Please enter a valid .md file name.');
    }
  };

  // Usage of useEffect (fixes unused warning)
  useEffect(() => {
    refreshFiles();
  }, [vaultPath]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {!vaultPath ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={handleSelectVault}>Select Vault Directory</button>
        </div>
      ) : (
        <>
          <div style={{ width: '250px', borderRight: '1px solid #ddd', padding: '10px', overflowY: 'auto' }}>
            <h3>Files</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {files.map((file) => (
                <li
                  key={file}
                  onClick={() => openFile(file)}
                  style={{ cursor: 'pointer', padding: '5px', borderBottom: '1px solid #eee' }}
                >
                  {file}
                </li>
              ))}
            </ul>
            <button onClick={createNewNote}>New Note</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px' }}>
            {currentFile && (
              <>
                <h3>{currentFile}</h3>
                <CodeMirror
                  value={content}
                  height="calc(100vh - 100px)"
                  extensions={[markdown()]}
                  theme={githubLight}
                  onChange={(value) => setContent(value)}
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