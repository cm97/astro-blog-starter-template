/**
 * One canonical form per page: a trailing slash, the same form the sitemap
 * and the prebuilt blog pages use. Without it, /store and /store/ each
 * declared themselves canonical, so search engines saw two copies of every
 * page that renders on request. Paths that end in a file name (rss.xml,
 * search.json) are left alone.
 */
export function canonicalPath(pathname: string): string {
	if (!pathname || pathname === "/") return "/";
	if (pathname.endsWith("/")) return pathname;
	const last = pathname.slice(pathname.lastIndexOf("/") + 1);
	return /\.[a-z0-9]+$/i.test(last) ? pathname : `${pathname}/`;
}
