import { HttpRequest } from '../../Classes/HttpRequest';
import { Response } from 'request';
import { executeRequest } from './executeRequestInternal';

export const executeSet = async (request: HttpRequest): Promise<Response> => {
	return await executeRequest(request);
};
