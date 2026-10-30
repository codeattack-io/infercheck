/**
 * src/lib/sync/adapters/scaleway.ts
 *
 * Fetches Scaleway Generative APIs models and their prices from Scaleway's
 * public product catalog. EU-native provider — no credentials needed.
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

const CATALOG_URL =
  "https://api.scaleway.com/product-catalog/v2alpha1/public-catalog/products?product_types=generative_apis";
const PAGE_SIZE = 100;
const OFFERED_STATUSES = new Set(["general_availability", "preview"]);

interface CatalogProduct {
  product: string;
  status: string;
  locality?: { region?: string };
  price?: { retail_price?: { currency_code: string; units: string | number; nanos?: number } } | null;
  unit_of_measure?: { unit: string; size: number };
  properties?: {
    generative_apis?: { consumption_mode?: string; token_type?: string; tasks?: string[] };
  };
}

async function fetchCatalog(): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${CATALOG_URL}&page=${page}&page_size=${PAGE_SIZE}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = (await res.json()) as { products: CatalogProduct[]; total_count: number };
    products.push(...data.products);
    if (data.products.length === 0 || products.length >= data.total_count) return products;
  }
}

/** EUR per 1M tokens of a realtime per-token SKU, null for every other SKU. */
function pricePerMTokens(p: CatalogProduct): number | null {
  const retail = p.price?.retail_price;
  if (!retail || retail.currency_code !== "EUR" || p.unit_of_measure?.unit !== "token") return null;
  const perUnit = Number(retail.units) + (retail.nanos ?? 0) / 1e9;
  return (perUnit / p.unit_of_measure.size) * 1_000_000;
}

function modalityOf(tasks: string[]): string {
  if (tasks.includes("embeddings")) return "embedding";
  if (tasks.includes("audio_transcription")) return "audio";
  if (tasks.includes("vision") || tasks.includes("ocr")) return "multimodal";
  return "text";
}

export async function fetchScalewayModels(): Promise<ModelRow[]> {
  console.log("Fetching Scaleway model catalog…");
  const products = (await fetchCatalog()).filter(
    (p) => p.locality?.region === "fr-par" && OFFERED_STATUSES.has(p.status)
  );

  const models = new Map<string, { tasks: string[]; i: number | null; o: number | null }>();
  for (const p of products) {
    const ga = p.properties?.generative_apis;
    const model = models.get(p.product) ?? { tasks: ga?.tasks ?? [], i: null, o: null };
    if (ga?.consumption_mode === "realtime") {
      if (ga.token_type === "input_token") model.i = pricePerMTokens(p);
      if (ga.token_type === "output_token") model.o = pricePerMTokens(p);
    }
    models.set(p.product, model);
  }

  const now = new Date();
  return [...models].map(([id, m]) => ({
    id: `scaleway/${id}`,
    providerSlug: "scaleway",
    canonicalModelId: deriveCanonicalModelId(`scaleway/${id}`),
    displayName: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    modality: modalityOf(m.tasks),
    contextWindow: null,
    inputPricePerMTokens: toPricePerMTokens(m.i),
    outputPricePerMTokens: toPricePerMTokens(m.o),
    priceCurrency: "EUR",
    tokensPerSecond: null,
    syncSource: "provider_api",
    isActive: true,
    isNativeModel: true,
    lastSyncedAt: now,
  }));
}
