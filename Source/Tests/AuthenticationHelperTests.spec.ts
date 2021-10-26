import { AuthenticationHelper } from '../Helpers/AuthenticationHelper';

describe('AuthenticationHelperSuite', () => {
	it('Should throw an error if no parameters are given', () => {
		expect(async () => {
			await AuthenticationHelper.InitAuthenticatedUser(null, null);
		}).rejects.not.toBe(null);
		expect(async () => {
			await AuthenticationHelper.InitAuthenticatedUser('TOKEN', null);
		}).rejects.not.toBe(null);
        expect(async () => {
			await AuthenticationHelper.InitAuthenticatedUser(null, 123123);
		}).rejects.not.toBe(null);
	});
});
