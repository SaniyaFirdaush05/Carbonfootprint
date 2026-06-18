/**
 * ai.js - EcoAI Natural Language Processing & API Integration
 * Parses user input to extract habits and handles chatbot responses.
 */

// Local fallback database of actionable suggestions based on categories
const ECO_TIPS = {
  transport: [
    "Taking the metro twice a week instead of driving can save up to **20 kg CO₂/month**.",
    "Biking or walking for trips under 3 km reduces emissions to **zero** and improves health.",
    "Switching to an Electric Vehicle (EV) can slash your daily transit footprint by **75%** or more.",
    "Carpooling with just one colleague halves your commuting emissions instantly."
  ],
  electricity: [
    "Switching to LED lightbulbs can reduce your lighting footprint by **80%** (about 5% of home energy).",
    "Turning down your AC thermostat by 1-2°C saves around **5% to 10%** of heating/cooling electricity.",
    "Unplugging vampire appliances (chargers, media centers) when not in use can save **3-5%** on your bill.",
    "If available, signing up for a green renewable energy tariff drops electricity emissions by **90%**."
  ],
  food: [
    "Swapping one beef meal per week for a vegetarian alternative saves roughly **15 kg CO₂/month**.",
    "Eating vegan for just one day a week saves about **8 kg CO₂** – equivalent to driving 45 km in a car.",
    "Reducing food waste prevents methane emissions in landfills. Try meal planning to buy only what you eat.",
    "Choosing poultry or pork over beef cuts emissions for that meal by **more than half**."
  ],
  shopping: [
    "Buying high-quality second-hand clothing instead of new fast-fashion saves about **10 kg CO₂ per garment**.",
    "Keeping your smartphone for 3 years instead of 2 reduces its manufacturing carbon impact by **33%**.",
    "Opting for minimalist purchases and focusing on durability prevents excessive manufacturing and shipping emissions."
  ],
  waste: [
    "Increasing your recycling to a 'high' level reduces your landfill waste carbon footprint by **60%**.",
    "Composting organic waste cuts down on landfill methane emissions and produces rich soil for plants.",
    "Avoiding single-use plastics and packaging directly lowers the energy required for manufacturing and disposal."
  ],
  general: [
    "Small consistent steps lead to massive collective results. Try setting one carbon-reduction goal this week!",
    "Understanding your footprint is the first step. Look at your dashboard breakdown to target your highest emissions."
  ]
};

/**
 * Parses user text input to detect any natural language logging actions.
 * Examples: 
 * - "I drove 15km in a petrol car"
 * - "Rode a bicycle for 5 km"
 * - "I ate a vegan lunch"
 * - "Logged 2 bags of trash"
 * 
 * @param {string} text - User message
 * @returns {Object|null} Parsed habit data: { category, value, subType, message } or null if nothing matched
 */
function parseHabitFromText(text) {
  const normalized = text.toLowerCase();
  
  // 1. TRANSPORT PARSING
  // Match distance: numbers followed by km, kilometers, miles, mi
  const transportRegex = /(\d+(?:\.\d+)?)\s*(km|kilometer|mile|mi|meter|m)\b/;
  const distanceMatch = normalized.match(transportRegex);
  
  if (distanceMatch) {
    let distance = parseFloat(distanceMatch[1]);
    const unit = distanceMatch[2];
    
    // Convert units to km
    if (unit === 'mile' || unit === 'mi' || unit === 'miles') {
      distance = distance * 1.60934;
    } else if (unit === 'meter' || unit === 'm' || unit === 'meters') {
      distance = distance / 1000;
    }
    distance = parseFloat(distance.toFixed(1));
    
    // Determine vehicle subtype
    let subType = 'petrol_car'; // Default fallback
    if (normalized.includes('electric') || normalized.includes('ev') || normalized.includes('tesla')) {
      subType = 'ev';
    } else if (normalized.includes('hybrid') || normalized.includes('prius')) {
      subType = 'hybrid_car';
    } else if (normalized.includes('diesel')) {
      subType = 'diesel_car';
    } else if (normalized.includes('motorcycle') || normalized.includes('bike') || normalized.includes('scooter')) {
      if (normalized.includes('motor') || normalized.includes('scooter') && !normalized.includes('kick')) {
        subType = 'motorcycle';
      } else {
        subType = 'bike';
      }
    } else if (normalized.includes('bus') || normalized.includes('transit') || normalized.includes('shuttle')) {
      subType = 'bus';
    } else if (normalized.includes('metro') || normalized.includes('subway') || normalized.includes('tube')) {
      subType = 'metro';
    } else if (normalized.includes('train') || normalized.includes('rail')) {
      subType = 'train';
    } else if (normalized.includes('walk') || normalized.includes('foot') || normalized.includes('run') || normalized.includes('jog')) {
      subType = 'walk';
    } else if (normalized.includes('bicycle') || normalized.includes('cycle') || normalized.includes('biked')) {
      subType = 'bike';
    }
    
    return {
      category: 'transport',
      value: distance,
      subType: subType,
      displayName: subType.replace('_', ' '),
      description: `Logged transit of ${distance} km by ${subType.replace('_', ' ')}`
    };
  }
  
  // 2. FOOD DIET PARSING
  if (normalized.includes('ate') || normalized.includes('eat') || normalized.includes('dinner') || normalized.includes('lunch') || normalized.includes('breakfast') || normalized.includes('meal') || normalized.includes('food')) {
    let subType = null;
    let displayName = '';
    
    if (normalized.includes('beef') || normalized.includes('steak') || normalized.includes('burger')) {
      subType = 'beef';
      displayName = 'Beef Meal';
    } else if (normalized.includes('vegan') || normalized.includes('plant-based') || normalized.includes('tofu')) {
      subType = 'vegan';
      displayName = 'Vegan Meal';
    } else if (normalized.includes('vegetarian') || normalized.includes('veggie') || normalized.includes('cheese') || normalized.includes('salad')) {
      subType = 'vegetarian';
      displayName = 'Vegetarian Meal';
    } else if (normalized.includes('chicken') || normalized.includes('meat') || normalized.includes('pork') || normalized.includes('fish') || normalized.includes('turkey') || normalized.includes('ham') || normalized.includes('bacon')) {
      subType = 'meat';
      displayName = 'Meat Meal (Non-Beef)';
    }
    
    if (subType) {
      // Parse quantity if provided, e.g. "2 beef meals"
      const quantityRegex = /(\d+)\s*(beef|vegan|vegetarian|veggie|meat|chicken)?\s*(meal|serving|burger)/;
      const quantityMatch = normalized.match(quantityRegex);
      const mealsCount = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      
      return {
        category: 'food',
        value: mealsCount,
        subType: subType,
        displayName: displayName,
        description: `Logged ${mealsCount} ${displayName}(s)`
      };
    }
  }
  
  // 3. ELECTRICITY PARSING
  const elecRegex = /(\d+(?:\.\d+)?)\s*(kwh|kilowatt hours?)\b/;
  const elecMatch = normalized.match(elecRegex);
  if (elecMatch) {
    const kwh = parseFloat(elecMatch[1]);
    let subType = 'grid';
    if (normalized.includes('green') || normalized.includes('solar') || normalized.includes('renewable')) {
      subType = 'green';
    }
    return {
      category: 'electricity',
      value: kwh,
      subType: subType,
      displayName: `${subType} electricity`,
      description: `Logged ${kwh} kWh of ${subType} electricity`
    };
  }
  
  // 4. SHOPPING PARSING
  const shoppingTypes = ['clothing', 'electronics', 'furniture', 'misc'];
  let detectedShopType = null;
  if (normalized.includes('bought') || normalized.includes('buy') || normalized.includes('purchased') || normalized.includes('purchase')) {
    if (normalized.includes('shirt') || normalized.includes('shoes') || normalized.includes('pants') || normalized.includes('clothing') || normalized.includes('clothes') || normalized.includes('jacket') || normalized.includes('dress')) {
      detectedShopType = 'clothing';
    } else if (normalized.includes('phone') || normalized.includes('laptop') || normalized.includes('computer') || normalized.includes('device') || normalized.includes('tablet') || normalized.includes('camera') || normalized.includes('electronics')) {
      detectedShopType = 'electronics';
    } else if (normalized.includes('chair') || normalized.includes('table') || normalized.includes('sofa') || normalized.includes('couch') || normalized.includes('desk') || normalized.includes('furniture')) {
      detectedShopType = 'furniture';
    } else {
      detectedShopType = 'misc';
    }
    
    // Check quantity, e.g. "bought 3 shirts"
    const countRegex = /(?:bought|buy|purchased|purchase)\s*(\d+)?/;
    const countMatch = normalized.match(countRegex);
    const itemCount = (countMatch && countMatch[1]) ? parseInt(countMatch[1]) : 1;
    
    return {
      category: 'shopping',
      value: itemCount,
      subType: detectedShopType,
      displayName: detectedShopType,
      description: `Logged purchase of ${itemCount} ${detectedShopType} item(s)`
    };
  }
  
  // 5. WASTE PARSING
  if (normalized.includes('waste') || normalized.includes('trash') || normalized.includes('garbage') || normalized.includes('bag')) {
    const bagRegex = /(\d+)\s*(bag|bin|load)s?\s*(of|trash|garbage|waste)?/;
    const bagMatch = normalized.match(bagRegex);
    
    if (bagMatch) {
      const bags = parseInt(bagMatch[1]);
      let subType = 'recycle_low';
      if (normalized.includes('recycled') || normalized.includes('recycling')) {
        subType = 'recycle_high';
      }
      return {
        category: 'waste',
        value: bags,
        subType: subType,
        displayName: 'general waste bags',
        description: `Logged ${bags} general waste bags with ${subType.split('_')[1]} recycling`
      };
    }
    
    // Toggle recycling rate directly
    if (normalized.includes('recycling') || normalized.includes('recycled')) {
      let subType = 'recycle_medium';
      if (normalized.includes('high') || normalized.includes('a lot') || normalized.includes('everything')) {
        subType = 'recycle_high';
      } else if (normalized.includes('low') || normalized.includes('hardly')) {
        subType = 'recycle_low';
      }
      return {
        category: 'waste',
        value: 1, // default 1 bag base
        subType: subType,
        displayName: 'recycling status update',
        description: `Updated recycling status to: ${subType.split('_')[1]}`
      };
    }
  }
  
  return null;
}

/**
 * Returns a custom local simulated reply based on parsed message metadata
 */
function getSimulatedAIReply(text, parsedHabit, trackerState) {
  const normalized = text.toLowerCase();
  
  // Helper to get random item from list
  const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  // Case 1: Habit parsed and logged successfully
  if (parsedHabit) {
    const co2SavedOrEmitted = window.Calculator 
      ? window.Calculator.calculateCategoryCarbon(parsedHabit.category, parsedHabit.value, parsedHabit.subType)
      : 1.5; // fallback estimate
      
    let tip = sample(ECO_TIPS[parsedHabit.category] || ECO_TIPS.general);
    
    return {
      text: `♻️ **Habit Logged!**\n\nI have successfully recorded that under **${parsedHabit.category.toUpperCase()}**.\n\n* **Detail**: ${parsedHabit.description}\n* **Carbon Impact**: +${co2SavedOrEmitted.toFixed(2)} kg CO₂\n\n*Eco-Tip for this category:* ${tip}\n\nYour dashboard has been updated in real-time. Keep it up!`,
      success: true
    };
  }
  
  // Case 2: Greeting
  if (normalized.includes('hello') || normalized.includes('hi ') || normalized.trim() === 'hi' || normalized.includes('hey') || normalized.includes('greetings')) {
    return {
      text: `Hello! 👋 I'm **EcoAI**, your carbon tracking companion. \n\nI can analyze your daily habits, log metrics to your dashboard automatically, and suggest tailored ways to reduce your carbon footprint.\n\n**Try saying things like:**\n* *"I rode the metro for 15 km"* \n* *"I ate a vegan dinner"* \n* *"How can I lower my electricity footprint?"*\n* *"Give me some food suggestions"*`,
      success: true
    };
  }
  
  // Case 3: Asking for tips or help
  if (normalized.includes('tip') || normalized.includes('help') || normalized.includes('advice') || normalized.includes('suggest') || normalized.includes('reduce') || normalized.includes('save') || normalized.includes('carbon')) {
    let focusCategory = 'general';
    
    // Find highest emitter or requested category
    if (normalized.includes('transport') || normalized.includes('car') || normalized.includes('metro') || normalized.includes('drive')) {
      focusCategory = 'transport';
    } else if (normalized.includes('electric') || normalized.includes('energy') || normalized.includes('power') || normalized.includes('light') || normalized.includes('ac')) {
      focusCategory = 'electricity';
    } else if (normalized.includes('food') || normalized.includes('eat') || normalized.includes('diet') || normalized.includes('beef') || normalized.includes('meat')) {
      focusCategory = 'food';
    } else if (normalized.includes('shopping') || normalized.includes('buy') || normalized.includes('purchase') || normalized.includes('clothes')) {
      focusCategory = 'shopping';
    } else if (normalized.includes('waste') || normalized.includes('recycle') || normalized.includes('garbage')) {
      focusCategory = 'waste';
    } else if (trackerState) {
      // Automatically target their highest footprint category from state!
      let maxVal = -1;
      for (const cat of ['transport', 'electricity', 'food', 'shopping', 'waste']) {
        const catVal = trackerState[cat] ? trackerState[cat].co2 : 0;
        if (catVal > maxVal) {
          maxVal = catVal;
          focusCategory = cat;
        }
      }
    }
    
    const tips = ECO_TIPS[focusCategory];
    return {
      text: `🌱 **Personalized Recommendations for ${focusCategory.toUpperCase()}**:\n\n1. ${tips[0]}\n2. ${tips[1]}\n3. ${tips.length > 2 ? tips[2] : 'Try switching to local, sustainable options where possible.'}\n\nType or say something you did today (e.g. *"I biked 10 km"*) and I'll log it directly!`,
      success: true
    };
  }
  
  // Case 4: General conversation default fallback
  return {
    text: `I heard: "${text}". I didn't quite capture a specific habit to log, but I'm here to help!\n\nTo log a habit, tell me something like:\n* *"I drove 25 kilometers in a petrol car"* \n* *"We threw away 2 bags of trash"* \n* *"I bought a new shirt today"*\n\nOr ask me directly: *"Suggest some ways to save electricity."*`,
    success: false
  };
}

/**
 * Connects directly to the Gemini 2.5 Flash API client-side.
 * Sends the user prompt, tracking state, and conversation history for high-fidelity responses.
 * 
 * @param {string} apiKey - Gemini API Key provided by user
 * @param {string} userMessage - Message string typed or spoken
 * @param {Object} trackerState - Current carbon log metrics
 * @param {Array} chatHistory - Array of past messages [{role: 'user'|'model', text: String}]
 * @returns {Promise<Object>} { text: String, parsedHabit: Object|null }
 */
async function queryGemini(apiKey, userMessage, trackerState, chatHistory = []) {
  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  // Pre-parse habit using local NLP first so the UI can update instantly
  const parsedHabit = parseHabitFromText(userMessage);

  // Build current state summary
  const stateSummary = Object.keys(trackerState).map(cat => {
    const log = trackerState[cat];
    return ` - ${cat.toUpperCase()}: ${log.value} ${log.unit || ''} (Type: ${log.subType || 'default'}) -> Current emissions: ${log.co2.toFixed(2)} kg CO2`;
  }).join('\n');

  // Set system context instructing Gemini how to act
  const systemInstruction = `You are EcoAI, a futuristic and helpful eco-assistant chatbot.
Your goal is to help the user understand, track, and reduce their daily carbon footprint.
Keep responses concise, conversational, and packed with actionable numbers and specific statistics.
Do not write extremely long paragraphs. Use bullet points and bold styling where helpful.

The user's current tracked habits for today are:
${stateSummary}

Total Projected Footprint for Today: ${(Object.values(trackerState).reduce((acc, c) => acc + c.co2, 0)).toFixed(2)} kg CO2.
(Target for sustainable carbon neutrality: 5 kg CO2/day. Average global daily footprint: 11 kg CO2).

IMPORTANT:
1. If the user tells you about a habit they did today, check if it can be logged. 
   We detected a potential habit logging from their text: ${parsedHabit ? JSON.stringify(parsedHabit) : 'None detected'}.
   If we detected a habit, confirm it warmly, mention the specific metric impact (e.g., "+X kg CO2"), and update them that their dashboard was refreshed.
2. Give clear advice tailored to their highest emitting category.
3. Suggest simple metrics, e.g., "Switching to LED bulbs can reduce your lighting footprint by 80%" or "Taking the metro twice a week saves 20 kg CO2/month."
4. Be encouraging and direct. Speak as a premium, highly smart AI.
5. If they ask questions, provide direct solutions. Keep formatting clean and readable.`;

  // Format history for Gemini API content structure
  // Gemini expects: { contents: [ { role: "user"|"model", parts: [ { text: "..." } ] } ] }
  const contents = [];
  
  // Add history messages
  chatHistory.slice(-6).forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // Add current prompt
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP error ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking of a reply right now. Let me check my green logs.";
    
    return {
      text: replyText,
      parsedHabit: parsedHabit
    };

  } catch (error) {
    console.error('Gemini API query failed, falling back to simulator:', error);
    // Fall back to local simulator if API error occurs
    const fallback = getSimulatedAIReply(userMessage, parsedHabit, trackerState);
    return {
      text: `⚠️ *Gemini API Error (${error.message}). Falling back to local offline assistant:*\n\n${fallback.text}`,
      parsedHabit: parsedHabit
    };
  }
}

// Export modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ECO_TIPS,
    parseHabitFromText,
    getSimulatedAIReply,
    queryGemini
  };
} else {
  window.EcoAI = {
    ECO_TIPS,
    parseHabitFromText,
    getSimulatedAIReply,
    queryGemini
  };
}
