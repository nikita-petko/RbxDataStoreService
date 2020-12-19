export class Pages {
	protected finished: boolean;
	protected currentPage;

	public constructor() {
		this.finished = false;
	}

	protected async FetchNextChunk() {}

	/**
	 * Returns the items on the current page.
	 * The keys in the item are determined by the source of this object.
	 */
	public GetCurrentPage() {
		return this.currentPage;
	}

	/**
	 * Whether or not the current page is the last page available.
	 * @readonly This property can only be read from. Attempting to write to it will cause an error.
	 */
	public get IsFinished(): boolean {
		return this.finished;
	}
}
