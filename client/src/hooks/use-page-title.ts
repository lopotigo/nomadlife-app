import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const fullTitle = title ? `NomadLife - ${title}` : "NomadLife";
    document.title = fullTitle;
    return () => {
      document.title = "NomadLife";
    };
  }, [title]);
}
