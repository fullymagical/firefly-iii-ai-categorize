import Groq from "groq-sdk";
import { getConfigVariable } from "../util.js";

export default class GrokAIService {
  #grokAi;
  #model = "llama3-8b-8192";

  constructor() {
    const apiKey = getConfigVariable("AI_API_KEY");

    this.#grokAi = new Groq({ apiKey });
  }

  async classify(categories, destinationName, description) {
    try {
      const prompt = this.#generatePrompt(
        categories,
        destinationName,
        description
      );

      const response = await this.getGroqChatCompletion({
        model: this.#model,
        prompt,
      });

      let guess = response.choices[0].message.content;
      guess = guess.replace("\n", "");
      guess = guess.trim();

      if (categories.indexOf(guess) === -1) {
        console.warn(`GrokAI could not classify the transaction. 
                Prompt: ${prompt}
                GrokAIs guess: ${guess}`);
        return null;
      }

      return {
        prompt,
        response: response.choices[0].message.content,
        category: guess,
      };
    } catch (error) {
      console.error(error.status);
      console.error(error.error.error.message);
      throw new GrokAiException(
        error.status,
        error.error.error.code,
        error.error.error.message
      );
    }
  }

  #generatePrompt(categories, destinationName, description) {
    return `Given i want to categorize transactions on my bank account into this categories: ${categories.join(
      ", "
    )}
In which category would a transaction from "${destinationName}" with the subject "${description}" fall into?
Just output the name of the category. Does not have to be a complete sentence.`;
  }

  async getGroqChatCompletion({ model, prompt }) {
    return this.#grokAi.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model,
    });
  }
}

class GrokAiException extends Error {
  code;
  response;
  body;

  constructor(statusCode, response, body) {
    super(`Error while communicating with GrokAI: ${statusCode} - ${body}`);

    this.code = statusCode;
    this.response = response;
    this.body = body;
  }
}
