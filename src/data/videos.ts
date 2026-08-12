// Placeholder video catalog for the Videos page and homepage preview.
// Swap `thumbnail` for real frames and `href` for real video URLs whenever
// footage is ready — the shape (title/description/duration/thumbnail/href)
// is all VideoCard and the Videos page expect.

export type Video = {
	title: string;
	description: string;
	thumbnail: string;
	duration: string;
	href: string;
};

export const VIDEOS: Video[] = [
	{
		title: "Buzzy Fly: Origins",
		description: "How a small bug ended up with a big buzz. The story behind the brand.",
		thumbnail: "/blog-placeholder-1.jpg",
		duration: "3:12",
		href: "#",
	},
	{
		title: "Behind the Buzz",
		description: "A look at what we're building next and why we're building it in public.",
		thumbnail: "/blog-placeholder-2.jpg",
		duration: "5:47",
		href: "#",
	},
	{
		title: "Community Highlights",
		description: "The people who follow along, in their own words.",
		thumbnail: "/blog-placeholder-3.jpg",
		duration: "4:05",
		href: "#",
	},
	{
		title: "Field Notes",
		description: "Quick updates from the Buzzy Fly team, recorded on the fly.",
		thumbnail: "/blog-placeholder-4.jpg",
		duration: "2:30",
		href: "#",
	},
	{
		title: "Ask Us Anything",
		description: "Your questions, answered — from product plans to brand trivia.",
		thumbnail: "/blog-placeholder-5.jpg",
		duration: "8:14",
		href: "#",
	},
	{
		title: "The Full Story",
		description: "Everything so far, in one sit-down conversation.",
		thumbnail: "/blog-placeholder-about.jpg",
		duration: "11:52",
		href: "#",
	},
];
