import { HttpRequest } from '../../Classes/HttpRequest';
import { Response } from 'request';
import { executeRequest } from './executeRequestInternal';

export const executeGetSorted = async (request: HttpRequest): Promise<Response> => {
	return await executeRequest(request);
};
