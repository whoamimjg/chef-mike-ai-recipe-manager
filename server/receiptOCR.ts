import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ReceiptItem {
  name: string;
  quantity: string;
  unit: string;
  price: number;
  category: string;
}

export interface ReceiptData {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  items: ReceiptItem[];
}

// Category mapping for common grocery items
const getCategoryForItem = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || 
      name.includes('butter') || name.includes('cream') || name.includes('dairy')) {
    return 'dairy';
  }
  
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('fish') || name.includes('turkey') || name.includes('lamb') ||
      name.includes('meat') || name.includes('salmon') || name.includes('tuna')) {
    return 'meat & poultry';
  }
  
  if (name.includes('apple') || name.includes('banana') || name.includes('orange') ||
      name.includes('lettuce') || name.includes('tomato') || name.includes('carrot') ||
      name.includes('potato') || name.includes('onion') || name.includes('pepper') ||
      name.includes('fruit') || name.includes('vegetable') || name.includes('produce')) {
    return 'produce';
  }
  
  if (name.includes('bread') || name.includes('pasta') || name.includes('rice') ||
      name.includes('cereal') || name.includes('flour') || name.includes('grain') ||
      name.includes('bakery')) {
    return 'bakery & grains';
  }
  
  if (name.includes('frozen') || name.includes('ice cream') || name.includes('pizza')) {
    return 'frozen';
  }
  
  if (name.includes('soap') || name.includes('shampoo') || name.includes('detergent') ||
      name.includes('cleaning') || name.includes('personal care')) {
    return 'household & personal care';
  }
  
  if (name.includes('juice') || name.includes('soda') || name.includes('water') ||
      name.includes('beer') || name.includes('wine') || name.includes('beverage')) {
    return 'beverages';
  }
  
  return 'pantry & other';
};

export async function processReceiptImage(imagePath: string): Promise<ReceiptData> {
  try {
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `
    Analyze this receipt image and extract the following information in JSON format:
    
    {
      "storeName": "Name of the store",
      "purchaseDate": "Date in YYYY-MM-DD format (if visible, otherwise use today's date)",
      "totalAmount": 0.00,
      "items": [
        {
          "name": "Item name",
          "quantity": "1",
          "unit": "each",
          "price": 0.00
        }
      ]
    }
    
    Instructions:
    1. Extract all food/grocery items with their prices
    2. For quantity, use "1" if not specified, or extract the actual quantity
    3. For unit, use "each", "lb", "oz", "pkg", etc. based on what you see
    4. Include the exact item names as they appear on the receipt
    5. Only include purchasable items, not taxes, fees, or subtotals
    6. If you can't read the total clearly, sum up all item prices
    7. Clean up item names (remove extra spaces, fix obvious OCR errors)
    8. Convert all prices to numbers (remove $ signs)
    
    Return only the JSON object, no additional text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add categories to items
    const itemsWithCategories = result.items.map((item: any) => ({
      ...item,
      category: getCategoryForItem(item.name),
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
    }));

    return {
      storeName: result.storeName || 'Unknown Store',
      purchaseDate: result.purchaseDate || new Date().toISOString().split('T')[0],
      totalAmount: typeof result.totalAmount === 'string' ? parseFloat(result.totalAmount) : result.totalAmount,
      items: itemsWithCategories
    };

  } catch (error) {
    console.error('Error processing receipt image:', error);
    throw new Error('Failed to process receipt image. Please try again or add items manually.');
  }
}

export async function deleteReceiptImage(imagePath: string): Promise<void> {
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.error('Error deleting receipt image:', error);
    // Don't throw error for cleanup failures
  }
}