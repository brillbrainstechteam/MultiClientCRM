import type { MediaMatchCandidate } from '../domain/types';

/**
 * Bulk media match preview (Requirement §I3) for a batch uploaded against
 * `cat_aurum_lightweight` — matched/unmatched/multiple-match/conflicting
 * states side by side, matched by design-code filename prefix.
 */
export const mediaMatchBatch: MediaMatchCandidate[] = [
  { id: 'match_1', fileName: 'RG777_1.jpg', kind: 'image', status: 'matched', matchedItemIds: ['it_rg_777'] },
  { id: 'match_2', fileName: 'RG777_2.jpg', kind: 'image', status: 'matched', matchedItemIds: ['it_rg_777'] },
  { id: 'match_3', fileName: 'PD220_1.jpg', kind: 'image', status: 'matched', matchedItemIds: ['it_pd_220'] },
  { id: 'match_4', fileName: 'ER410_video.mp4', kind: 'video', status: 'matched', matchedItemIds: ['it_er_410'] },
  { id: 'match_5', fileName: 'NK_1.jpg', kind: 'image', status: 'multiple-matches', matchedItemIds: ['it_nk_201', 'it_nk_305'] },
  { id: 'match_6', fileName: 'BR990_1.jpg', kind: 'image', status: 'unmatched', matchedItemIds: [] },
  { id: 'match_7', fileName: 'IMG_20260801_0912.jpg', kind: 'image', status: 'unmatched', matchedItemIds: [] },
  { id: 'match_8', fileName: 'RG777_ER410_combo.jpg', kind: 'image', status: 'conflicting', matchedItemIds: ['it_rg_777', 'it_er_410'] },
];

export function mediaMatchSummary(batch: MediaMatchCandidate[] = mediaMatchBatch) {
  return {
    matched: batch.filter((candidate) => candidate.status === 'matched').length,
    multiple: batch.filter((candidate) => candidate.status === 'multiple-matches').length,
    unmatched: batch.filter((candidate) => candidate.status === 'unmatched').length,
    conflicting: batch.filter((candidate) => candidate.status === 'conflicting').length,
  };
}
