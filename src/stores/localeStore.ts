import { ref } from "vue";
import { defineStore } from "pinia";
import { i18n, type SupportedLocale } from "@/lib/i18n";
import { Composer } from "vue-i18n";

const locales = import.meta.glob("../locales/*.json");

export const useLocaleStore = defineStore("locale", () => {
	const currentLocale = ref<SupportedLocale>(
		(localStorage.getItem("user-locale") as SupportedLocale) || "en-US"
	);

	async function setLocale(newLocale: SupportedLocale) {
		const composer = i18n.global as unknown as Composer;
		const path = `../locales/${newLocale}.json`;

		if (!(composer.availableLocales as string[]).includes(newLocale)) {
			if (!(path in locales)) return;

			const loader = locales[path] as () => Promise<{ default: any }>;
			const messages = await loader();
			composer.setLocaleMessage(newLocale, messages.default);
		}

		composer.locale.value = newLocale;
		currentLocale.value = newLocale;

		localStorage.setItem("user-locale", newLocale);
		document.querySelector("html")?.setAttribute("lang", newLocale);
	}

	async function initLocale() {
		if (currentLocale.value !== "en_US") {
			await setLocale(currentLocale.value);
		}
	}

	return { currentLocale, setLocale, initLocale };
});
