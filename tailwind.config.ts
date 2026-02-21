import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 우주 테마 색상 (블루프린트 Step 1)
        'space-bg': '#0a0a0f',
        'star-blue': '#4FC3F7',
        'star-glow': '#81D4FA',
        'planet-coral': '#FF7043',
        'planet-green': '#66BB6A',
        'planet-purple': '#AB47BC',
        'planet-orange': '#FFA726',
      },
    },
  },
  plugins: [],
};
export default config;
