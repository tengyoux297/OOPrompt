import type { FileReference } from "../types";

class FileStorageService {
  private storageKey = "ooprompt_file_storage";

  // Upload a file and return a FileReference
  async uploadFile(file: File): Promise<FileReference> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const fileReference: FileReference = {
            id: fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || this.getFileTypeFromName(file.name),
            uploadTime: Date.now(),
            storedPath: `local://${fileId}`
          };

          // Store file data in localStorage (for demo purposes)
          // In a real app, this would upload to a server
          const fileData = {
            id: fileId,
            data: reader.result,
            metadata: fileReference
          };

          this.storeFile(fileData);
          resolve(fileReference);
        } catch (error) {
          reject(new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      // Read file as data URL for storage
      reader.readAsDataURL(file);
    });
  }

  // Download a file (create a download link)
  async downloadFile(fileReference: FileReference): Promise<void> {
    try {
      const fileData = this.getFile(fileReference.id);
      if (!fileData) {
        throw new Error('File not found');
      }

      // Create a download link
      const link = document.createElement('a');
      link.href = fileData.data as string;
      link.download = fileReference.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove a file
  async removeFile(fileId: string): Promise<void> {
    try {
      this.removeStoredFile(fileId);
    } catch (error) {
      throw new Error(`Failed to remove file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get file type from filename extension
  private getFileTypeFromName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    return typeMap[extension || ''] || 'application/octet-stream';
  }

  // Store file in chrome.storage or localStorage
  private storeFile(fileData: { id: string; data: string | ArrayBuffer | null; metadata: FileReference }): void {
    try {
      const existingFiles = this.getStoredFiles();
      existingFiles[fileData.id] = fileData;
      
      // Use chrome.storage if available (extension), otherwise fallback to localStorage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.storageKey]: existingFiles }, () => {
          if (chrome.runtime.lastError) {
            throw new Error(`Storage failed: ${chrome.runtime.lastError.message}`);
          }
        });
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));
      }
    } catch (error) {
      console.error('Failed to store file:', error);
      throw new Error('Storage failed - storage may be full or unavailable');
    }
  }

  // Get file from chrome.storage or localStorage
  private getFile(fileId: string): { id: string; data: string | ArrayBuffer | null; metadata: FileReference } | null {
    try {
      const storedFiles = this.getStoredFiles();
      return storedFiles[fileId] || null;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  // Public method to get file data for external use (async for chrome.storage)
  async getFileData(fileId: string): Promise<{ id: string; data: string | ArrayBuffer | null; metadata: FileReference } | null> {
    try {
      const storedFiles = await this.getStoredFilesAsync();
      return storedFiles[fileId] || null;
    } catch (error) {
      console.error('Failed to get file data:', error);
      return null;
    }
  }

  // Get all stored files from chrome.storage or localStorage
  private getStoredFiles(): Record<string, { id: string; data: string | ArrayBuffer | null; metadata: FileReference }> {
    try {
      // Use chrome.storage if available (extension), otherwise fallback to localStorage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // For chrome.storage, we need to use async, but this method is called synchronously
        // So we'll use a synchronous approach with a fallback
        // Note: This is a limitation - ideally we'd make this async, but that would require refactoring
        const stored = localStorage.getItem(this.storageKey); // Fallback for now
        return stored ? JSON.parse(stored) : {};
      } else {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {};
      }
    } catch (error) {
      console.error('Failed to get stored files:', error);
      return {};
    }
  }
  
  // Async method to get stored files (for chrome.storage)
  private async getStoredFilesAsync(): Promise<Record<string, { id: string; data: string | ArrayBuffer | null; metadata: FileReference }>> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([this.storageKey], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to get stored files:', chrome.runtime.lastError);
            resolve({});
            return;
          }
          resolve(result[this.storageKey] || {});
        });
      } else {
        try {
          const stored = localStorage.getItem(this.storageKey);
          resolve(stored ? JSON.parse(stored) : {});
        } catch (error) {
          console.error('Failed to get stored files:', error);
          resolve({});
        }
      }
    });
  }

  // Remove stored file
  private removeStoredFile(fileId: string): void {
    try {
      const existingFiles = this.getStoredFiles();
      delete existingFiles[fileId];
      
      // Use chrome.storage if available (extension), otherwise fallback to localStorage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.storageKey]: existingFiles }, () => {
          if (chrome.runtime.lastError) {
            throw new Error(`Failed to remove file: ${chrome.runtime.lastError.message}`);
          }
        });
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));
      }
    } catch (error) {
      console.error('Failed to remove stored file:', error);
      throw new Error('Failed to remove file from storage');
    }
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{ totalFiles: number; totalSize: number; maxSize: number }> {
    try {
      const files = await this.getStoredFilesAsync();
      const totalFiles = Object.keys(files).length;
      const totalSize = Object.values(files).reduce((sum, file) => {
        if (typeof file.data === 'string') {
          return sum + file.data.length;
        }
        return sum + (file.data ? file.data.byteLength : 0);
      }, 0);
      
      // Estimate storage limit (chrome.storage.local has 10MB limit, localStorage usually 5-10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB estimate
      
      return { totalFiles, totalSize, maxSize };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { totalFiles: 0, totalSize: 0, maxSize: 0 };
    }
  }

  // Clear all stored files
  clearAllFiles(): void {
    try {
      // Use chrome.storage if available (extension), otherwise fallback to localStorage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([this.storageKey], () => {
          if (chrome.runtime.lastError) {
            throw new Error(`Failed to clear files: ${chrome.runtime.lastError.message}`);
          }
        });
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Failed to clear all files:', error);
      throw new Error('Failed to clear file storage');
    }
  }
}

export const fileStorageService = new FileStorageService();
