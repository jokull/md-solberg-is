export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function copyFormattedToClipboard(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined") {
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([plainText], { type: "text/plain" });
    const item = new ClipboardItem({
      "text/html": htmlBlob,
      "text/plain": textBlob,
    });
    await navigator.clipboard.write([item]);
  } else {
    await copyToClipboard(plainText);
  }
}
