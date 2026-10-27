export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (message: string) => new HttpError(400, 'bad_request', message)
export const unauthorized = (message = 'Sign in to continue.') =>
  new HttpError(401, 'unauthorized', message)
export const forbidden = (message = 'Your role does not allow this action.') =>
  new HttpError(403, 'forbidden', message)
export const notFound = (what = 'Record') => new HttpError(404, 'not_found', `${what} not found.`)
export const conflict = (message: string) => new HttpError(409, 'conflict', message)
