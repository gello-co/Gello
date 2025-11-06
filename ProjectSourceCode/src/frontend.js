import { App } from "./App";

const elem = document.getElementById("root");
if (!elem) {
	throw new Error('Root element with id "root" was not found');
}

elem.innerHTML = "";
const app = App();
elem.appendChild(app);

if (import.meta.hot) {
	import.meta.hot.accept("./App.js", ({ App: NewApp }) => {
		elem.innerHTML = "";
		elem.appendChild(NewApp());
	});
}