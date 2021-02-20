import { HttpRequest } from '../../Classes/HttpRequest';
import { AxiosResponse } from 'axios';

export const executeRequest = async (request: HttpRequest): Promise<AxiosResponse<any>> => {
	return await request.execute(this);
};
