import React, { useEffect, useState } from 'react';
import AppBar from './AppBar';
import ProjectEditor from './routes/editor';

function App() {
  // console.log(window.ipcRenderer);

  const [isOpen, setOpen] = useState(false);
  const [isSent, setSent] = useState(false);
  const [fromMain, setFromMain] = useState<string | null>(null);

  const handleToggle = () => {
    if (isOpen) {
      setOpen(false);
      setSent(false);
    } else {
      setOpen(true);
      setFromMain(null);
    }
  };
  const sendMessageToElectron = () => {
    if (window.Main) {
      window.Main.sendMessage("Hello I'm from React World");
    } else {
      setFromMain('You are in a Browser, so no Electron functions are available');
    }
    setSent(true);
  };

  useEffect(() => {
    if (isSent && window.Main)
      window.Main.on('message', (message: string) => {
        setFromMain(message);
      });
  }, [fromMain, isSent]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black">
      {window.Main && (
        <div className="flex-none">
          <AppBar />
        </div>
      )}
      <div className='flex-grow overflow-hidden'>
        <ProjectEditor />
      </div>
    </div>
  );
}

export default App;
