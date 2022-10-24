const express = require("express");
const app = express();
app.use(express.json());
const {
  models: { User },
} = require("./db");
const path = require("path");

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/user/:id/notes", requireToken, async (req, res, next) => {
  try {
    res.send(await User.getNotes(req.user.id, req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
