import OpenAI from "openai";
import fs from "fs";

// Check if OpenAI API key is properly configured
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  throw new Error('OPENAI_API_KEY environment variable is required');
}

console.log('receiptOCR: OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
console.log('receiptOCR: OpenAI API Key length:', process.env.OPENAI_API_KEY?.length);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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
    console.log('Processing receipt image:', imagePath);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Receipt image file not found: ${imagePath}`);
    }
    
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Image file size:', imageBuffer.length, 'bytes');
    console.log('Base64 image length:', base64Image.length);

    const prompt = `
    IMPORTANT: This is a comprehensive receipt analysis. You must extract EVERY SINGLE ITEM visible on this receipt.
    
    Analyze this receipt image and extract ALL information in JSON format:
    
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
    
    CRITICAL INSTRUCTIONS - READ CAREFULLY:
    1. EXTRACT EVERY SINGLE ITEM - scan the entire receipt line by line
    2. Include ALL food items, beverages, household goods, personal care items
    3. Do NOT skip items even if partially visible or hard to read - make your best guess
    4. Look for items in ALL parts of the receipt (top, middle, bottom)
    5. Check for items with special formatting (discounts, bulk items, etc.)
    6. Include items even if the text is slightly blurry or cut off
    7. For quantity: use actual quantity if visible, otherwise use "1"
    8. For unit: use "each", "lb", "oz", "pkg", "ct", etc. based on context
    9. Clean up item names but keep them recognizable
    10. Convert prices to numbers (remove $ signs and any formatting)
    11. Only exclude: taxes, fees, subtotals, payment info, store info
    12. If you see 20+ items, you're on the right track - grocery receipts typically have many items
    
    DOUBLE-CHECK: Before responding, count how many items you found. Grocery receipts typically have 15-30+ items. If you have fewer than 15 items, scan again more carefully.
    
    Return only the JSON object, no additional text.
    `;

    console.log('Sending request to OpenAI...');
    
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
      max_tokens: 4000,
    });
    
    console.log('OpenAI response received, parsing...');

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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check for specific OpenAI errors
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new Error('OpenAI API key configuration issue. Please check your API key.');
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('file not found')) {
        throw new Error('Receipt image file was not uploaded properly. Please try uploading again.');
      } else if (error.message.includes('insufficient_quota') || error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account.');
      } else if (error.message.includes('timeout')) {
        throw new Error('OpenAI API request timed out. Please try again.');
      } else {
        // Return the actual error for debugging
        throw new Error(`Receipt processing failed: ${error.message}`);
      }
    }
    
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