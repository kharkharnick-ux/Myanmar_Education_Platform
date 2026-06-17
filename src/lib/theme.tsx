import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const ThemeCtx = createContext<{
  theme: Theme;
  mounted: boolean;
  toggle: () => void;
}>({
  theme: "light",
  mounted: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        mounted,
        toggle: () =>
          setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);