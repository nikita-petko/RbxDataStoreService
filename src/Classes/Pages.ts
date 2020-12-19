export class Pages {
	protected finished: boolean;
	protected currentPage;

	public constructor() {
		this.finished = false;
	}

	public FetchNextChunk() {}

	public GetCurrentPage() {
		return this.currentPage;
	}

	public IsFinished(): boolean {
		return this.finished;
	}

	public async AdvanceToNextPageAsync(): Promise<void> {
		return new Promise<void>(async (resolve: (value: PromiseLike<void> | void) => void) => {
			if (this.finished) {
				console.error('No pages to advance to');
				return resolve();
			}
			await this.FetchNextChunk();
			resolve();
		});
	}
}
