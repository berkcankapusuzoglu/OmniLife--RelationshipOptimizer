import { THEME_STORAGE_KEY } from "@/lib/theme/preference";

// Runs before first paint so the document never flashes the wrong theme. The
// server renders no theme class at all, which is why <html> carries
// suppressHydrationWarning in the root layout.
const script = `(function(){var p="dark";try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s==="light"||s==="dark"||s==="system")p=s;}catch(e){}var d=p==="dark";if(p==="system"){try{d=window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){d=true;}}var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
