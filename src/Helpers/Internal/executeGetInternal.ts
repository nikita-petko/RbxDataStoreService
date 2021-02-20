import { HttpRequest } from '../../Classes/HttpRequest';
import { AxiosResponse } from 'axios';
import { executeRequest } from './executeRequestInternal';

export const executeGet = async (request: HttpRequest): Promise<AxiosResponse<any>> => {
	return await executeRequest(request);
};
