export class VkPost {
  _key: string;

  ownerId: number;
  id: number;
  fromId?: number;
  date: number;
  text?: string;
  attachments?: any[];
  isPinned?: boolean;
  markedAsAds?: boolean;
  raw?: any;

  constructor(init: {
    ownerId: number;
    id: number;
    fromId?: number;
    date: number;
    text?: string;
    attachments?: any[];
    isPinned?: boolean;
    markedAsAds?: boolean;
    raw?: any;
  }) {
    this.ownerId = init.ownerId;
    this.id = init.id;
    this.fromId = init.fromId;
    this.date = init.date;
    this.text = init.text;
    this.attachments = init.attachments;
    this.isPinned = init.isPinned;
    this.markedAsAds = init.markedAsAds;
    this.raw = init.raw;
    this._key = makePostKey(this.ownerId, this.id);
  }
}

export function makePostKey(ownerId: number, postId: number): string {
  return `${ownerId}_${postId}`;
}
