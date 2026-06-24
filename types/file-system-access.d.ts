/**
 * Ambient declarations for File System Access API permission methods, which are
 * not yet part of the standard TS DOM lib.
 */
export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: "read" | "readwrite";
  }

  interface FileSystemHandle {
    queryPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<
      FileSystemDirectoryHandle | FileSystemFileHandle
    >;
    keys(): AsyncIterableIterator<string>;
    entries(): AsyncIterableIterator<
      [string, FileSystemDirectoryHandle | FileSystemFileHandle]
    >;
  }

  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string | FileSystemHandle;
    }): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker(options?: {
      multiple?: boolean;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }): Promise<FileSystemFileHandle[]>;
  }
}
