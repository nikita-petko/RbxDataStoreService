import { HttpRequest } from '../../Classes/HttpRequest';
import { Response } from 'request';

export const executeRequest = async (request: HttpRequest): Promise<Response> => {
	return await request.execute(this);
};
