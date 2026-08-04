const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyArticle, classifyArticles } = require("./eventClassifier");

test("classifies COMPANY when the real symbol is mentioned", () => {
  const article = { title: "AAPL surges after earnings", description: "" };
  assert.equal(classifyArticle(article, "AAPL", null), "COMPANY");
});

test("classifies COMPANY when the real company name is mentioned", () => {
  const article = { title: "Apple Inc unveils new product", description: "" };
  assert.equal(classifyArticle(article, "AAPL", "Apple Inc"), "COMPANY");
});

test("classifies MACRO when a real macro keyword is present and no company match", () => {
  const article = { title: "Federal Reserve signals rate cuts", description: "inflation data due" };
  assert.equal(classifyArticle(article, "AAPL", "Apple Inc"), "MACRO");
});

test("defaults to SECTOR when neither company nor macro signals match", () => {
  const article = { title: "Smartphone market grows", description: "Industry-wide trend" };
  assert.equal(classifyArticle(article, "AAPL", "Apple Inc"), "SECTOR");
});

test("classifyArticles: attaches a real eventType to every real article", () => {
  const articles = [{ title: "AAPL rises", description: "" }, { title: "Fed hikes rates", description: "" }];
  const result = classifyArticles(articles, "AAPL", "Apple Inc");
  assert.equal(result[0].eventType, "COMPANY");
  assert.equal(result[1].eventType, "MACRO");
});
