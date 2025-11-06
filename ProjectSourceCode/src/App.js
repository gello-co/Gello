import { APITester } from "./APITester";
import "./index.css";

export function App() {
	const app = document.createElement("div");
	app.className = "app";

    const logoContainer = document.createElement("div");
	logoContainer.className = "logo-container";

    app.appendChild(logoContainer);

    // Heading
	const heading = document.createElement("h1");
	heading.textContent = "Bun + JavaScript";
	app.appendChild(heading);

	// Paragraph
	const p = document.createElement("p");
	p.innerHTML = `Edit <code>src/App.js</code> and save to test HMR`;
	app.appendChild(p);

	// APITester
	const apiTesterElem = APITester();
	app.appendChild(apiTesterElem);

	return app;
}

export default App;