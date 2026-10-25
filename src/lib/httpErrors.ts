/** Human-readable explanation for every HTTP status the error page can show. */
export const httpErrors: Record<number, string> = {
	// 4xx - Client errors
	400: 'The request is invalid or badly formed.',
	401: 'You need to log in to see this page.',
	402: 'Payment required.',
	403: 'Access denied. You don’t have permission to see this.',
	404: 'We couldn’t find the page you’re looking for.',
	405: 'This HTTP method isn’t allowed here.',
	406: 'The requested content isn’t acceptable.',
	407: 'Proxy authentication required.',
	408: 'The server timed out waiting for the request.',
	409: 'This conflicts with the current state of the resource.',
	410: 'This page has been permanently removed.',
	411: 'The content length must be specified.',
	412: 'A precondition of the request wasn’t met.',
	413: 'The request is too large to process.',
	414: 'The URL is too long.',
	415: 'This media type isn’t supported.',
	416: 'The requested range isn’t available.',
	417: 'The expectation in the request header couldn’t be met.',
	418: 'I’m a teapot. ☕',
	421: 'The request was sent to a server that can’t answer it.',
	422: 'The request is valid but can’t be processed.',
	423: 'This resource is locked.',
	424: 'The request failed because it depends on another request that failed.',
	425: 'The server won’t process a request that might be replayed.',
	426: 'A protocol upgrade is required.',
	428: 'This request needs a precondition.',
	429: 'Too many requests. Please try again in a moment.',
	431: 'The request headers are too large.',
	451: 'Unavailable for legal reasons.',

	// 5xx - Server errors
	500: 'Something broke on our side. We’ve been notified.',
	501: 'This feature isn’t available on the server.',
	502: 'We got an invalid response from an upstream server.',
	503: 'Undercut is temporarily unavailable. Please try again soon.',
	504: 'An upstream server didn’t answer in time.',
	505: 'This HTTP version isn’t supported.',
	506: 'Content negotiation error.',
	507: 'Not enough storage on the server.',
	508: 'An infinite loop was detected while processing.',
	510: 'Further extensions are required.',
	511: 'Network authentication required.'
};

export const errorMessage = (status: number) =>
	httpErrors[status] ?? (status >= 500 ? httpErrors[500] : httpErrors[400]);
