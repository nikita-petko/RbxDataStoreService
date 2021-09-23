import { AxiosResponse } from 'axios';
import { HttpRequest } from '../Classes/HttpRequest';

/**
 * @internal
 */
export class ExectionHelper {
	/**
	 * @internal
	 */
	private static async executeRequest(request: HttpRequest): Promise<AxiosResponse<any>> {
		return await request.execute(this);
	}

	public static async ExecuteGet(request: HttpRequest): Promise<AxiosResponse<any>> {
		return await ExectionHelper.executeRequest(request);
	}
	public static async ExecuteGetSorted(request: HttpRequest): Promise<AxiosResponse<any>> {
		return await ExectionHelper.executeRequest(request);
	}
	public static async ExecuteOrderedSet(request: HttpRequest): Promise<AxiosResponse<any>> {
		return await ExectionHelper.executeRequest(request);
	}
	public static async ExecuteSet(request: HttpRequest): Promise<AxiosResponse<any>> {
		return await ExectionHelper.executeRequest(request);
	}
}
