/**
 * ocrScanner.js — Powered by Google Gemini Vision (gemini-1.5-flash)
 * Extracts key fields (Name, Expiry Date, Category, Fee/Value) from document & receipt photos.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error("Could not read image file data."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function scanDocumentWithOCR(file) {
  if (!file) throw new Error("No file provided");

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const promptText = `Analyze this image of a document, bill, ID, subscription receipt, warranty, or gift voucher.
Extract the following information:
1. "name": The official document/service/item name (e.g. "Emirates ID", "Netflix Premium", "Car Insurance", "Amazon Voucher").
2. "expiry_date": The expiry date, due date, or valid-until date formatted precisely as YYYY-MM-DD.
3. "category": Choose the best matching category from this list: ["Govt ID", "Subscription", "Bill", "Loan", "Warranty", "Insurance", "Membership", "Education", "Health", "Gift Voucher", "Other"].
4. "renewal_fee": The price, renewal fee, or amount due as a number (without currency symbols).
5. "store": The store or brand name if this is a voucher or warranty (e.g. "IKEA", "Apple", "Nike").
6. "value": The monetary value if this is a gift card or voucher.

Respond strictly with a JSON object matching this schema:
{
  "name": string or null,
  "expiry_date": string or null,
  "category": string or null,
  "renewal_fee": number or null,
  "store": string or null,
  "value": number or null
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: promptText },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini OCR API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("No text response received from OCR vision engine.");

    const parsed = JSON.parse(rawText);
    return {
      name: parsed.name || undefined,
      expiry_date: parsed.expiry_date || undefined,
      category: parsed.category || undefined,
      renewal_fee: parsed.renewal_fee !== null && parsed.renewal_fee !== undefined ? Number(parsed.renewal_fee) : undefined,
      store: parsed.store || undefined,
      value: parsed.value !== null && parsed.value !== undefined ? Number(parsed.value) : undefined,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error("OCR request timed out. Please try uploading a smaller image or enter details manually.");
    }
    throw err;
  }
}
