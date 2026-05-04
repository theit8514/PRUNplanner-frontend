import { createI18n } from "vue-i18n";

import en_US from "@/locales/en-US.json";

export type MessageSchema = typeof en_US;
export type SupportedLocale = "en-US" | "de-DE" | "zh-CN";

export const i18n = createI18n<{ message: MessageSchema }, SupportedLocale>({
	legacy: false,
	locale: "en-US",
	fallbackLocale: "en-US",
	messages: { "en-US": en_US } as unknown as Record<
		SupportedLocale,
		MessageSchema
	>,
	globalInjection: false,
});
