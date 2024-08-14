const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const Providers = {
  ANTHROPIC: "anthropic",
  OPEN_AI: "openai",
  // Add other providers here
};

class BaseAIService {
  constructor({ apiKey, model, temperature, maxTokens }) {
    this.apiKey = apiKey;
    this.model = model || process.env.DEFAULT_MODEL;
    this.temperature = temperature || 0;
    this.maxTokens = maxTokens || 4000;
  }

  async sendMessage() {
    throw new Error("sendMessage method not implemented");
  }

  static validateKey() {
    throw new Error("validateKey method not implemented");
  }
}

class AnthropicService extends BaseAIService {
  constructor(params) {
    super(params);
    this.client = new Anthropic({
      apiKey: params.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async sendMessage({ system, tools = [], tool_choice, messages = [] }) {
    const clientParams = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages,
      tools,
    };
    if (tool_choice) clientParams.tool_choice = tool_choice;
    if (system) clientParams.system = system;

    const response = await this.client.messages.create(clientParams);
    return response;
  }

  static async validateKey(key) {
    const testClient = new Anthropic({ apiKey: key });
    try {
      await testClient.messages.create({
        model: process.env.DEFAULT_MODEL,
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: "user", content: "Hello" }],
      });
      console.log("Anthropic API key validated successfully");
      return true;
    } catch (error) {
      console.error("Error validating Anthropic API key:", error);
      return false;
    }
  }
}

class OpenAIService extends BaseAIService {
  constructor(params) {
    super(params);
    this.client = new OpenAI({
      apiKey: params.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async sendMessage({ system, tools = [], tool_choice, messages = [] }) {
    const clientParams = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages,
      tools,
    };
    if (tool_choice) clientParams.tool_choice = tool_choice;
    if (system) clientParams.system = system;

    console.log("Calling OpenAI API with payload:", clientParams);

    try {
      const response = await this.client.chat.completions.create(clientParams);
      console.log("OpenAI API response:", response);
      this.tokensUsed = response.usage.total_tokens;

      return response;
    } catch (error) {
      console.error("Error sending message to OpenAI:", error);
      throw error;
    }
  }

  static async validateKey(key) {
    const testClient = new OpenAI({ apiKey: key });
    try {
      await testClient.chat.completions.create({
        model: process.env.OPENAI_MODEL,
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: "user", content: "Hello" }],
      });
      console.log("OpenAI API key validated successfully");
      return true;
    } catch (error) {
      console.error("OpenAI API key validation failed:", error);
      return false;
    }
  }
}

class AIService {
  constructor({ provider, apiKey, model, temperature, maxTokens }) {
    this.provider = provider;
    switch (provider) {
      case Providers.ANTHROPIC:
        this.service = new AnthropicService({
          apiKey,
          model,
          temperature,
          maxTokens,
        });
        break;
      case Providers.OPEN_AI:
        this.service = new OpenAIService({
          apiKey,
          model,
          temperature,
          maxTokens,
        });
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async sendMessage(params) {
    return this.service.sendMessage(params);
  }

  static async validateKey(provider, key) {
    switch (provider) {
      case Providers.ANTHROPIC:
        return AnthropicService.validateKey(key);
      case Providers.OPEN_AI:
        return OpenAIService.validateKey(key);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
