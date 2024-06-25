export const getReaders = async (handler: (readers: any[]) => void) => {
    const dropZoneEl = document.getElementById('drop-zone');
    const inputEl = document.getElementById('inputfile') as HTMLInputElement;
  
    if (inputEl && dropZoneEl) {
      const handleFiles = async (files: FileList) => {
        const readers = [];
        for (const file of Array.from(files)) {
          const reader = file.stream().getReader();
          readers.push({ reader, name: file.name });
        }
        await handler(readers);
      };
  
      inputEl.addEventListener('change', (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files) handleFiles(files);
      }, false);
  
      dropZoneEl.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        if (ev.dataTransfer?.files) {
          await handleFiles(ev.dataTransfer.files);
        }
      }, false);
  
      ['dragover', 'dragenter'].forEach(eventName => {
        dropZoneEl.addEventListener(eventName, (ev) => {
          ev.preventDefault();
        }, false);
      });
    }
  };