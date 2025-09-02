export class WallPostsImportedEvent {
	constructor(
		public readonly ownerId: number,
		public readonly postKeys: string[],
		public readonly count: number,
	) {}
} 