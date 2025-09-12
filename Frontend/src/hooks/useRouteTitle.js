// src/hooks/useRouteTitle.js
import { useEffect } from "react";
import { useMatches } from "react-router-dom";

export default function useRouteTitle(appName = "Project Manager") {
  // Grab all current router matches…
  const matches = useMatches();

  // …find the deepest one that has a handle.title
  const matchWithTitle = [...matches].reverse().find((m) => m.handle?.title);

  const pageTitle = matchWithTitle?.handle.title || "";

  useEffect(() => {
    document.title = pageTitle
      ? `${appName} | ${pageTitle}`
      : appName;
  }, [pageTitle, appName]);
}
