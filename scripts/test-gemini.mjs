import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels on the main class in some versions, 
        // but let's try a generateContent with a known working model 
        // OR just try to use gemini-1.5-flash again with better error logging.
        // Actually, let's try to get a model and see metadata if possible.
        // The SDK documentation says we can use the API directly for listing models if needed,
        // but let's stick to trying a simple generation first to isolate the issue.

        // Let's try gemini-1.5-flash again, but log everything.
        console.log("Testing model: gemini-1.5-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash:", await result.response.text());
    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);
    }

    try {
        console.log("Testing model: gemini-pro");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro:", await result.response.text());
    } catch (error) {
        console.error("Error with gemini-pro:", error.message);
    }
}

listModels();
