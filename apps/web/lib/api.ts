function resolveApiUrl(): string {
  // Explicit override always wins — set NEXT_PUBLIC_API_URL when you deploy
  // the API to a real host (e.g. https://api.yourdomain.com).
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // In the browser, call the API on the SAME host that served this page for
  // production deployments. The app proxy routes in /app/api and /app/uploads
  // forward that request to the hosted Render backend.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '';
    }
    return `${window.location.protocol}//${host}:4000`;
  }
  return 'http://localhost:4000';
}

export const API_URL = resolveApiUrl();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${API_URL}/uploads/${path}`;
}

// ---- Shared types (mirror the API responses) ----
export interface FoodEntity {
  id: string;
  name: string;
  category: string;
  baseUnit: string;
  caloriesPer100: number;
  proteinPer100: number;
}

export interface InventoryItem {
  id: string;
  quantity: number;
  unit: string;
  location: string;
  expiryDate: string | null;
  runoutDays: number | null;
  foodEntity: FoodEntity;
}

export interface ReceiptLine {
  id: string;
  rawText: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  price: number | null;
  confidence: number;
  status: string;
  foodEntityId: string | null;
  foodEntity: FoodEntity | null;
}

export interface Receipt {
  id: string;
  merchant: string | null;
  status: string;
  imagePath: string | null;
  createdAt: string;
  lineItems: ReceiptLine[];
}

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  foodEntity: FoodEntity;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  source: string;
  ingredients: RecipeIngredient[];
}

export interface CookableRecipe {
  recipe: Recipe;
  coverage: number;
  have: number;
  total: number;
  missing: string[];
}

export interface ShoppingItem {
  id: string;
  suggestedQty: number;
  unit: string;
  reason: string;
  status: string;
  foodEntity: FoodEntity;
}

export interface MealLog {
  id: string;
  name: string;
  servings: number;
  eaters: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  loggedAt: string;
}

export interface NutritionDashboard {
  targets: { protein: number; calories: number };
  today: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
  week: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
  trend: { date: string; calories: number; protein: number }[];
  insights: string[];
  mealsThisWeek: number;
}
