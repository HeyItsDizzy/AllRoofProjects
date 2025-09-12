export default function buildNestedTree(paths) {
  const root = {};

  paths.forEach((fullPath) => {
    const parts = fullPath.split("/").filter(Boolean);
    let current = root;
    let pathSoFar = "";

    parts.forEach((part, idx) => {
      pathSoFar += (idx === 0 ? "" : "/") + part;

      if (!current[part]) {
        current[part] = {
          __meta: {
            name: pathSoFar,
            label: part
          }
        };
      }

      current = current[part];
    });
  });

  return root;
}
