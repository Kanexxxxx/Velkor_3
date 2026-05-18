export interface CartItem {
  productId: string;
  name?: string;
  unitPrice?: number;
  quantity: number;
  size: string;
  color: string;
}

export interface AddCartItemInput {
  productId: string;
  quantity?: number;
  size: string;
  color: string;
}

export interface CartSummary {
  subtotal: number;
  total: number;
  itemsCount: number;
}
