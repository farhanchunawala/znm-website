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
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'api.qrserver.com',
				pathname: '/v1/create-qr-code/**',
			},
		],
	},
};

export default nextConfig;
