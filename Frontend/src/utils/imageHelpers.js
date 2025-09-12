export async function resizeImage(file, maxDim = 800) {
  // load the image
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });

  // calculate target dimensions
  let { width, height } = img;
  if (width <= maxDim && height <= maxDim) return file; // already small enough
  const scale = maxDim / Math.max(width, height);
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  // draw to canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // get a blob back
  const blob = await new Promise((res) =>
    canvas.toBlob(res, file.type, 0.8 /* quality 0–1 */)
  );

  // create a new File with a shorter name
  const shortName = file.name.slice(0, 50).replace(/\s/g, "_");
  return new File([blob], shortName, { type: file.type });
}
