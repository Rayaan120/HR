import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reorderAndNumberContractArticles } from "../src/utils/fillContractPdf.js";

test("inserts a custom article and renumbers later PDF sections", async () => {
  const templateXml = await readFile(".docx-inspect/pszip/word/document.xml", "utf8");
  const builtInArticles = Array.from({ length: 18 }, (_, index) => ({
    id: `article-${index + 1}`,
    title: `${index + 1}. Built-in article ${index + 1}`,
    content: "",
    custom: false,
  }));
  const customArticle = {
    id: "custom-test",
    title: "4. Custom placement",
    content: "Custom PDF content",
    custom: true,
  };
  const contractArticles = [
    ...builtInArticles.slice(0, 3),
    customArticle,
    ...builtInArticles.slice(3).map((article, index) => ({
      ...article,
      title: `${index + 5}. Built-in article ${index + 4}`,
    })),
  ];

  const result = reorderAndNumberContractArticles(templateXml, {
    contractArticles,
    "customArticle_custom-test": "Custom PDF content",
  });

  const customPosition = result.indexOf("4. Custom placement");
  const originalFourthPosition = result.indexOf("5. Built-in article 4");
  assert.ok(customPosition > -1, "custom article heading should be present");
  assert.ok(result.includes("Custom PDF content"), "custom article content should be present");
  assert.ok(originalFourthPosition > customPosition, "the original fourth article should follow the inserted article");
  assert.ok(result.includes("19. Built-in article 18"), "the final article should be renumbered");
});
