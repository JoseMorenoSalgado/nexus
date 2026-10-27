import type {Config} from "tailwindcss";
export default {
 content:["./src/**/*.{ts,tsx,js,jsx,mdx}"],
 theme:{extend:{
  colors:{nexus:{red:"#cf202b",redDark:"#ae1723",ink:"#191f27",surface:"#f6f8fa"}},
  boxShadow:{panel:"0 12px 38px rgba(25,31,39,.065)"},
  borderRadius:{panel:"0.75rem"}
 }},
 plugins:[]
} satisfies Config;
