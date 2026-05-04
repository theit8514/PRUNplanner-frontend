import { createI18n } from "vue-i18n";

import en_US from "@/locales/en_US.json";
import { PSelectOption } from "@/ui/ui.types";

export type MessageSchema = typeof en_US;
export type SupportedLocale =
	| "en_US"
	| "de_DE"
	| "es_ES"
	| "fr_FR"
	| "it_IT"
	| "zh-CN";

export const SupportedLanguages: PSelectOption[] = [
	{
		label: "EN",
		value: "en_US",
	},
	{
		label: "DE",
		value: "de_DE",
	},
	{
		label: "ES",
		value: "es_ES",
	},
];

export const locales = import.meta.glob("@/locales/*.json");

export const i18n = createI18n<{ message: MessageSchema }, SupportedLocale>({
	legacy: false,
	locale: "en_US",
	fallbackLocale: "en_US",
	messages: { en_US: en_US } as unknown as Record<
		SupportedLocale,
		MessageSchema
	>,
	globalInjection: true,
});
