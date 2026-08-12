// Video catalog for the Videos page and homepage preview.
//
// There's no real Buzzy Fly footage yet, so `videoUrl` points at real,
// freely-licensed sample clips (Google's public "cloud-samples-data" and
// ExoPlayer test-media buckets) so the player actually works today. Swap
// `videoUrl`/`thumbnail` for real footage whenever it's ready — the shape
// (title/description/thumbnail/videoUrl) is all VideoCard and the Videos
// page expect.

export type Video = {
	title: string;
	description: string;
	thumbnail: string;
	videoUrl: string;
};

export const VIDEOS: Video[] = [
	{
		title: "Buzzy Fly: Origins",
		description: "How a small bug ended up with a big buzz. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-1.jpg",
		videoUrl: "https://storage.googleapis.com/cloud-samples-data/video/animals.mp4",
	},
	{
		title: "Behind the Buzz",
		description: "A look at what we're building next and why. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-2.jpg",
		videoUrl: "https://storage.googleapis.com/cloud-samples-data/video/googlework_tiny.mp4",
	},
	{
		title: "Community Highlights",
		description: "The people who follow along, in their own words. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-3.jpg",
		videoUrl: "https://storage.googleapis.com/cloud-samples-data/video/cat.mp4",
	},
	{
		title: "Field Notes",
		description: "Quick updates from the team, recorded on the fly. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-4.jpg",
		videoUrl: "https://storage.googleapis.com/cloud-samples-data/video/chicago.mp4",
	},
	{
		title: "Ask Us Anything",
		description: "Your questions, answered. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-5.jpg",
		videoUrl: "https://storage.googleapis.com/cloud-samples-data/video/gbikes_dinosaur.mp4",
	},
	{
		title: "The Full Story",
		description: "Everything so far, in one sit-down conversation. (Placeholder clip.)",
		thumbnail: "/blog-placeholder-about.jpg",
		videoUrl: "https://storage.googleapis.com/exoplayer-test-media-0/BigBuckBunny_320x180.mp4",
	},
];
