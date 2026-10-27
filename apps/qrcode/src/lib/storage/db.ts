import { openDB, type IDBPDatabase } from 'idb';
import type { QRProject, DesignPreset, ScanResult, AppSettings } from '@/types';

const DB_NAME = 'qr-studio';
const DB_VERSION = 1;

interface QRStudioDB {
  projects: {
    key: string;
    value: QRProject;
    indexes: { 'by-updated': number };
  };
  presets: {
    key: string;
    value: DesignPreset;
  };
  scanHistory: {
    key: string;
    value: ScanResult;
    indexes: { 'by-timestamp': number };
  };
  settings: {
    key: string;
    value: { key: string; data: AppSettings };
  };
}

let dbPromise: Promise<IDBPDatabase<QRStudioDB>> | null = null;

function getDB(): Promise<IDBPDatabase<QRStudioDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QRStudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
        // Presets store
        if (!db.objectStoreNames.contains('presets')) {
          db.createObjectStore('presets', { keyPath: 'id' });
        }
        // Scan history store
        if (!db.objectStoreNames.contains('scanHistory')) {
          const scanStore = db.createObjectStore('scanHistory', { keyPath: 'id' });
          scanStore.createIndex('by-timestamp', 'timestamp');
        }
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function saveProject(project: QRProject): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function getProject(id: string): Promise<QRProject | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function getAllProjects(): Promise<QRProject[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('projects', 'by-updated');
  return all.reverse(); // newest first
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

// ── Presets ──────────────────────────────────────────────────────────────────

export async function savePreset(preset: DesignPreset): Promise<void> {
  const db = await getDB();
  await db.put('presets', preset);
}

export async function getAllPresets(): Promise<DesignPreset[]> {
  const db = await getDB();
  return db.getAll('presets');
}

export async function deletePreset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('presets', id);
}

// ── Scan History ─────────────────────────────────────────────────────────────

export async function saveScanResult(result: ScanResult): Promise<void> {
  const db = await getDB();
  await db.put('scanHistory', result);
}

export async function getScanHistory(): Promise<ScanResult[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('scanHistory', 'by-timestamp');
  return all.reverse();
}

export async function clearScanHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('scanHistory');
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'app-settings', data: settings });
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  const result = await db.get('settings', 'app-settings');
  return result?.data;
}

// ── Bulk Operations ──────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('projects');
  await db.clear('presets');
  await db.clear('scanHistory');
  await db.clear('settings');
}
