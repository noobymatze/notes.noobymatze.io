/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		fontFamily: {
			'serif': ['STIX Two Text', 'ui-serif', 'Georgia'],
		},
		extend: {},
	},
	plugins: [
		require('@tailwindcss/typography')
	],
}
