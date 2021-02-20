import { HttpRequest } from '../../Classes/HttpRequest';
import { AxiosResponse } from 'axios';
import { executeRequest } from './executeRequestInternal';

export const executeOrderedSet = async (request: HttpRequest): Promise<AxiosResponse<any>> => {
	return await executeRequest(request);
};
