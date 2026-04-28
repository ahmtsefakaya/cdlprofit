import { useState } from 'react';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are a trucking rate confirmation parser.
Extract the following fields from the text and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Rules:
- load_id: The load/order/reference number (string). Look for "Load #", "Order #", "Reference #", "Pro #", "BOL #", "Confirmation #" etc.
- broker_name: The company/broker name that issued the rate confirmation (string).
- pickup_city: ONLY the city name, no state, no zip, no street address (string).
- pickup_state: 2-letter US state abbreviation for pickup (string).
- delivery_city: ONLY the city name, no state, no zip, no street address (string).
- delivery_state: 2-letter US state abbreviation for delivery (string).
- pickup_date: Pickup date in YYYY-MM-DD format. If not found, null.
- delivery_date: Delivery date in YYYY-MM-DD format. If not found, null.
- loaded_miles: Number of loaded/billable miles as a plain number (no commas, no units). If not found, null.
- gross_amount: Total rate/gross pay as a plain number (no $ sign, no commas). If not found, null.

If a field cannot be found, set it to null.
Return ONLY the JSON object, nothing else.`;

/**
 * useAIParse — sends raw rate confirmation text to Gemini and returns parsed load fields.
 *
 * Usage:
 *   const { parse, isParsing, error } = useAIParse();
 *   const fields = await parse(rawText);  // returns partial form object
 */
export function useAIParse() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const parse = async (rawText) => {
    if (!rawText?.trim()) return null;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not set in your .env file.');
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\n---\n\n${rawText.trim()}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errBody}`);
      }

      const json = await response.json();
      const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Robustly extract the first {...} JSON object from whatever the model returns
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return a valid JSON object. Try pasting more text.');

      const parsed = JSON.parse(match[0]);

      // Sanitise: convert nulls to empty strings for string fields,
      // keep numbers as strings for controlled inputs
      const result = {};
      const stringFields = [
        'load_id', 'broker_name',
        'pickup_city', 'pickup_state',
        'delivery_city', 'delivery_state',
        'pickup_date', 'delivery_date',
      ];
      const numberFields = ['loaded_miles', 'gross_amount'];

      for (const f of stringFields) {
        if (parsed[f] != null) result[f] = String(parsed[f]).trim();
      }
      for (const f of numberFields) {
        if (parsed[f] != null && !isNaN(Number(parsed[f]))) {
          result[f] = String(Number(parsed[f]));
        }
      }

      return result;
    } catch (err) {
      setError(err.message || 'Failed to parse with AI.');
      throw err;
    } finally {
      setIsParsing(false);
    }
  };

  return { parse, isParsing, error };
}
