import express from "express";
import { engine } from "express-handlebars";
import path from "path";

const app = express();

app.engine("hbs", engine({
  extname: ".hbs",
  defaultLayout: "main",
  layoutsDir: path.join(process.cwd(), "views/layouts"),
  partialsDir: path.join(process.cwd(), "views/partials")
}));

app.set("view engine", "hbs");
app.set("views", path.join(process.cwd(), "views"));

// Serve CSS/images
app.use(express.static("Website frontend"));

app.get("/", (req, res) => {
  res.render("home"); // <-- this loads home.hbs into main.hbs
});

app.listen(3000, () => console.log("http://localhost:3000 running"));