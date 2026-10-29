import type { AppSettings, QRContent, QRDesignSettings, QRProject } from '@/types';
import { designFromSettings } from '@/state/settings';

/** The code being edited on the Create page. Lives in App so it survives switching pages. */
export interface Draft {
  content: QRContent;
  design: QRDesignSettings;
  /** Set when the draft was opened from or saved to My Designs. */
  projectId: string | null;
  name: string;
}

export const emptyContent: QRContent = { type: 'url', url: '' };

export function newDraft(settings: AppSettings): Draft {
  return { content: emptyContent, design: designFromSettings(settings), projectId: null, name: '' };
}

export function draftFromProject(p: QRProject): Draft {
  return { content: p.content, design: p.design, projectId: p.id, name: p.name };
}
