export interface IngredientDetail {
  raw: string;
  quantity?: number;
  quantityMax?: number;
  unit?: string;
  unitOriginal?: string;
  ingredient?: string;
  preparation?: string;
  notes?: string;
  optional?: boolean;
  alternatives?: string[];
  confidence?: number;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  ingredientDetails: IngredientDetail[];
  instructions: string[];
  image: string;
  source: string;
  category: string;
  notes: string[];
  favourite: boolean;
  difficulty: string;
  cookTime: string;
  prepTime: string;
  servingSize: string;
  [key: string]: any;
}
