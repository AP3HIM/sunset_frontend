export {};

declare global {
  interface Window {
    electronAPI: {
      // Existing
      testPing: () => Promise<string>;
      storeFilePath: (name: string, fullPath: string) => Promise<boolean>;
      getFilePath: (filename: string) => Promise<string | null>;
      runPythonUploader: (args: string[]) => Promise<string>;
      stopPythonUploader: () => Promise<string>;
      onPythonLog: (callback: (log: string) => void) => void;
      openFileDialog: () => Promise<{ name: string; path: string } | null>;
      getSignalsDir: () => Promise<string>;
      // New platform window
      openPlatformWindow: (platform: string, url: string) => Promise<number>;
      injectJS: (windowId: number, script: string) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
      waitForPlatformLoad: (windowId: number) => Promise<void>;
      closePlatformWindow: (windowId: number) => Promise<void>;
      openPlatformWindow: (platform: string, url: string) => Promise<number>;
    };
    electronEnv?: {
      isElectron: boolean;
    };
  }
}