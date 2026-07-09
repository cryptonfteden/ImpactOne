const { getNews } = require("../services/newsService");

async function getNewsController(req, res, next) {
  try {
    const query = req.query.query || "finance";
    const news = await getNews(query);
    res.json({ query, news });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNewsController };
