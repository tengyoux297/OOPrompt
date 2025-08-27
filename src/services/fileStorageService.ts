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

  // Store file in localStorage
  private storeFile(fileData: { id: string; data: string | ArrayBuffer | null; metadata: FileReference }): void {
    try {
      const existingFiles = this.getStoredFiles();
      existingFiles[fileData.id] = fileData;
      localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));
    } catch (error) {
      console.error('Failed to store file:', error);
      throw new Error('Storage failed - localStorage may be full or unavailable');
    }
  }

  // Get file from localStorage
  private getFile(fileId: string): { id: string; data: string | ArrayBuffer | null; metadata: FileReference } | null {
    try {
      const storedFiles = this.getStoredFiles();
      return storedFiles[fileId] || null;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  // Public method to get file data for external use
  async getFileData(fileId: string): Promise<{ id: string; data: string | ArrayBuffer | null; metadata: FileReference } | null> {
    return this.getFile(fileId);
  }

  // Get all stored files
  private getStoredFiles(): Record<string, { id: string; data: string | ArrayBuffer | null; metadata: FileReference }> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get stored files:', error);
      return {};
    }
  }

  // Remove stored file
  private removeStoredFile(fileId: string): void {
    try {
      const existingFiles = this.getStoredFiles();
      delete existingFiles[fileId];
      localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));
    } catch (error) {
      console.error('Failed to remove stored file:', error);
      throw new Error('Failed to remove file from storage');
    }
  }

  // Get storage usage info
  getStorageInfo(): { totalFiles: number; totalSize: number; maxSize: number } {
    try {
      const files = this.getStoredFiles();
      const totalFiles = Object.keys(files).length;
      const totalSize = Object.values(files).reduce((sum, file) => {
        if (typeof file.data === 'string') {
          return sum + file.data.length;
        }
        return sum + (file.data ? file.data.byteLength : 0);
      }, 0);
      
      // Estimate localStorage limit (usually 5-10MB)
      const maxSize = 5 * 1024 * 1024; // 5MB estimate
      
      return { totalFiles, totalSize, maxSize };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { totalFiles: 0, totalSize: 0, maxSize: 0 };
    }
  }

  // Clear all stored files
  clearAllFiles(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear all files:', error);
      throw new Error('Failed to clear file storage');
    }
  }
}

export const fileStorageService = new FileStorageService();
