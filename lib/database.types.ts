// /lib/database.types.ts

export type Product = {
  id: string;                     
  name: string;
  description: string | null;
  max_buyback_price: number | null;
  category: 'iphone' | 'camera' | 'game';
  created_at: string;
  updated_at: string;
};

export type Variant = {
  id: string;                      
  product_id: string;              
  jan_code: string;
  color: string;
  capacity: string | null;
  buyback_price: number;           
  target_quantity: number;
  current_quantity: number;
  next_price: number | null;
  next_price_quantity: number | null;
  created_at: string;
  updated_at: string;
};

export type CartItemTable = {
  id: string;                      
  user_id: string;                 
  variant_id: string;              
  color: string | null;
  capacity: string | null;
  quantity: number;                
  cart_id: string | null;          
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      products: { Row: Product };
      product_variants: { Row: Variant };
      cart_items: { Row: CartItemTable };
    };
  };
}
