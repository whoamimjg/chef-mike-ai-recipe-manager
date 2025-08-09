// Target RedCard API integration for pricing
// Target offers a partners API but requires approval for retail pricing
const fetch = require('node-fetch');

export class TargetAPI {
  private apiKey: string;
  private baseUrl = 'https://api.target.com/redsky_aggregations/v1';

  constructor() {
    this.apiKey = process.env.TARGET_API_KEY || '';
  }

  async searchProducts(term: string, zipCode?: string): Promise<any[]> {
    if (!this.apiKey) {
      console.log('Target API key not configured');
      return [];
    }

    try {
      // Target's product search endpoint (requires API approval)
      const url = `${this.baseUrl}/redsky/web/plp/v2/by_keyword?keyword=${encodeURIComponent(term)}&store_id=${zipCode || ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Chef-Mikes-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Target API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.search_response?.items || [];
    } catch (error) {
      console.error('Target API error:', error);
      return [];
    }
  }

  async getItemPricing(itemName: string, userStores: string[] = []): Promise<Array<{
    storeName: string;
    storeId: string;
    price: number;
    promoPrice?: number;
    inStock: boolean;
    onSale: boolean;
  }>> {
    try {
      const products = await this.searchProducts(itemName);
      const results = [];

      for (const product of products.slice(0, 3)) {
        if (product.price && product.price.current_retail) {
          results.push({
            storeName: 'Target',
            storeId: 'target-general',
            price: product.price.current_retail,
            promoPrice: product.price.reg_retail !== product.price.current_retail ? product.price.reg_retail : undefined,
            inStock: product.available_to_promise_quantity > 0,
            onSale: product.price.reg_retail !== product.price.current_retail
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`Target API error for item "${itemName}":`, error);
      return [];
    }
  }
}

export const targetAPI = new TargetAPI();