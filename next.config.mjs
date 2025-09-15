/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	typescript: {
		ignoreBuildErrors: true,
	},
	eslint: {
		// Warning: only for production builds
		ignoreDuringBuilds: true,
	},
};

export default nextConfig;
