import type { NextConfig } from "next";

export default {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
		],
	},
} satisfies NextConfig;
