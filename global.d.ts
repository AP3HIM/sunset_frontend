export {};

declare global {
  interface Window {
    electronAPI: {
      testPing: () => Promise<string>;
      storeFilePath: (name: string, fullPath: string) => Promise<boolean>;
      getFilePath: (filename: string) => Promise<string | null>;
      runPythonUploader: (args: string[]) => Promise<string>;
      stopPythonUploader: () => Promise<string>;
      onPythonLog: (callback: (log: string) => void) => void;
      openFileDialog: () => Promise<{ name: string; path: string } | null>;
    };
    electronEnv?: {
      isElectron: boolean;
    };
  }
}
