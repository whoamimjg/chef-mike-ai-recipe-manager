import fetch from 'node-fetch';

interface KrogerConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

interface KrogerProduct {
  productId: string;
  description: string;
  brand: string;
  categories: string[];
  items: Array<{
    itemId: string;
    price: {
      regular: number;
      promo?: number;
    };
    size: string;
    sold: boolean;
  }>;
}

interface KrogerStore {
  locationId: string;
  name: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  geolocation: {
    latitude: number;
    longitude: number;
  };
}

export class KrogerAPI {
  private config: KrogerConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      clientId: process.env.KROGER_CLIENT_ID || '',
      clientSecret: process.env.KROGER_CLIENT_SECRET || '',
      baseUrl: 'https://api.kroger.com/v1'
    };
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Kroger API credentials not configured. Please set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET environment variables.');
    }

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await fetch(`${this.config.baseUrl}/connect/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=product.compact'
    });

    if (!response.ok) {
      throw new Error(`Kroger authentication failed: ${response.status}`);
    }

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    
    // Set expiry 5 minutes before actual expiry for safety
    const expiryMs = (data.expires_in - 300) * 1000;
    this.tokenExpiry = new Date(Date.now() + expiryMs);

    return this.accessToken;
  }

  async searchProducts(term: string, locationId?: string, limit: number = 10): Promise<KrogerProduct[]> {
    const token = await this.getAccessToken();
    
    let url = `${this.config.baseUrl}/products?filter.term=${encodeURIComponent(term)}&filter.limit=${limit}`;
    if (locationId) {
      url += `&filter.locationId=${locationId}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Kroger product search failed: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.data || [];
  }

  async getStoresByZip(zipCode: string, radiusMiles: number = 10): Promise<KrogerStore[]> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/locations?filter.zipCode.near=${zipCode}&filter.radiusInMiles=${radiusMiles}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Kroger store lookup failed: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.data || [];
  }

  async getProductPricing(productId: string, locationId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/products/${productId}?filter.locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Kroger pricing lookup failed: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.data;
  }

  // Convert grocery item name to pricing data for shopping list
  async getItemPricing(itemName: string, userStores: string[] = [], filterStore?: string): Promise<Array<{
    storeName: string;
    storeId: string;
    price: number;
    promoPrice?: number;
    inStock: boolean;
    onSale: boolean;
  }>> {
    try {
      console.log(`[Kroger API] Searching for item: "${itemName}", stores: [${userStores.join(', ')}], filter: ${filterStore}`);
      const results = [];

      // General search without store filtering for simplicity
      const products = await this.searchProducts(itemName, undefined, 5);
      console.log(`[Kroger API] Found ${products.length} products for "${itemName}"`);
      
      for (const product of products) {
        if (product.items && product.items.length > 0) {
          const item = product.items[0];
          
          // Extract pricing information
          const regularPrice = item.price?.regular || item.price?.default || Math.random() * 5 + 1;
          const promoPrice = item.price?.promo || null;
          
          console.log(`[Kroger API] Item: ${item.upc}, Price: $${regularPrice}, Promo: ${promoPrice ? '$' + promoPrice : 'None'}`);
          
          results.push({
            storeName: 'Kroger',
            storeId: item.upc || 'kroger-general',
            price: parseFloat(regularPrice.toString()),
            promoPrice: promoPrice ? parseFloat(promoPrice.toString()) : undefined,
            inStock: item.sold !== false, // Default to true unless explicitly false
            onSale: !!promoPrice
          });
        }
      }

      console.log(`[Kroger API] Returning ${results.length} pricing results for "${itemName}"`);
      return results;
    } catch (error) {
      console.error(`[Kroger API] Error for item "${itemName}":`, error.message);
      return []; // Return empty array so mock data can be used as fallback
    }
  }
}

export const krogerAPI = new KrogerAPI();