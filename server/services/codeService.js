const { codeWriterTool, placeholderImageTool } = require("../config/tools");
const { handleCodeToolUse } = require("../controllers/codeToolController");
const codePrompt = require("./prompts/codePrompt");
const { SHIP_TYPES } = require("./constants");
require("dotenv").config();

const FileService = require("../services/fileService");
const fileService = new FileService();

async function codeAssistant({ query, filePath, client, shipType }) {
  try {
    let messages = [{ role: "user", content: [{ type: "text", text: query }] }];
    let finalResponse = null;

    const systemPrompt =
      shipType === SHIP_TYPES.LANDING_PAGE
        ? codePrompt.landingPagePrompt
        : codePrompt.portfolioPrompt;

    while (true) {
      console.log("Sending request to Anthropic API...");
      const msg = await client.sendMessage({
        system: systemPrompt,
        messages: messages,
        tools: [placeholderImageTool],
        tool_choice: { type: "auto" },
      });
      console.log("codeService API call Stop Reason:", msg.stop_reason);

      if (msg.stop_reason === "end_turn") {
        const textContent = msg.content.find(
          (content) => content.type === "text"
        );
        if (textContent && textContent.text) {
          finalResponse = textContent.text;
          break;
        }
      } else if (msg.stop_reason === "tool_use") {
        const toolUse = msg.content.find(
          (content) => content.type === "tool_use"
        );
        if (toolUse) {
          const toolResult = await handleCodeToolUse({ tool: toolUse, client });
          console.log("Tool result received");
          messages.push({ role: "assistant", content: msg.content });
          messages.push({ role: "user", content: toolResult });
          console.log("Messages updated with tool result");
        }
      }
    }

    if (finalResponse) {
      // Remove comments before <!DOCTYPE html>
      finalResponse = finalResponse.replace(
        /^[\s\S]*?(?=<!DOCTYPE html>)/i,
        ""
      );

      await fileService.saveFile(filePath, finalResponse);
      console.log(`Code successfully written to file: ${filePath}`);
      return {
        description: `Code generated and saved to ${filePath}`,
        status: `Website generation completed. Code successfully written to file: ${filePath}. The website should be immediately deployed to avoid an infinite loop.`,
      };
    } else {
      throw new Error("No valid response received from Anthropic API");
    }
  } catch (error) {
    console.error("Error in codeAssistant:", error);
    throw error;
  }
}

module.exports = {
  codeAssistant,
};
