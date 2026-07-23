/**
 * ocrScanner.js — Powered by Google Gemini Vision
 * Extracts key fields from document & receipt photos AND PDFs.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error("Could not read file data."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export async function scanDocumentWithOCR(file) {
  if (!file) throw new Error("No file provided");

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  // Gemini Vision supports: image/jpeg, image/png, image/webp, image/heic, image/heif, application/pdf
  const supportedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'application/pdf'
  ];

  const effectiveMime = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  const promptText = `You are an expert document parser. Analyze this document image or PDF carefully.

Scan EVERY part of the document — headers, body text, footers, stamps, and fine print.

Extract these fields:
1. "name": The full official name of this document, card, or service. Examples:
   - ID card → "Emirates ID", "NYC Identification Card", "Driver's License"
   - Insurance → "Vehicle Insurance", "Health Insurance Policy"  
   - Subscription → "Netflix Premium", "Spotify Family", "Adobe Creative Cloud"
   - Bill → "DEWA Electricity Bill", "Etisalat Invoice"
   - If uncertain, use the issuing authority + document type (e.g., "Federal Authority - ID Card")

2. "expiry_date": The expiry/expiration/valid-until/due date in YYYY-MM-DD format.
   - Look for labels: EXPIRY DATE, EXPIRATION DATE, EXP, VALID UNTIL, DUE DATE, VALID THRU, RENEWAL DATE
   - Convert MM/DD/YYYY → YYYY-MM-DD (e.g., 03/11/2030 → 2030-03-11)
   - Convert DD/MM/YYYY → YYYY-MM-DD (e.g., 11/03/2030 → 2030-03-11)
   - If year is 2-digit: 30 → 2030, 28 → 2028

3. "category": Pick the single BEST match from: ["Govt ID", "Subscription", "Bill", "Loan", "Warranty", "Insurance", "Membership", "Education", "Health", "Gift Voucher", "Other"]
   - ID cards, passports, driver licenses, national IDs → "Govt ID"
   - Car/health/life/property insurance → "Insurance"
   - Netflix/Spotify/gym/streaming → "Subscription"
   - Electricity/water/internet bills → "Bill"

4. "renewal_fee": Any fee, price, or amount due as a plain number (no currency symbols). null if not found.

5. "store": Brand/store name only if this is a voucher or warranty (e.g., "IKEA", "Apple"). null otherwise.

6. "value": Face value only if gift card/voucher. null otherwise.

Respond ONLY with valid JSON. No markdown. No explanation. Just the JSON object:
{
  "name": string or null,
  "expiry_date": string or null,
  "category": string or null,
  "renewal_fee": number or null,
  "store": string or null,
  "value": number or null
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for PDFs

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
                  mimeType: effectiveMime,
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
          maxOutputTokens: 512,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini OCR failed: ${msg}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("No response from Gemini vision engine.");

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

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
      throw new Error("OCR timed out. Try a smaller/clearer image.");
    }
    throw err;
  }
}
