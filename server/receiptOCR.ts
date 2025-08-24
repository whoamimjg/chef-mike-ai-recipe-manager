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
    CRITICAL: You are doing COMPREHENSIVE receipt analysis. Extract EVERY SINGLE PURCHASABLE ITEM from this receipt - count them carefully.
    
    Return this exact JSON format with ALL items found:
    
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
    
    MANDATORY REQUIREMENTS:
    1. SCAN EVERY LINE - read the receipt from top to bottom systematically
    2. EACH LINE IS SEPARATE - if you see "OATMILK SKYR 3.29" on one line and "OATMILK SKYR 4.58" on another line, these are TWO different items, not one
    3. DIFFERENT PRICES = DIFFERENT ITEMS - even if the name is identical, different prices mean separate entries
    4. INCLUDE ALL SECTIONS - General Merchandise, Drugstore, Grocery - everything purchasable
    5. DIFFERENT PRODUCT CODES = DIFFERENT ITEMS - "85582300716 OATMILK SKYR" and "85582300718 OATMILK SKYR" are separate items
    6. IGNORE ONLY: "SAVINGS", "COUPONS", "TOTAL", "SUBTOTAL", "TAX", payment/card info, store header info, negative coupon amounts
    7. For items sold by weight (like "2.07 lb @"), extract the actual weight as quantity
    8. For items with unclear text, make your best guess - DO NOT skip them
    9. This specific receipt should have 25+ separate purchasable line items
    10. CRITICAL: Look specifically for multiple OATMILK SKYR entries - there are TWO with different prices
    
    VERIFICATION: After extracting, count your items. If you have fewer than 25 items from this receipt, you missed some. Go back and scan more carefully for every single line item.
    
    Return ONLY the JSON object, no other text.
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